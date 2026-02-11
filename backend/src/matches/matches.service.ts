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
import { MatchStatus } from "../common/enums";
import { UsersService } from "../users/users.service";
import { PropertiesService } from "../properties/properties.service";
import { computeMatchScore, PropertyMatchInput } from "../common/utils/match.utils";
import { Message, MessageDocument } from "../chat/schemas/message.schema";

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly usersService: UsersService,
    private readonly propertiesService: PropertiesService
  ) {}

  async createMatch(dto: CreateMatchDto) {
    if (!dto.tenantId) {
      throw new BadRequestException("tenantId is required");
    }
    const tenant = await this.usersService.findById(dto.tenantId);
    const property = await this.propertiesService.getProperty(dto.propertyId);
    const matchInput: PropertyMatchInput = {
      propertyType: property.propertyType,
      monthlyPrice: property.monthlyPrice,
      petFriendly: property.petFriendly,
      landlordRequirements: property.landlordRequirements,
    };
    const matchScoreData = computeMatchScore(
      tenant.preferences?.tenant,
      matchInput
    );

    const baseStatus =
      dto.tenantLiked === false ? MatchStatus.Dismissed : MatchStatus.TenantLiked;

    const computedStatus =
      dto.status ||
      (baseStatus === MatchStatus.TenantLiked && matchScoreData.matchScore >= 70
        ? MatchStatus.LandlordQualified
        : baseStatus);

    const existing = await this.matchModel
      .findOne({ tenantId: dto.tenantId, propertyId: dto.propertyId })
      .exec();

    if (existing) {
      existing.tenantLiked = dto.tenantLiked ?? existing.tenantLiked;
      existing.status = this.mergeMatchStatus(existing.status, computedStatus);
      existing.matchScore = matchScoreData.matchScore;
      existing.preferencesMatchPercentage = matchScoreData.preferencesMatchPercentage;
      existing.apartmentPreferenceMatchPercentage =
        matchScoreData.apartmentPreferenceMatchPercentage;
      existing.timestamp = new Date();
      return existing.save();
    }

    const created = new this.matchModel({
      tenantId: dto.tenantId,
      propertyId: dto.propertyId,
      status: computedStatus,
      tenantLiked: dto.tenantLiked,
      matchScore: matchScoreData.matchScore,
      preferencesMatchPercentage: matchScoreData.preferencesMatchPercentage,
      apartmentPreferenceMatchPercentage:
        matchScoreData.apartmentPreferenceMatchPercentage,
      timestamp: new Date(),
    });

    return created.save();
  }

  async updateMatch(id: string, dto: UpdateMatchDto) {
    const updated = await this.matchModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException("Match not found");
    }
    return updated;
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
    if (property.landlordId.toString() !== landlordId) {
      throw new ForbiddenException("Access denied");
    }

    match.status = dto.status ?? match.status;
    match.landlordSeenAt = new Date();
    return match.save();
  }

  async findByProperty(propertyId: string) {
    return this.matchModel
      .find({ propertyId, status: { $ne: MatchStatus.Dismissed } })
      .exec();
  }

  async countByProperty(propertyId: string) {
    const propertyIdString = propertyId?.toString?.() ?? propertyId;
    return this.matchModel
      .countDocuments({
        status: { $ne: MatchStatus.Dismissed },
        $expr: {
          $eq: [{ $toString: "$propertyId" }, propertyIdString],
        },
      })
      .exec();
  }

  async countNewByProperty(propertyId: string) {
    const propertyIdString = propertyId?.toString?.() ?? propertyId;
    return this.matchModel
      .countDocuments({
        status: { $ne: MatchStatus.Dismissed },
        $expr: {
          $eq: [{ $toString: "$propertyId" }, propertyIdString],
        },
        $or: [
          { landlordSeenAt: { $exists: false } },
          { landlordSeenAt: null },
          { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
        ],
      })
      .exec();
  }

  async getMatchCountsByPropertyIds(propertyIds: string[]) {
    if (!propertyIds.length) {
      return [];
    }
    const idStrings = propertyIds.map((id) => id?.toString?.() ?? id);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: { $ne: MatchStatus.Dismissed },
          $expr: {
            $in: [{ $toString: "$propertyId" }, idStrings],
          },
        },
      },
      {
        $group: {
          _id: "$propertyId",
          count: { $sum: 1 },
        },
      },
    ];

    return this.matchModel.aggregate(pipeline).exec();
  }

  async getNewMatchCountsByPropertyIds(propertyIds: string[]) {
    if (!propertyIds.length) {
      return [];
    }
    const idStrings = propertyIds.map((id) => id?.toString?.() ?? id);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: { $ne: MatchStatus.Dismissed },
          $expr: {
            $in: [{ $toString: "$propertyId" }, idStrings],
          },
          $or: [
            { landlordSeenAt: { $exists: false } },
            { landlordSeenAt: null },
            { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
          ],
        },
      },
      {
        $group: {
          _id: "$propertyId",
          count: { $sum: 1 },
        },
      },
    ];

    return this.matchModel.aggregate(pipeline).exec();
  }

  async findPropertyIdsWithMatches(landlordPropertyIds: string[]) {
    if (!landlordPropertyIds.length) {
      return [];
    }
    const idStrings = landlordPropertyIds.map(
      (id) => id?.toString?.() ?? id
    );
    const results = await this.matchModel
      .aggregate([
        {
          $match: {
            status: { $ne: MatchStatus.Dismissed },
            $expr: {
              $in: [{ $toString: "$propertyId" }, idStrings],
            },
          },
        },
        { $group: { _id: "$propertyId" } },
      ])
      .exec();
    return results.map((item: any) => item._id);
  }

  async getPropertyMatchesWithTenant(propertyId: string) {
    const propertyIdString = propertyId?.toString?.() ?? propertyId;
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: { $ne: MatchStatus.Dismissed },
          $expr: {
            $eq: [{ $toString: "$propertyId" }, propertyIdString],
          },
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
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                phoneNumber: 1,
                photoUrl: 1,
                isVerified: 1,
                preferences: 1,
              },
            },
          ],
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
      { $sort: { updatedAt: -1 } },
    ];

    return this.matchModel.aggregate(pipeline).exec();
  }

  async markMatchesSeenForProperty(propertyId: string) {
    const now = new Date();
    await this.matchModel.updateMany(
      { propertyId, status: { $ne: MatchStatus.Dismissed } },
      { $set: { landlordSeenAt: now } }
    );
    return { propertyId, seenAt: now.toISOString() };
  }

  async landlordHasTenantMatch(landlordPropertyIds: string[], tenantId: string) {
    if (!landlordPropertyIds.length) {
      return false;
    }
    const idStrings = landlordPropertyIds.map(
      (id) => id?.toString?.() ?? id
    );
    const exists = await this.matchModel.exists({
      status: { $ne: MatchStatus.Dismissed },
      $expr: {
        $and: [
          { $in: [{ $toString: "$propertyId" }, idStrings] },
          { $eq: [{ $toString: "$tenantId" }, tenantId] },
        ],
      },
    });
    return Boolean(exists);
  }

  async getTenantMatches(tenantId: string) {
    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("Invalid tenantId");
    }
    const tenantObjectId = new Types.ObjectId(tenantId);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: { $ne: MatchStatus.Dismissed },
          $or: [{ tenantId: tenantObjectId }, { tenantId }],
        },
      },
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
      {
        $project: {
          messageMeta: 0,
        },
      },
      { $sort: { updatedAt: -1 } },
    ];

    return this.matchModel.aggregate(pipeline).exec();
  }

  private mergeMatchStatus(current: MatchStatus, incoming: MatchStatus) {
    if (incoming === MatchStatus.Dismissed) {
      return MatchStatus.Dismissed;
    }
    if (current === MatchStatus.ChatInitiated) {
      return MatchStatus.ChatInitiated;
    }
    if (incoming === MatchStatus.ChatInitiated) {
      return MatchStatus.ChatInitiated;
    }
    if (
      current === MatchStatus.LandlordQualified ||
      incoming === MatchStatus.LandlordQualified
    ) {
      return MatchStatus.LandlordQualified;
    }
    return MatchStatus.TenantLiked;
  }
}
