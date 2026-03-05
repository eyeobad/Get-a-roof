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
import { MatchStatus, RouteAccessStatus } from "../common/enums";
import { User, UserDocument } from "../users/schemas/user.schema";

type RouteRequestPayload = {
  id: string;
  status: "pending" | "approved" | "denied";
  kind: "route-access";
  tenantLocation?: { lat: number; lng: number };
  ttlMinutes?: number;
};

const ROUTE_REQUEST_PREFIX = "__route_request__:";

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) { }

  private parseRouteRequestPayload(content: string): RouteRequestPayload | null {
    if (!content?.startsWith(ROUTE_REQUEST_PREFIX)) {
      return null;
    }
    try {
      const parsed = JSON.parse(
        content.slice(ROUTE_REQUEST_PREFIX.length)
      ) as RouteRequestPayload;
      if (
        parsed &&
        parsed.kind === "route-access" &&
        typeof parsed.id === "string" &&
        (parsed.status === "pending" ||
          parsed.status === "approved" ||
          parsed.status === "denied")
      ) {
        if (parsed.tenantLocation) {
          const { lat, lng } = parsed.tenantLocation;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }
        }
        if (parsed.ttlMinutes !== undefined && ![5, 30, 1440].includes(parsed.ttlMinutes)) {
          return null;
        }
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  }

  private buildConversationResponse(
    match: MatchDocument,
    property: PropertyDocument,
    lastMessage?: MessageDocument | null,
    participants?: { tenant?: UserDocument | null; landlord?: UserDocument | null }
  ) {
    const propertyObject = property.toObject ? property.toObject() : property;
    const landlordId = (propertyObject as any)?.landlordId;
    const tenant = this.toUserSummary(participants?.tenant);
    const landlord = this.toUserSummary(participants?.landlord);
    return {
      matchId: match.id,
      tenantId: match.tenantId?.toString?.() ?? match.tenantId,
      property: {
        ...propertyObject,
        landlordId: landlordId?.toString?.() ?? landlordId,
      },
      tenant: tenant ?? undefined,
      landlord: landlord ?? undefined,
      lastMessage: lastMessage
        ? { content: lastMessage.content, timestamp: lastMessage.timestamp }
        : null,
      unreadCount: 0,
    };
  }

  private toUserSummary(user?: UserDocument | null) {
    if (!user) return null;
    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
    };
  }

  async createMessage(dto: CreateChatDto) {
    if (!dto.senderId) {
      throw new BadRequestException("senderId is required");
    }
    const { match, property } = await this.assertChatParticipant(
      dto.matchId,
      dto.senderId,
      dto.receiverId
    );
    const routePayload = this.parseRouteRequestPayload(dto.content);
    const tenantId = match.tenantId.toString();
    const landlordId = property.landlordId.toString();
    const matchPatch: Record<string, unknown> = {};

    if (routePayload) {
      if (routePayload.status === "pending") {
        if (dto.senderId !== tenantId) {
          throw new ForbiddenException("Only tenant can request route access");
        }
        if (!routePayload.tenantLocation) {
          throw new BadRequestException("Tenant location is required for route request");
        }
        matchPatch.routeAccessStatus = RouteAccessStatus.Pending;
        matchPatch.routeAccessRequestedAt = new Date();
        matchPatch.routeAccessRespondedAt = null;
        matchPatch.routeAccessExpiresAt = null;
        matchPatch.routeOriginLat = routePayload.tenantLocation.lat;
        matchPatch.routeOriginLng = routePayload.tenantLocation.lng;
      }

      if (routePayload.status === "approved" || routePayload.status === "denied") {
        const isOwner = dto.senderId === landlordId;
        const isAgentMember = !isOwner
          ? await this.isOrgMember(dto.senderId, landlordId)
          : false;
        if (!isOwner && !isAgentMember) {
          throw new ForbiddenException("Only landlord can approve or deny route access");
        }
        matchPatch.routeAccessStatus =
          routePayload.status === "approved"
            ? RouteAccessStatus.Approved
            : RouteAccessStatus.Denied;
        matchPatch.routeAccessRespondedAt = new Date();
        if (routePayload.status === "approved") {
          const ttl = routePayload.ttlMinutes ?? 30;
          if (![5, 30, 1440].includes(ttl)) {
            throw new BadRequestException("Invalid route access duration");
          }
          matchPatch.routeAccessExpiresAt = new Date(Date.now() + ttl * 60 * 1000);
        } else {
          matchPatch.routeAccessExpiresAt = null;
        }
      }
    }

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
      status:
        match.status === MatchStatus.LandlordQualified
          ? MatchStatus.ChatInitiated
          : match.status,
      updatedAt: new Date(),
      ...matchPatch,
    });
    return saved;
  }

  async getConversations(
    userId: string,
    options?: { limit?: number; offset?: number }
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid userId");
    }
    const userObjectId = new Types.ObjectId(userId);
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    // If user is an agent, also include conversations for the org owner
    // If user is an org owner, also include conversations for their agents
    const orgMemberIds = await this.getOrgRelatedIds(userId);

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: "properties",
          let: { propId: "$propertyId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, { $toString: "$$propId" }],
                },
              },
            },
          ],
          as: "property",
        },
      },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          status: { $ne: MatchStatus.Dismissed },
          $or: [
            { tenantId: userObjectId },
            { tenantId: userId },
            { "property.landlordId": userObjectId },
            { "property.landlordId": userId },
            ...(orgMemberIds.length
              ? [{ "property.landlordId": { $in: orgMemberIds } }]
              : []),
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          let: { tenantId: "$tenantId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, { $toString: "$$tenantId" }],
                },
              },
            },
            { $project: { firstName: 1, lastName: 1, photoUrl: 1 } },
          ],
          as: "tenant",
        },
      },
      { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          let: { landlordId: "$property.landlordId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, { $toString: "$$landlordId" }],
                },
              },
            },
            { $project: { firstName: 1, lastName: 1, photoUrl: 1 } },
          ],
          as: "landlord",
        },
      },
      { $unwind: { path: "$landlord", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "messages",
          let: {
            matchId: "$_id",
            validReceiverIds: [userId, ...orgMemberIds.map(id => id.toString())]
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$matchId" }, { $toString: "$$matchId" }],
                },
              },
            },
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
                          {
                            $in: [
                              { $toString: "$receiverId" },
                              "$$validReceiverIds",
                            ],
                          },
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
      { $unset: "messageMeta" },
      {
        $project: {
          matchId: "$_id",
          property: 1,
          tenantId: 1,
          tenant: {
            _id: "$tenant._id",
            firstName: "$tenant.firstName",
            lastName: "$tenant.lastName",
            photoUrl: "$tenant.photoUrl",
          },
          landlord: {
            _id: "$landlord._id",
            firstName: "$landlord.firstName",
            lastName: "$landlord.lastName",
            photoUrl: "$landlord.photoUrl",
          },
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
    const { match, property } = await this.assertMatchMembership(matchId, userId);

    const tenantId = match.tenantId.toString();
    const landlordId = property.landlordId.toString();
    const targetReceiverId = tenantId === userId ? tenantId : landlordId;

    const result = await this.messageModel.updateMany(
      { matchId, receiverId: targetReceiverId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return { updatedCount: result.modifiedCount };
  }

  async startThread(tenantId: string, propertyId: string, message?: string) {
    const property = await this.propertyModel.findById(propertyId).exec();
    if (!property) {
      throw new NotFoundException("Property not found");
    }
    const landlordId = property.landlordId?.toString?.();
    if (!landlordId) {
      await this.purgeOrphanProperty(property._id);
      throw new NotFoundException("Property not found");
    }
    const [tenantUser, landlordUser] = await Promise.all([
      this.userModel.findById(tenantId).exec(),
      this.userModel.findById(landlordId).exec(),
    ]);
    if (!landlordUser) {
      await this.purgeOrphanProperty(property._id);
      throw new NotFoundException("Property not found");
    }
    if (landlordId === tenantId) {
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

    return this.buildConversationResponse(match, property, createdMessage, {
      tenant: tenantUser,
      landlord: landlordUser,
    });
  }

  async startLandlordThread(matchId: string, landlordId: string, message?: string) {
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
    const resolvedLandlordId = property.landlordId?.toString?.();
    if (!resolvedLandlordId) {
      await this.purgeOrphanProperty(property._id);
      throw new NotFoundException("Property not found");
    }
    const [tenantUser, landlordUser] = await Promise.all([
      this.userModel.findById(match.tenantId).exec(),
      this.userModel.findById(resolvedLandlordId).exec(),
    ]);
    if (!landlordUser) {
      await this.purgeOrphanProperty(property._id);
      throw new NotFoundException("Property not found");
    }
    if (resolvedLandlordId !== landlordId) {
      // Check if user is an agent of the org that owns this property
      const agentAllowed = await this.isOrgMember(landlordId, resolvedLandlordId);
      if (!agentAllowed) {
        throw new ForbiddenException("Access denied");
      }
    }

    if (match.status !== MatchStatus.ChatInitiated) {
      match.status = MatchStatus.ChatInitiated;
      await match.save();
    }

    let createdMessage;
    if (message) {
      createdMessage = await this.createMessage({
        matchId: match.id,
        senderId: landlordId,
        receiverId: match.tenantId.toString(),
        content: message,
      });
    }

    return this.buildConversationResponse(match, property, createdMessage, {
      tenant: tenantUser,
      landlord: landlordUser,
    });
  }

  private async assertMatchMembership(matchId: string, userId: string) {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new BadRequestException("Invalid matchId");
    }
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
    const tenantId = match.tenantId?.toString?.();
    const landlordId = property.landlordId?.toString?.();
    if (!tenantId || !landlordId) {
      await this.purgeOrphanProperty(property._id);
      throw new NotFoundException("Property not found");
    }
    const isTenant = tenantId === userId;
    const isLandlord = landlordId === userId;
    const isOrgAgent = !isTenant && !isLandlord
      ? await this.isOrgMember(userId, landlordId)
      : false;
    if (!isTenant && !isLandlord && !isOrgAgent) {
      throw new ForbiddenException("Access denied");
    }
    return { match, property };
  }

  /** Check if userId is an agent belonging to the org identified by orgOwnerId */
  private async isOrgMember(userId: string, orgOwnerId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).select("agentOrgId").lean();
    if (!user?.agentOrgId) return false;
    return user.agentOrgId.toString() === orgOwnerId;
  }

  /** Get related org member IDs for conversation visibility */
  private async getOrgRelatedIds(userId: string): Promise<Types.ObjectId[]> {
    const user = await this.userModel
      .findById(userId)
      .select("role agentOrgId orgProfile")
      .lean();
    if (!user) return [];

    // If the user is an agent, return the org owner so they see org conversations
    if (user.agentOrgId) {
      return [new Types.ObjectId(user.agentOrgId.toString())];
    }

    // If the user is an org owner, return all agent IDs so they see agent conversations
    const agentIds = (user as any)?.orgProfile?.agentIds;
    if (Array.isArray(agentIds) && agentIds.length > 0) {
      return agentIds.map((id: any) => new Types.ObjectId(id.toString()));
    }

    return [];
  }

  async getParticipantIds(matchId: string) {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new BadRequestException("Invalid matchId");
    }
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
    const tenantId = match.tenantId?.toString?.();
    const landlordId = property.landlordId?.toString?.();
    if (!tenantId || !landlordId) {
      await this.purgeOrphanProperty(property._id);
      throw new NotFoundException("Property not found");
    }
    return { tenantId, landlordId };
  }

  private async purgeOrphanProperty(propertyId: Types.ObjectId) {
    const matchIds = await this.matchModel
      .find({ propertyId })
      .distinct("_id")
      .exec();
    if (matchIds.length) {
      await this.messageModel.deleteMany({
        matchId: { $in: matchIds.map((id) => new Types.ObjectId(id)) },
      });
      await this.matchModel.deleteMany({ _id: { $in: matchIds } });
    }
    await this.propertyModel.deleteOne({ _id: propertyId });
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
    return { match, property };
  }
}
