import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, PipelineStage, Types } from "mongoose";
import { Match, MatchDocument } from "./schemas/match.schema";
import { CreateMatchDto } from "./dto/create-match.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import { DismissReason, MatchStatus } from "../common/enums";
import { UsersService } from "../users/users.service";
import { PropertiesService } from "../properties/properties.service";
import { computeMatchScore, PropertyMatchInput } from "../common/utils/match.utils";
import { Message, MessageDocument } from "../chat/schemas/message.schema";
import { WorkspaceService } from "../common/services/workspace.service";
import { RedisCacheService } from "../common/services/redis-cache.service";
import { stableStringify } from "../properties/utils/query-cache";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_LIMIT = 20;
const RECYCLE_COOLDOWN_DAYS = 14;
const TENANT_MATCH_CACHE_TTL_SECONDS = 30;

/** Valid match-status transitions: from → allowed destinations */
const VALID_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  [MatchStatus.TenantLiked]: [
    MatchStatus.LandlordQualified,
    MatchStatus.ChatInitiated,
    MatchStatus.Active,
    MatchStatus.Archived,
    MatchStatus.Closed,
    MatchStatus.Dismissed,
  ],
  [MatchStatus.LandlordQualified]: [
    MatchStatus.ChatInitiated,
    MatchStatus.Active,
    MatchStatus.Archived,
    MatchStatus.Closed,
    MatchStatus.Dismissed,
  ],
  [MatchStatus.ChatInitiated]: [
    MatchStatus.Active,
    MatchStatus.Archived,
    MatchStatus.Closed,
    MatchStatus.Dismissed,
  ],
  [MatchStatus.Active]: [MatchStatus.Archived, MatchStatus.Closed, MatchStatus.Dismissed],
  [MatchStatus.Archived]: [
    MatchStatus.TenantLiked,
    MatchStatus.LandlordQualified,
    MatchStatus.ChatInitiated,
    MatchStatus.Active,
    MatchStatus.Closed,
    MatchStatus.Dismissed,
  ],
  [MatchStatus.Closed]: [
    MatchStatus.TenantLiked,
    MatchStatus.LandlordQualified,
    MatchStatus.ChatInitiated,
    MatchStatus.Active,
    MatchStatus.Dismissed,
  ],
  [MatchStatus.Dismissed]: [MatchStatus.TenantLiked], // recycling path
};

const ACTIVE_MATCH_STATUSES: MatchStatus[] = [
  MatchStatus.TenantLiked,
  MatchStatus.LandlordQualified,
  MatchStatus.ChatInitiated,
  MatchStatus.Active,
];

const CHAT_VISIBLE_STATUSES: MatchStatus[] = [MatchStatus.ChatInitiated, MatchStatus.Active];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  return new Types.ObjectId(id);
}

function paginationStages(page = 1, limit = DEFAULT_PAGE_LIMIT): PipelineStage[] {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }];
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === 11000;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly usersService: UsersService,
    private readonly propertiesService: PropertiesService,
    private readonly workspaceService: WorkspaceService,
    private readonly redisCache: RedisCacheService
  ) { }

  private tenantMatchCacheKey(
    kind: "active" | "recycled",
    tenantId: string,
    options?: Record<string, unknown>
  ) {
    return `tenant-matches:${kind}:${tenantId}:${stableStringify(options ?? {})}`;
  }

  async clearTenantMatchCaches(tenantId: string) {
    await Promise.all([
      this.redisCache.deleteByPrefix(`tenant-matches:active:${tenantId}:`),
      this.redisCache.deleteByPrefix(`tenant-matches:recycled:${tenantId}:`),
    ]);
  }

  // -----------------------------------------------------------------------
  // Create / upsert a match
  // -----------------------------------------------------------------------

  async createMatch(dto: CreateMatchDto) {
    if (!dto.tenantId) {
      throw new BadRequestException("tenantId is required");
    }

    const [tenant, property] = await Promise.all([
      this.usersService.findById(dto.tenantId),
      this.propertiesService.getProperty(dto.propertyId),
    ]);

    const tenantPrefs = tenant.preferences?.tenant;
    const matchInput: PropertyMatchInput = {
      propertyType: property.propertyType,
      monthlyPrice: property.monthlyPrice,
      petFriendly: property.petFriendly,
      landlordRequirements: property.landlordRequirements,
      amenities: property.amenities,
      lat: property.address?.lat,
      lng: property.address?.lng,
    };

    const matchScoreData = computeMatchScore(
      {
        ...tenantPrefs,
        lat: tenant.address?.lat,
        lng: tenant.address?.lng,
      },
      matchInput
    );

    const isDismiss = dto.tenantLiked === false;
    const baseStatus = isDismiss
      ? MatchStatus.Dismissed
      : MatchStatus.TenantLiked;

    const computedStatus =
      dto.status ||
      (baseStatus === MatchStatus.TenantLiked && matchScoreData.matchScore >= 70
        ? MatchStatus.LandlordQualified
        : baseStatus);

    const tenantOid = toObjectId(dto.tenantId);
    const propertyOid = toObjectId(dto.propertyId);

    const matchIdentityFilter = {
      $or: [
        { tenantId: tenantOid, propertyId: propertyOid },
        { tenantId: dto.tenantId, propertyId: dto.propertyId },
      ],
    };

    const duplicates = await this.matchModel
      .find(matchIdentityFilter)
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .exec();
    let existing = duplicates[0] ?? null;

    if (duplicates.length > 1 && existing) {
      const redundantIds = duplicates
        .slice(1)
        .map((item) => item._id);
      await Promise.all([
        this.messageModel.deleteMany({ matchId: { $in: redundantIds } }),
        this.matchModel.deleteMany({ _id: { $in: redundantIds } }),
      ]);
    }

    const saveExisting = async (doc: MatchDocument) => {
      const nextStatus =
        doc.status === MatchStatus.Dismissed && !isDismiss
          ? MatchStatus.TenantLiked
          : computedStatus;

      doc.tenantLiked = dto.tenantLiked ?? doc.tenantLiked;
      // Normalize legacy string IDs to ObjectId representation.
      if (!(doc.tenantId instanceof Types.ObjectId)) {
        doc.tenantId = tenantOid;
      }
      if (!(doc.propertyId instanceof Types.ObjectId)) {
        doc.propertyId = propertyOid;
      }
      if (!doc.landlordId && property.landlordId) {
        doc.landlordId = property.landlordId as Types.ObjectId;
      }
      doc.status = this.validateTransition(doc.status, nextStatus);
      doc.matchScore = matchScoreData.matchScore;
      doc.preferencesMatchPercentage = matchScoreData.preferencesMatchPercentage;
      doc.apartmentPreferenceMatchPercentage =
        matchScoreData.apartmentPreferenceMatchPercentage;
      doc.locationScore = matchScoreData.locationScore;
      doc.amenityScore = matchScoreData.amenityScore;
      doc.affordabilityScore = matchScoreData.affordabilityScore;
      doc.timestamp = new Date();

      if (isDismiss) {
        doc.dismissedAt = new Date();
        doc.dismissReason = dto.dismissReason ?? DismissReason.Soft;
      } else {
        doc.dismissedAt = undefined;
        doc.dismissReason = undefined;
      }

      const saved = await doc.save();
      await this.clearTenantMatchCaches(dto.tenantId);
      return saved;
    };

    if (existing) {
      return saveExisting(existing);
    }

    const created = new this.matchModel({
      tenantId: tenantOid,
      propertyId: propertyOid,
      landlordId: property.landlordId,
      status: computedStatus,
      tenantLiked: dto.tenantLiked,
      matchScore: matchScoreData.matchScore,
      preferencesMatchPercentage: matchScoreData.preferencesMatchPercentage,
      apartmentPreferenceMatchPercentage:
        matchScoreData.apartmentPreferenceMatchPercentage,
      locationScore: matchScoreData.locationScore,
      amenityScore: matchScoreData.amenityScore,
      affordabilityScore: matchScoreData.affordabilityScore,
      timestamp: new Date(),
      dismissedAt: isDismiss ? new Date() : undefined,
      dismissReason: isDismiss
        ? dto.dismissReason ?? DismissReason.Soft
        : undefined,
    });
    try {
      const saved = await created.save();
      await this.clearTenantMatchCaches(dto.tenantId);
      return saved;
    } catch (error) {
      if (!isMongoDuplicateKeyError(error)) {
        throw error;
      }
      const raced = await this.matchModel
        .findOne(matchIdentityFilter)
        .exec();
      if (!raced) {
        throw error;
      }
      return saveExisting(raced);
    }
  }

  // -----------------------------------------------------------------------
  // Update helpers
  // -----------------------------------------------------------------------

  async updateMatch(id: string, dto: UpdateMatchDto) {
    const match = await this.matchModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (dto.status) {
      match.status = this.validateTransition(match.status, dto.status);
    }
    return match.save();
  }

  async updateMatchForLandlord(
    id: string,
    dto: UpdateMatchDto,
    landlordId: string
  ) {
    const match = await this.matchModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException("Match not found");
    }

    const property = await this.propertiesService.getProperty(
      match.propertyId.toString()
    );
    const canManage = await this.workspaceService.canActorManageProperty(
      landlordId,
      property
    );
    if (!canManage) {
      throw new ForbiddenException("Access denied");
    }

    if (dto.status) {
      match.status = this.validateTransition(match.status, dto.status);
    }
    match.landlordSeenAt = new Date();
    return match.save();
  }

  // -----------------------------------------------------------------------
  // Delete match (unmatch / clear conv)
  // -----------------------------------------------------------------------

  async deleteMatch(matchId: string, tenantId: string) {
    const match = await this.matchModel.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (match.tenantId.toString() !== tenantId) {
      throw new ForbiddenException("Access denied");
    }

    // Remove all duplicate matches for this tenant+property pair to prevent
    // "ghost" conversations from reappearing after relogin.
    const duplicateMatches = await this.matchModel
      .find({
        tenantId: match.tenantId,
        propertyId: match.propertyId,
      })
      .select("_id")
      .lean()
      .exec();

    const matchIds = duplicateMatches.map((item) => item._id);
    if (matchIds.length === 0) {
      return { success: true, deletedMatches: 0, deletedMessages: 0 };
    }

    const [deletedMessagesResult, deletedMatchesResult] = await Promise.all([
      this.messageModel.deleteMany({ matchId: { $in: matchIds } }),
      this.matchModel.deleteMany({ _id: { $in: matchIds } }),
    ]);
    await this.clearTenantMatchCaches(tenantId);
    return {
      success: true,
      deletedMatches: deletedMatchesResult.deletedCount ?? 0,
      deletedMessages: deletedMessagesResult.deletedCount ?? 0,
    };
  }

  // -----------------------------------------------------------------------
  // Hard-block (permanent dismiss — never recycle)
  // -----------------------------------------------------------------------

  async hardBlockMatch(matchId: string, tenantId: string) {
    const match = await this.matchModel.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (match.tenantId.toString() !== tenantId) {
      throw new ForbiddenException("Access denied");
    }

    match.status = MatchStatus.Dismissed;
    match.dismissReason = DismissReason.Hard;
    match.dismissedAt = new Date();
    const saved = await match.save();
    await this.clearTenantMatchCaches(tenantId);
    return saved;
  }

  async archiveMatch(matchId: string, tenantId: string) {
    const match = await this.matchModel.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (match.tenantId.toString() !== tenantId) {
      throw new ForbiddenException("Access denied");
    }
    if (match.status === MatchStatus.Closed || match.status === MatchStatus.Dismissed) {
      return { success: true, status: match.status };
    }
    match.status = this.validateTransition(match.status, MatchStatus.Archived);
    match.tenantUnreadCount = 0;
    match.landlordUnreadCount = 0;
    await match.save();
    await this.clearTenantMatchCaches(tenantId);
    return { success: true, status: match.status };
  }

  // -----------------------------------------------------------------------
  // Smart recycling — retrieve dismissed matches past cooldown
  // -----------------------------------------------------------------------

  async getRecyclableMatches(
    tenantId: string,
    options?: { page?: number; limit?: number; cooldownDays?: number }
  ) {
    const cacheKey = this.tenantMatchCacheKey("recycled", tenantId, options);
    const cached = await this.redisCache.getJson<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }
    const cooldownDays = options?.cooldownDays ?? RECYCLE_COOLDOWN_DAYS;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cooldownDays);

    const tenantOid = toObjectId(tenantId);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          tenantId: tenantOid,
          status: MatchStatus.Dismissed,
          dismissReason: { $ne: DismissReason.Hard },
          dismissedAt: { $lte: cutoff },
        },
      },
      // Join with property to check if it was updated after dismiss
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
        $addFields: {
          propertyUpdatedAfterDismiss: {
            $cond: [
              { $gt: ["$property.updatedAt", "$dismissedAt"] },
              true,
              false,
            ],
          },
          // Priority: updated properties first, then by matchScore
          recyclePriority: {
            $cond: [
              { $gt: ["$property.updatedAt", "$dismissedAt"] },
              1, // updated after dismiss — highest priority
              2, // stale cooldown — lower priority
            ],
          },
        },
      },
      { $sort: { recyclePriority: 1, matchScore: -1 } },
      ...paginationStages(options?.page, options?.limit),
      {
        $project: {
          _id: 1,
          propertyId: 1,
          tenantId: 1,
          status: 1,
          matchScore: 1,
          dismissedAt: 1,
          recycleCount: 1,
          propertyUpdatedAfterDismiss: 1,
          property: {
            _id: "$property._id",
            address: "$property.address",
            monthlyPrice: "$property.monthlyPrice",
            propertyType: "$property.propertyType",
            listingIntent: "$property.listingIntent",
            bedCount: "$property.bedCount",
            bathCount: "$property.bathCount",
            images: "$property.images",
            amenities: "$property.amenities",
            neighborhood: "$property.neighborhood",
            updatedAt: "$property.updatedAt",
          },
        },
      },
    ];

    const results = await this.matchModel.aggregate(pipeline).exec();
    await this.redisCache.setJson(
      cacheKey,
      results,
      TENANT_MATCH_CACHE_TTL_SECONDS
    );
    return results;
  }

  async recycleDismissedMatch(matchId: string, tenantId: string) {
    const match = await this.matchModel.findById(matchId).exec();
    if (!match) {
      throw new NotFoundException("Match not found");
    }
    if (match.tenantId.toString() !== tenantId) {
      throw new ForbiddenException("Access denied");
    }
    if (match.status !== MatchStatus.Dismissed) {
      throw new BadRequestException("Match is not dismissed");
    }
    if (match.dismissReason === DismissReason.Hard) {
      throw new BadRequestException("This match is permanently blocked");
    }

    await match.deleteOne();
    await this.clearTenantMatchCaches(tenantId);
    return { success: true };
  }

  async recycleDismissedMatchesBulk(matchIds: string[], tenantId: string) {
    if (!matchIds?.length) return { success: true, count: 0 };

    const objectIds = matchIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (!objectIds.length) return { success: true, count: 0 };

    const result = await this.matchModel.deleteMany({
      _id: { $in: objectIds },
      tenantId: new Types.ObjectId(tenantId),
      status: MatchStatus.Dismissed,
      dismissReason: { $ne: DismissReason.Hard },
    });

    await this.clearTenantMatchCaches(tenantId);

    return { success: true, count: result.deletedCount };
  }

  // -----------------------------------------------------------------------
  // Query helpers — all using proper ObjectId comparisons
  // -----------------------------------------------------------------------

  async findByProperty(propertyId: string) {
    return this.matchModel
      .find({
        propertyId: toObjectId(propertyId),
        status: { $in: ACTIVE_MATCH_STATUSES },
      })
      .exec();
  }

  async countByProperty(propertyId: string) {
    return this.matchModel
      .countDocuments({
        propertyId: toObjectId(propertyId),
        status: { $in: ACTIVE_MATCH_STATUSES },
      })
      .exec();
  }

  async countNewByProperty(propertyId: string) {
    return this.matchModel
      .countDocuments({
        propertyId: toObjectId(propertyId),
        status: { $in: ACTIVE_MATCH_STATUSES },
        $or: [
          { landlordSeenAt: { $exists: false } },
          { landlordSeenAt: null },
          { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
        ],
      })
      .exec();
  }

  async getMatchCountsByPropertyIds(propertyIds: string[]) {
    if (!propertyIds.length) return [];

    const oids = propertyIds.map(toObjectId);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          propertyId: { $in: oids },
          status: { $in: ACTIVE_MATCH_STATUSES },
        },
      },
      { $group: { _id: "$propertyId", count: { $sum: 1 } } },
    ];

    return this.matchModel.aggregate(pipeline).exec();
  }

  async getNewMatchCountsByPropertyIds(propertyIds: string[]) {
    if (!propertyIds.length) return [];

    const oids = propertyIds.map(toObjectId);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          propertyId: { $in: oids },
          status: { $in: ACTIVE_MATCH_STATUSES },
          $or: [
            { landlordSeenAt: { $exists: false } },
            { landlordSeenAt: null },
            { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
          ],
        },
      },
      { $group: { _id: "$propertyId", count: { $sum: 1 } } },
    ];

    return this.matchModel.aggregate(pipeline).exec();
  }

  async getMatchesByMonthForPropertyIds(
    propertyIds: string[],
    monthsBack = 6
  ): Promise<Array<{ monthKey: string; count: number }>> {
    if (!propertyIds.length) return [];

    const oids = propertyIds.map(toObjectId);
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - Math.max(0, monthsBack - 1));

    const pipeline: PipelineStage[] = [
      {
        $match: {
          propertyId: { $in: oids },
          createdAt: { $gte: start },
          status: { $in: ACTIVE_MATCH_STATUSES },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const rows = await this.matchModel.aggregate(pipeline).exec();
    return rows.map((row: { _id: string; count: number }) => ({
      monthKey: row._id,
      count: row.count ?? 0,
    }));
  }

  async findPropertyIdsWithMatches(landlordPropertyIds: string[]) {
    if (!landlordPropertyIds.length) return [];

    const oids = landlordPropertyIds.map(toObjectId);
    const results = await this.matchModel
      .aggregate([
        {
          $match: {
            propertyId: { $in: oids },
            status: { $in: ACTIVE_MATCH_STATUSES },
          },
        },
        { $group: { _id: "$propertyId" } },
      ])
      .exec();

    return results.map((item: any) => item._id);
  }

  async getPropertyMatchesWithTenant(
    propertyId: string,
    options?: { page?: number; limit?: number }
  ) {
    const propertyOid = toObjectId(propertyId);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          propertyId: propertyOid,
          status: { $in: ACTIVE_MATCH_STATUSES },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "tenantId",
          foreignField: "_id",
          as: "tenant",
        },
      },
      { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          propertyId: 1,
          tenantId: 1,
          status: 1,
          matchScore: 1,
          preferencesMatchPercentage: 1,
          apartmentPreferenceMatchPercentage: 1,
          locationScore: 1,
          amenityScore: 1,
          affordabilityScore: 1,
          tenantLiked: 1,
          timestamp: 1,
          createdAt: 1,
          updatedAt: 1,
          landlordSeenAt: 1,
          isNewForLandlord: {
            $cond: [
              {
                $or: [
                  {
                    $eq: [
                      { $ifNull: ["$landlordSeenAt", null] },
                      null,
                    ],
                  },
                  { $gt: ["$updatedAt", "$landlordSeenAt"] },
                ],
              },
              true,
              false,
            ],
          },
          tenant: {
            _id: "$tenant._id",
            firstName: "$tenant.firstName",
            lastName: "$tenant.lastName",
            email: "$tenant.email",
            phoneNumber: "$tenant.phoneNumber",
            photoUrl: "$tenant.photoUrl",
            isVerified: "$tenant.isVerified",
            preferences: "$tenant.preferences",
          },
        },
      },
      { $sort: { matchScore: -1, updatedAt: -1 } },
      ...paginationStages(options?.page, options?.limit),
    ];

    return this.matchModel.aggregate(pipeline).exec();
  }

  async markMatchesSeenForProperty(propertyId: string) {
    const now = new Date();
    await this.matchModel.updateMany(
      { propertyId: toObjectId(propertyId), status: { $in: ACTIVE_MATCH_STATUSES } },
      { $set: { landlordSeenAt: now } }
    );
    return { propertyId, seenAt: now.toISOString() };
  }

  async landlordHasTenantMatch(
    landlordPropertyIds: string[],
    tenantId: string
  ) {
    if (!landlordPropertyIds.length) return false;

    const oids = landlordPropertyIds.map(toObjectId);
    const tenantOid = toObjectId(tenantId);
    const exists = await this.matchModel.exists({
      propertyId: { $in: oids },
      tenantId: tenantOid,
      status: { $in: ACTIVE_MATCH_STATUSES },
    });
    return Boolean(exists);
  }

  // -----------------------------------------------------------------------
  // Tenant matches — full list with property + message metadata + pagination
  // -----------------------------------------------------------------------

  async getTenantMatches(
    tenantId: string,
    options?: { page?: number; limit?: number }
  ) {
    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("Invalid tenantId");
    }
    const cacheKey = this.tenantMatchCacheKey("active", tenantId, options);
    const cached = await this.redisCache.getJson<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const tenantOid = toObjectId(tenantId);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          tenantId: { $in: [tenantOid, tenantId] },
          status: { $in: ACTIVE_MATCH_STATUSES },
        },
      },
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
        $addFields: {
          lastMessage: "$lastMessage",
          unreadCount: { $ifNull: ["$tenantUnreadCount", 0] },
          landlordReplied: { $ifNull: ["$landlordReplied", 0] },
        },
      },
      { $sort: { "lastMessage.timestamp": -1, updatedAt: -1, _id: -1 } },
      ...paginationStages(options?.page, options?.limit),
    ];

    const results = await this.matchModel.aggregate(pipeline).exec();
    await this.redisCache.setJson(
      cacheKey,
      results,
      TENANT_MATCH_CACHE_TTL_SECONDS
    );
    return results;
  }

  // -----------------------------------------------------------------------
  // State machine
  // -----------------------------------------------------------------------

  private validateTransition(
    current: MatchStatus,
    incoming: MatchStatus
  ): MatchStatus {
    // Same status is always valid (no-op)
    if (current === incoming) return incoming;

    const allowed = VALID_TRANSITIONS[current];
    if (!allowed || !allowed.includes(incoming)) {
      throw new BadRequestException(
        `Invalid status transition: ${current} → ${incoming}`
      );
    }
    return incoming;
  }

}
