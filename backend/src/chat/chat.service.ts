import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, PipelineStage, Types } from "mongoose";
import { Message, MessageDocument } from "./schemas/message.schema";
import { CreateChatDto } from "./dto/create-chat.dto";
import { Match, MatchDocument } from "../matches/schemas/match.schema";
import { Property, PropertyDocument } from "../properties/schemas/property.schema";
import { MatchStatus } from "../common/enums";

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>
  ) {}

  async createMessage(dto: CreateChatDto) {
    if (!dto.senderId) {
      throw new BadRequestException("senderId is required");
    }
    await this.assertChatParticipant(dto.matchId, dto.senderId, dto.receiverId);
    const created = new this.messageModel({
      matchId: dto.matchId,
      senderId: dto.senderId,
      receiverId: dto.receiverId,
      content: dto.content,
      timestamp: new Date(),
      isRead: false,
    });

    const saved = await created.save();
    await this.matchModel.findByIdAndUpdate(dto.matchId, {
      status: MatchStatus.ChatInitiated,
    });
    return saved;
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
        $lookup: {
          from: "properties",
          localField: "propertyId",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          status: { $ne: MatchStatus.Dismissed },
          $or: [
            { tenantId: userObjectId },
            { "property.landlordId": userObjectId },
          ],
        },
      },
      {
        $lookup: {
          from: "messages",
          let: { matchId: "$_id", userId: userObjectId },
          pipeline: [
            { $match: { $expr: { $eq: ["$matchId", "$$matchId"] } } },
            { $sort: { timestamp: -1 } },
            {
              $group: {
                _id: null,
                lastMessage: { $first: "$$ROOT" },
                unreadCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$receiverId", "$$userId"] },
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
            { $project: { _id: 0, lastMessage: 1, unreadCount: 1 } },
          ],
          as: "messageMeta",
        },
      },
      {
        $addFields: {
          lastMessage: {
            $ifNull: [{ $arrayElemAt: ["$messageMeta.lastMessage", 0] }, null],
          },
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ["$messageMeta.unreadCount", 0] }, 0],
          },
        },
      },
      {
        $project: {
          messageMeta: 0,
          matchId: "$_id",
          property: 1,
          tenantId: 1,
          lastMessage: 1,
          unreadCount: 1,
          updatedAt: 1,
        },
      },
      { $sort: { "lastMessage.timestamp": -1, updatedAt: -1 } },
    ];

    if (offset > 0) {
      pipeline.push({ $skip: offset });
    }
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }

    return this.matchModel.aggregate(pipeline).exec();
  }

  async getMessagesForMatch(
    matchId: string,
    userId: string,
    limit = 50,
    before?: Date
  ) {
    await this.assertMatchMembership(matchId, userId);
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
    await this.assertMatchMembership(matchId, userId);
    const result = await this.messageModel.updateMany(
      { matchId, receiverId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return { updatedCount: result.modifiedCount };
  }

  async startThread(tenantId: string, propertyId: string, message?: string) {
    const property = await this.propertyModel.findById(propertyId).exec();
    if (!property) {
      throw new NotFoundException("Property not found");
    }
    if (property.landlordId.toString() === tenantId) {
      throw new ForbiddenException("Cannot message your own property");
    }

    let match = await this.matchModel
      .findOne({ tenantId, propertyId })
      .exec();

    if (!match) {
      match = new this.matchModel({
        tenantId,
        propertyId,
        status: MatchStatus.TenantLiked,
        tenantLiked: true,
        timestamp: new Date(),
      });
      await match.save();
    }

    if (match.status !== MatchStatus.ChatInitiated) {
      match.status = MatchStatus.ChatInitiated;
    }
    if (match.tenantLiked !== true) {
      match.tenantLiked = true;
    }
    await match.save();

    let createdMessage;
    if (message) {
      createdMessage = await this.createMessage({
        matchId: match.id,
        senderId: tenantId,
        receiverId: property.landlordId.toString(),
        content: message,
      });
    }

    return { matchId: match.id, message: createdMessage };
  }

  private async assertMatchMembership(matchId: string, userId: string) {
    const match = await this.matchModel.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    const property = await this.propertyModel
      .findById(match.propertyId)
      .exec();
    if (!property) {
      throw new NotFoundException("Property not found");
    }
    const isTenant = match.tenantId.toString() === userId;
    const isLandlord = property.landlordId.toString() === userId;
    if (!isTenant && !isLandlord) {
      throw new ForbiddenException("Access denied");
    }
    return { match, property };
  }

  private async assertChatParticipant(
    matchId: string,
    senderId: string,
    receiverId: string
  ) {
    const { match, property } = await this.assertMatchMembership(
      matchId,
      senderId
    );
    const tenantId = match.tenantId.toString();
    const landlordId = property.landlordId.toString();
    const allowed = new Set([tenantId, landlordId]);
    if (!allowed.has(receiverId) || receiverId === senderId) {
      throw new ForbiddenException("Invalid receiver");
    }
  }
}
