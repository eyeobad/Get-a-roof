import { Body, Controller, Get, Post, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ChatService } from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ChatGateway } from "./chat.gateway";

@Controller("api/chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateChatDto, @Req() req: Request & { user?: any }) {
    dto.senderId = req.user?.sub;
    const message = await this.chatService.createMessage(dto);
    this.chatGateway.emitMessage(message);
    return message;
  }

  @Post("start")
  @UseGuards(JwtAuthGuard)
  startThread(
    @Body() body: { propertyId?: string; message?: string },
    @Req() req: Request & { user?: any }
  ) {
    if (!body?.propertyId) {
      return { matchId: null };
    }
    return this.chatService.startThread(req.user?.sub, body.propertyId, body.message);
  }

  @Post("start-landlord")
  @UseGuards(JwtAuthGuard)
  startLandlordThread(
    @Body() body: { matchId?: string; message?: string },
    @Req() req: Request & { user?: any }
  ) {
    if (!body?.matchId) {
      return { matchId: null };
    }
    return this.chatService.startLandlordThread(
      body.matchId,
      req.user?.sub,
      body.message
    );
  }

  @Get("conversations")
  @UseGuards(JwtAuthGuard)
  getConversations(
    @Req() req: Request & { user?: any },
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const parsedLimit =
      limit && !Number.isNaN(Number(limit)) ? Number(limit) : 20;
    const parsedOffset =
      offset && !Number.isNaN(Number(offset)) ? Number(offset) : 0;
    return this.chatService.getConversations(req.user?.sub, {
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get("messages")
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Req() req: Request & { user?: any },
    @Query("matchId") matchId: string,
    @Query("limit") limit?: string,
    @Query("before") before?: string
  ) {
    if (!matchId) {
      return [];
    }
    const parsedLimit =
      limit && !Number.isNaN(Number(limit)) ? Number(limit) : 50;
    const parsedBefore = before ? new Date(before) : undefined;
    const validBefore =
      parsedBefore && !Number.isNaN(parsedBefore.getTime())
        ? parsedBefore
        : undefined;
    return this.chatService.getMessagesForMatch(
      matchId,
      req.user?.sub,
      parsedLimit,
      validBefore
    );
  }

  @Patch("mark-read")
  @UseGuards(JwtAuthGuard)
  markRead(@Body() body: { matchId?: string }, @Req() req: Request & { user?: any }) {
    if (!body?.matchId) {
      return { updatedCount: 0 };
    }
    return this.chatService.markMatchRead(body.matchId, req.user?.sub);
  }
}
