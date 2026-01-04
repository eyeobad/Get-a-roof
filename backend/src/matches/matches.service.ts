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
    return match.save();
  }

  async findByProperty(propertyId: string) {
    return this.matchModel.find({ propertyId }).exec();
  }

  async countByProperty(propertyId: string) {
    return this.matchModel.countDocuments({ propertyId }).exec();
  }

  async findPropertyIdsWithMatches(landlordPropertyIds: string[]) {
    return this.matchModel
      .find({ propertyId: { $in: landlordPropertyIds } })
      .distinct("propertyId")
      .exec();
  }

  async getTenantMatches(tenantId: string) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          tenantId: tenantObjectId,
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
          let: { matchId: "$_id" },
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
                          { $eq: ["$receiverId", tenantObjectId] },
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
                lastMessage: 1,
                unreadCount: 1,
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
