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
import { WorkspaceService } from "../common/services/workspace.service";
import { RedisCacheService } from "../common/services/redis-cache.service";
import {
  computeMatchScore,
  type PropertyMatchInput,
  type TenantPreferences,
} from "../common/utils/match.utils";

type RouteRequestPayload = {
  id: string;
  status: "pending" | "approved" | "denied";
  kind: "route-access";
  tenantLocation?: { lat: number; lng: number };
  ttlMinutes?: number;
};

const ROUTE_REQUEST_PREFIX = "__route_request__:";
const CHAT_VISIBLE_STATUSES: MatchStatus[] = [MatchStatus.ChatInitiated, MatchStatus.Active];

function isMongoDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === 11000;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly workspaceService: WorkspaceService,
    private readonly redisCache: RedisCacheService
  ) { }

  private async clearTenantMatchCaches(tenantId: string) {
    await Promise.all([
      this.redisCache.deleteByPrefix(`tenant-matches:active:${tenantId}:`),
      this.redisCache.deleteByPrefix(`tenant-matches:recycled:${tenantId}:`),
    ]);
  }

  private async applyMatchScore(
    match: MatchDocument,
    property: PropertyDocument,
    tenantId: string
  ) {
    const tenant = await this.userModel.findById(tenantId).lean().exec();
    if (!tenant) return false;

    const tenantPrefs = ((tenant as unknown as { preferences?: { tenant?: TenantPreferences } })
      .preferences?.tenant ?? {}) as TenantPreferences;
    const tenantAddress = (tenant as unknown as { address?: { lat?: number; lng?: number } })
      .address;
    const propertyAddress = (property as unknown as { address?: { lat?: number; lng?: number } })
      .address;

    const matchInput: PropertyMatchInput = {
      propertyType: property.propertyType,
      monthlyPrice: property.monthlyPrice,
      petFriendly: property.petFriendly,
      landlordRequirements: property.landlordRequirements,
      amenities: property.amenities,
      lat: propertyAddress?.lat,
      lng: propertyAddress?.lng,
    };

    const nextScore = computeMatchScore(
      {
        ...tenantPrefs,
        lat: tenantAddress?.lat,
        lng: tenantAddress?.lng,
      },
      matchInput
    );

    const changed =
      match.matchScore !== nextScore.matchScore ||
      match.preferencesMatchPercentage !== nextScore.preferencesMatchPercentage ||
      match.apartmentPreferenceMatchPercentage !==
        nextScore.apartmentPreferenceMatchPercentage ||
      match.locationScore !== nextScore.locationScore ||
      match.amenityScore !== nextScore.amenityScore ||
      match.affordabilityScore !== nextScore.affordabilityScore;

    if (!changed) return false;

    match.matchScore = nextScore.matchScore;
    match.preferencesMatchPercentage = nextScore.preferencesMatchPercentage;
    match.apartmentPreferenceMatchPercentage =
      nextScore.apartmentPreferenceMatchPercentage;
    match.locationScore = nextScore.locationScore;
    match.amenityScore = nextScore.amenityScore;
    match.affordabilityScore = nextScore.affordabilityScore;
    return true;
  }

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
    participants?: { tenant?: UserDocument | null; landlord?: UserDocument | null },
    currentUserId?: string
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
      lastMessage:
        lastMessage || match.lastMessage
          ? {
              content: lastMessage?.content ?? match.lastMessage?.content,
              timestamp: lastMessage?.timestamp ?? match.lastMessage?.timestamp,
            }
          : null,
      unreadCount:
        currentUserId && match.tenantId?.toString?.() === currentUserId
          ? match.tenantUnreadCount ?? 0
          : match.landlordUnreadCount ?? 0,
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
        const canManage = await this.workspaceService.canActorManageProperty(
          dto.senderId,
          property
        );
        if (!canManage) {
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
    const senderIsTenant = dto.senderId === tenantId;
    const nextStatus =
      match.status === MatchStatus.Closed
        ? MatchStatus.Closed
        : MatchStatus.Active;
    await this.matchModel.findByIdAndUpdate(dto.matchId, {
      $set: {
        status: nextStatus,
        updatedAt: new Date(),
        landlordId: property.landlordId,
        ...(senderIsTenant ? {} : { landlordReplied: true }),
        lastMessage: {
          content: saved.content,
          senderId: saved.senderId,
          timestamp: saved.timestamp,
        },
        ...(senderIsTenant
          ? { tenantUnreadCount: 0 }
          : { landlordUnreadCount: 0 }),
        ...matchPatch,
      },
      $inc: senderIsTenant
        ? { landlordUnreadCount: 1 }
        : { tenantUnreadCount: 1 },
    });
    await this.clearTenantMatchCaches(tenantId);
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
    const context = await this.workspaceService.getWorkspaceActorContext(userId);
    const landlordVisibilityIds = (
      context.scope === "owner" ? context.orgMemberIds : [userId]
    )
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

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
          status: { $in: CHAT_VISIBLE_STATUSES },
          $or: [
            { tenantId: { $in: [userObjectId, userId] } },
            { "property.landlordId": { $in: landlordVisibilityIds } },
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
        $addFields: {
          lastMessage: "$lastMessage",
          unreadCount: {
            $cond: [
              { $eq: [{ $toString: "$tenantId" }, userId] },
              { $ifNull: ["$tenantUnreadCount", 0] },
              { $ifNull: ["$landlordUnreadCount", 0] },
            ],
          },
        },
      },
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
      { $sort: { "lastMessage.timestamp": -1, updatedAt: -1, _id: -1 } },
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
    const { match } = await this.assertMatchMembership(matchId, userId);

    const result = await this.messageModel.updateMany(
      { matchId, receiverId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    const isTenant = match.tenantId.toString() === userId;
    await this.matchModel.findByIdAndUpdate(matchId, {
      $set: isTenant ? { tenantUnreadCount: 0 } : { landlordUnreadCount: 0 },
    });
    await this.clearTenantMatchCaches(match.tenantId.toString());

    return { updatedCount: result.modifiedCount };
  }

  async startThread(tenantId: string, propertyId: string, message?: string) {
    if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(propertyId)) {
      throw new BadRequestException("Invalid tenantId or propertyId");
    }
    const tenantOid = new Types.ObjectId(tenantId);
    const propertyOid = new Types.ObjectId(propertyId);
    const property = await this.propertyModel.findById(propertyId).exec();
    if (!property) {
      throw new NotFoundException("Property not found");
    }
    const landlordId = property.landlordId?.toString?.();
    if (!landlordId) {
      throw new NotFoundException("Property not found");
    }
    const [tenantUser, landlordUser] = await Promise.all([
      this.userModel.findById(tenantId).exec(),
      this.userModel.findById(landlordId).exec(),
    ]);
    if (!landlordUser) {
      throw new NotFoundException("Property not found");
    }
    if (landlordId === tenantId) {
      throw new ForbiddenException("Cannot message your own property");
    }

    let match: MatchDocument | null = null;
    try {
      match = await this.matchModel
        .findOneAndUpdate(
          {
            $or: [
              { tenantId: tenantOid, propertyId: propertyOid },
              { tenantId, propertyId },
            ],
          },
          {
            $setOnInsert: {
              tenantId: tenantOid,
              propertyId: propertyOid,
              landlordId: property.landlordId,
              status: MatchStatus.TenantLiked,
              tenantLiked: true,
              timestamp: new Date(),
            },
          },
          {
            upsert: true,
            new: true,
          }
        )
        .exec();
    } catch (error) {
      if (!isMongoDuplicateKeyError(error)) {
        throw error;
      }
      match = await this.matchModel
        .findOne({
          $or: [
            { tenantId: tenantOid, propertyId: propertyOid },
            { tenantId, propertyId },
          ],
        })
        .exec();
    }

    if (!match) {
      throw new NotFoundException("Match not found");
    }

    // Normalize legacy string IDs to ObjectId so all APIs see the same match.
    let shouldNormalize = false;
    const currentTenantId = match.tenantId?.toString?.() ?? String(match.tenantId);
    const currentPropertyId = match.propertyId?.toString?.() ?? String(match.propertyId);
    if (currentTenantId === tenantId && !(match.tenantId instanceof Types.ObjectId)) {
      (match as unknown as { tenantId: Types.ObjectId }).tenantId = tenantOid;
      shouldNormalize = true;
    }
    if (currentPropertyId === propertyId && !(match.propertyId instanceof Types.ObjectId)) {
      (match as unknown as { propertyId: Types.ObjectId }).propertyId = propertyOid;
      shouldNormalize = true;
    }
    if (shouldNormalize) {
      await match.save();
    }
    if (!match.landlordId) {
      match.landlordId = property.landlordId;
    }

    if (
      match.status !== MatchStatus.ChatInitiated &&
      match.status !== MatchStatus.Active
    ) {
      match.status = MatchStatus.ChatInitiated;
    }
    if (match.tenantLiked !== true) {
      match.tenantLiked = true;
    }
    await this.applyMatchScore(match, property, tenantId);
    await match.save();
    await this.clearTenantMatchCaches(tenantId);

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
    }, tenantId);
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
      throw new NotFoundException("Property not found");
    }
    const [tenantUser, landlordUser] = await Promise.all([
      this.userModel.findById(match.tenantId).exec(),
      this.userModel.findById(resolvedLandlordId).exec(),
    ]);
    if (!landlordUser) {
      throw new NotFoundException("Property not found");
    }
    const canManage = await this.workspaceService.canActorManageProperty(
      landlordId,
      property
    );
    if (!canManage) {
      throw new ForbiddenException("Access denied");
    }

    let shouldSave = false;
    if (!match.landlordId) {
      match.landlordId = property.landlordId;
      shouldSave = true;
    }
    if (
      match.status !== MatchStatus.ChatInitiated &&
      match.status !== MatchStatus.Active
    ) {
      match.status = MatchStatus.ChatInitiated;
      shouldSave = true;
    }
    if (await this.applyMatchScore(match, property, match.tenantId.toString())) {
      shouldSave = true;
    }
    if (shouldSave) {
      await match.save();
      await this.clearTenantMatchCaches(match.tenantId.toString());
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
    }, landlordId);
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
      throw new NotFoundException("Property not found");
    }
    const isTenant = tenantId === userId;
    const isAuthorizedLandlord = isTenant
      ? false
      : await this.workspaceService.canActorManageProperty(userId, property);
    if (!isTenant && !isAuthorizedLandlord) {
      throw new ForbiddenException("Access denied");
    }
    return { match, property };
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
      throw new NotFoundException("Property not found");
    }
    return { tenantId, landlordId, property };
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
    if (!CHAT_VISIBLE_STATUSES.includes(match.status)) {
      throw new ForbiddenException("Chat is not active for this match");
    }
    const tenantId = match.tenantId.toString();
    const landlordId = property.landlordId.toString();
    const allowed = new Set([tenantId, landlordId]);
    if (!allowed.has(receiverId) || receiverId === senderId) {
      throw new ForbiddenException("Invalid receiver");
    }
    return { match, property };
  }
}
