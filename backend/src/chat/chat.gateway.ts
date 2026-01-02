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

@WebSocketGateway({ cors: true })
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
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage("join")
  handleJoin(
    @MessageBody() body: { matchId?: string },
    @ConnectedSocket() client: Socket
  ) {
    if (!body?.matchId) {
      throw new WsException("matchId is required");
    }
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

    const message = await this.chatService.createMessage({
      ...body,
      senderId,
    });
    this.server.to(body.matchId).emit("message", message);
    client.emit("message:sent", message);
    return message;
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
}
