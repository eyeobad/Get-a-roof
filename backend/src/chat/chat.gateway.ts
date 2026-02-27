import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsException } from "@nestjs/websockets";
import { ChatService } from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { JwtService } from "@nestjs/jwt";

const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const socketCorsOrigins = (() => {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return defaultCorsOrigins;
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length) return defaultCorsOrigins;
  if (origins.includes("*")) return true;
  return origins;
})();

@WebSocketGateway({
  cors: {
    origin: socketCorsOrigins,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      if (payload?.sub) {
        client.join(payload.sub);
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {}

  emitMessage(message: { matchId?: any; receiverId?: any }) {
    if (!message) return;
    const matchId =
      message.matchId?.toString?.() ??
      (typeof message.matchId === "string" ? message.matchId : "");
    const receiverId =
      message.receiverId?.toString?.() ??
      (typeof message.receiverId === "string" ? message.receiverId : "");
    if (matchId) {
      this.server.to(matchId).emit("message", message);
    }
    if (receiverId) {
      this.server.to(receiverId).emit("conversation:update", message);
    }
  }

  @SubscribeMessage("join")
  async handleJoin(
    @MessageBody() body: { matchId?: string },
    @ConnectedSocket() client: Socket
  ) {
    if (!body?.matchId) {
      throw new WsException("matchId is required");
    }
    await this.assertParticipant(body.matchId, client);
    client.join(body.matchId);
    return { joined: body.matchId };
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @MessageBody() body: CreateChatDto,
    @ConnectedSocket() client: Socket
  ) {
    if (!body?.matchId || !body?.receiverId || !body?.content) {
      throw new WsException("matchId, receiverId, and content are required");
    }

    const senderId = client.data.user?.sub;
    if (!senderId) {
      throw new WsException("Unauthorized");
    }
    await this.assertParticipant(body.matchId, client);

    const message = await this.chatService.createMessage({
      ...body,
      senderId,
    });
    this.emitMessage(message);
    client.emit("message:sent", message);
    return message;
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @MessageBody()
    body: { matchId?: string; isTyping?: boolean },
    @ConnectedSocket() client: Socket
  ) {
    const senderId = client.data.user?.sub;
    if (!senderId) {
      throw new WsException("Unauthorized");
    }
    if (!body?.matchId) {
      throw new WsException("matchId is required");
    }

    try {
      const participants = await this.chatService.getParticipantIds(body.matchId);
      const isParticipant =
        senderId === participants.tenantId || senderId === participants.landlordId;
      if (!isParticipant) {
        throw new WsException("Access denied");
      }
    } catch (error) {
      throw new WsException(
        error instanceof Error ? error.message : "Unable to validate participant"
      );
    }

    this.server.to(body.matchId).emit("typing", {
      matchId: body.matchId,
      senderId,
      isTyping: Boolean(body.isTyping),
    });

    return { ok: true };
  }

  @SubscribeMessage("markRead")
  async handleMarkRead(
    @MessageBody() body: { matchId?: string },
    @ConnectedSocket() client: Socket
  ) {
    const readerId = client.data.user?.sub;
    if (!readerId) {
      throw new WsException("Unauthorized");
    }
    if (!body?.matchId) {
      throw new WsException("matchId is required");
    }
    await this.assertParticipant(body.matchId, client);
    const result = await this.chatService.markMatchRead(body.matchId, readerId);
    this.server.to(body.matchId).emit("messages:read", {
      matchId: body.matchId,
      readerId,
      updatedCount: result.updatedCount,
    });
    return result;
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }
    const header = client.handshake.headers.authorization;
    if (!header) {
      return undefined;
    }
    const [type, token] = header.split(" ");
    if (type === "Bearer" && token) {
      return token;
    }
    return header;
  }

  private async assertParticipant(matchId: string, client: Socket) {
    const senderId = client.data.user?.sub;
    if (!senderId) {
      throw new WsException("Unauthorized");
    }
    try {
      const participants = await this.chatService.getParticipantIds(matchId);
      const isParticipant =
        senderId === participants.tenantId || senderId === participants.landlordId;
      if (!isParticipant) {
        throw new WsException("Access denied");
      }
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException(
        error instanceof Error ? error.message : "Unable to validate participant"
      );
    }
  }
}
