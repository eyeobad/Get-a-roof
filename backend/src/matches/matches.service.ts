import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Match, MatchDocument } from "./schemas/match.schema";
import { CreateMatchDto } from "./dto/create-match.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import { MatchStatus } from "../common/enums";
import { UsersService } from "../users/users.service";
import { PropertiesService } from "../properties/properties.service";
import { computeMatchScore, PropertyMatchInput } from "../common/utils/match.utils";

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
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
      landlordRequirements: property.landlordRequirements,
    };
    const matchScoreData = computeMatchScore(
      tenant.preferences?.tenant,
      matchInput
    );

    const baseStatus =
      dto.tenantLiked === false ? MatchStatus.Dismissed : MatchStatus.TenantLiked;

    const status =
      dto.status ||
      (baseStatus === MatchStatus.TenantLiked && matchScoreData.matchScore >= 70
        ? MatchStatus.LandlordQualified
        : baseStatus);

    const created = new this.matchModel({
      tenantId: dto.tenantId,
      propertyId: dto.propertyId,
      status,
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
}
