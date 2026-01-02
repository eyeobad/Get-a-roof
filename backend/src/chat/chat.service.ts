import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, PipelineStage, Types } from "mongoose";
import { Message, MessageDocument } from "./schemas/message.schema";
import { CreateChatDto } from "./dto/create-chat.dto";

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>
  ) {}

  async createMessage(dto: CreateChatDto) {
    if (!dto.senderId) {
      throw new BadRequestException("senderId is required");
    }
    const created = new this.messageModel({
      matchId: dto.matchId,
      senderId: dto.senderId,
      receiverId: dto.receiverId,
      content: dto.content,
      timestamp: new Date(),
      isRead: false,
    });

    return created.save();
  }

  async getConversations(
    userId: string,
    options?: { limit?: number; offset?: number }
  ) {
    const userObjectId = new Types.ObjectId(userId);
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
        },
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$matchId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userObjectId] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          matchId: "$_id",
          lastMessage: 1,
          unreadCount: 1,
        },
      },
      { $sort: { "lastMessage.timestamp": -1 } },
    ];

    if (offset > 0) {
      pipeline.push({ $skip: offset });
    }
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }

    return this.messageModel.aggregate(pipeline).exec();
  }

  async getMessagesForMatch(
    matchId: string,
    limit = 50,
    before?: Date
  ) {
    const filter: Record<string, unknown> = { matchId };
    if (before) {
      filter.timestamp = { $lt: before };
    }
    return this.messageModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async markMatchRead(matchId: string, userId: string) {
    const result = await this.messageModel.updateMany(
      { matchId, receiverId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return { updatedCount: result.modifiedCount };
  }
}
