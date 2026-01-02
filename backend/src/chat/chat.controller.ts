import { Body, Controller, Get, Post, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ChatService } from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Controller("api/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateChatDto, @Req() req: Request & { user?: any }) {
    dto.senderId = req.user?.sub;
    return this.chatService.createMessage(dto);
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
