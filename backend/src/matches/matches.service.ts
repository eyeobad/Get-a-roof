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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_LIMIT = 20;
const RECYCLE_COOLDOWN_DAYS = 14;

/** Valid match-status transitions: from → allowed destinations */
const VALID_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  [MatchStatus.TenantLiked]: [
    MatchStatus.LandlordQualified,
    MatchStatus.ChatInitiated,
    MatchStatus.Dismissed,
  ],
  [MatchStatus.LandlordQualified]: [
    MatchStatus.ChatInitiated,
    MatchStatus.Dismissed,
  ],
  [MatchStatus.ChatInitiated]: [MatchStatus.Dismissed],
  [MatchStatus.Dismissed]: [MatchStatus.TenantLiked], // recycling path
};

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
    private readonly workspaceService: WorkspaceService
  ) { }

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

    const existing = await this.matchModel
      .findOne({ tenantId: tenantOid, propertyId: propertyOid })
      .exec();

    if (existing) {
      const nextStatus =
        existing.status === MatchStatus.Dismissed && !isDismiss
          ? MatchStatus.TenantLiked
          : computedStatus;

      existing.tenantLiked = dto.tenantLiked ?? existing.tenantLiked;
      existing.status = this.validateTransition(existing.status, nextStatus);
      existing.matchScore = matchScoreData.matchScore;
      existing.preferencesMatchPercentage = matchScoreData.preferencesMatchPercentage;
      existing.apartmentPreferenceMatchPercentage =
        matchScoreData.apartmentPreferenceMatchPercentage;
      existing.locationScore = matchScoreData.locationScore;
      existing.amenityScore = matchScoreData.amenityScore;
      existing.affordabilityScore = matchScoreData.affordabilityScore;
      existing.timestamp = new Date();

      if (isDismiss) {
        existing.dismissedAt = new Date();
        existing.dismissReason = dto.dismissReason ?? DismissReason.Soft;
      } else {
        existing.dismissedAt = undefined;
        existing.dismissReason = undefined;
      }

      return existing.save();
    }

    const created = new this.matchModel({
      tenantId: tenantOid,
      propertyId: propertyOid,
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

    return created.save();
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
    return match.save();
  }

  // -----------------------------------------------------------------------
  // Smart recycling — retrieve dismissed matches past cooldown
  // -----------------------------------------------------------------------

  async getRecyclableMatches(
    tenantId: string,
    options?: { page?: number; limit?: number; cooldownDays?: number }
  ) {
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

    return this.matchModel.aggregate(pipeline).exec();
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

    return { success: true, count: result.deletedCount };
  }

  // -----------------------------------------------------------------------
  // Query helpers — all using proper ObjectId comparisons
  // -----------------------------------------------------------------------

  async findByProperty(propertyId: string) {
    return this.matchModel
      .find({
        propertyId: toObjectId(propertyId),
        status: { $ne: MatchStatus.Dismissed },
      })
      .exec();
  }

  async countByProperty(propertyId: string) {
    return this.matchModel
      .countDocuments({
        propertyId: toObjectId(propertyId),
        status: { $ne: MatchStatus.Dismissed },
      })
      .exec();
  }

  async countNewByProperty(propertyId: string) {
    return this.matchModel
      .countDocuments({
        propertyId: toObjectId(propertyId),
        status: { $ne: MatchStatus.Dismissed },
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
          status: { $ne: MatchStatus.Dismissed },
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
          status: { $ne: MatchStatus.Dismissed },
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
          status: { $ne: MatchStatus.Dismissed },
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
            status: { $ne: MatchStatus.Dismissed },
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
          status: { $ne: MatchStatus.Dismissed },
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
      { propertyId: toObjectId(propertyId), status: { $ne: MatchStatus.Dismissed } },
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
      status: { $ne: MatchStatus.Dismissed },
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

    const tenantOid = toObjectId(tenantId);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          tenantId: tenantOid,
          status: { $ne: MatchStatus.Dismissed },
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
        $lookup: {
          from: "messages",
          let: {
            matchId: "$_id",
            currentUserId: tenantId,
            landlordId: "$property.landlordId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$matchId", "$$matchId"],
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
                            $eq: [
                              { $toString: "$receiverId" },
                              "$$currentUserId",
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
                landlordReplied: {
                  $max: {
                    $cond: [
                      {
                        $eq: [
                          { $toString: "$senderId" },
                          { $toString: "$$landlordId" },
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
                lastMessage: 1,
                unreadCount: 1,
                landlordReplied: 1,
              },
            },
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
          landlordReplied: {
            $ifNull: [
              { $arrayElemAt: ["$messageMeta.landlordReplied", 0] },
              0,
            ],
          },
        },
      },
      { $project: { messageMeta: 0 } },
      { $sort: { updatedAt: -1 } },
      ...paginationStages(options?.page, options?.limit),
    ];

    return this.matchModel.aggregate(pipeline).exec();
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
