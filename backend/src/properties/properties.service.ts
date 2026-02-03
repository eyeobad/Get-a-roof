import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Property, PropertyDocument } from "./schemas/property.schema";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { UsersService } from "../users/users.service";
import { computeMatchScore, PropertyMatchInput } from "../common/utils/match.utils";
import { haversineDistanceKm } from "../common/utils/geo.utils";
import { toNumber } from "../common/utils/match.helpers";
import { Match, MatchDocument } from "../matches/schemas/match.schema";
import { MatchStatus } from "../common/enums";
import { normalizePropertyType } from "../common/utils/property.utils";
import { AppwriteStorageService } from "../appwrite/appwrite.service";
import { Express } from "express";

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    private readonly usersService: UsersService,
    private readonly appwriteStorage: AppwriteStorageService
  ) {}

  async createProperty(dto: CreatePropertyDto) {
    const normalized = this.normalizePropertyPayload(dto);
    const created = new this.propertyModel(normalized);
    return created.save();
  }

  async updateProperty(id: string, dto: UpdatePropertyDto) {
    const normalized = this.normalizePropertyPayload(dto);
    const updated = await this.propertyModel
      .findByIdAndUpdate(id, normalized, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException("Property not found");
    }
    return updated;
  }

  async getProperty(id: string) {
    const property = await this.propertyModel.findById(id).exec();
    if (!property) {
      throw new NotFoundException("Property not found");
    }
    return property;
  }

  async exploreProperties(
    filters: Record<string, unknown>,
    options?: {
      userId?: string;
      lat?: number;
      lng?: number;
      distanceKm?: number;
      minMatchScore?: number;
      limit?: number;
    }
  ) {
    const limit = options?.limit ?? 50;
    const queryFilters = { ...filters };
    if (options?.userId) {
      const excludedIds = await this.getTenantMatchPropertyIds(options.userId, true);
      if (excludedIds.length) {
        if (queryFilters._id && typeof queryFilters._id === "object") {
          (queryFilters._id as any).$nin = excludedIds;
        } else {
          queryFilters._id = { $nin: excludedIds };
        }
      }
    }
    const properties = await this.propertyModel.find(queryFilters).limit(limit).exec();
    return this.applyScoringAndFilters(properties, options);
  }

  async getMapMatches(
    filters: Record<string, unknown>,
    options?: {
      userId?: string;
      lat?: number;
      lng?: number;
      distanceKm?: number;
      minMatchScore?: number;
      limit?: number;
    }
  ) {
    const matchIds = await this.getTenantMatchPropertyIds(options?.userId, false);
    if (!matchIds.length) {
      return [];
    }
    const withCoords = {
      ...filters,
      "address.lat": { $ne: null },
      "address.lng": { $ne: null },
    };
    if (withCoords._id && typeof withCoords._id === "object") {
      (withCoords._id as any).$in = matchIds;
    } else {
      withCoords._id = { $in: matchIds };
    }
    const limit = options?.limit ?? 50;
    const properties = await this.propertyModel
      .find(withCoords)
      .limit(limit)
      .exec();
    const results = await this.applyScoringAndFilters(properties, options);
    return results.map((property) => ({
      _id: property._id,
      address: property.address,
      monthlyPrice: property.monthlyPrice,
      propertyType: property.propertyType,
      bedCount: property.bedCount,
      bathCount: property.bathCount,
      sqFt: property.sqFt,
      neighborhood: property.neighborhood,
      amenities: property.amenities,
      images: property.images,
      matchScore: property.matchScore,
      preferencesMatchPercentage: property.preferencesMatchPercentage,
      apartmentPreferenceMatchPercentage: property.apartmentPreferenceMatchPercentage,
      distanceKm: property.distanceKm,
    }));
  }

  async uploadImage(file?: Express.Multer.File) {
    return this.uploadToAppwrite(file);
  }

  async uploadProof(file?: Express.Multer.File) {
    return this.uploadToAppwrite(file);
  }

  private async uploadToAppwrite(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    const result = await this.appwriteStorage.uploadFile(
      file.originalname ?? file.filename ?? `property-${Date.now()}`,
      file.buffer,
      file.mimetype ?? "image/jpeg"
    );
    if (!result?.url) {
      throw new BadRequestException("Unable to upload file");
    }
    return { url: result.url };
  }

  async getLandlordProperties(
    landlordId: string,
    options?: { q?: string; status?: string; sort?: string }
  ) {
    const filters: Record<string, any> = { landlordId };
    if (options?.status) {
      filters.status = options.status;
    }
    if (options?.q) {
      const regex = new RegExp(options.q, "i");
      filters.$or = [
        { "address.street": regex },
        { "address.city": regex },
        { "address.state": regex },
        { neighborhood: regex },
      ];
    }

    let query = this.propertyModel.find(filters);
    if (options?.sort === "priceAsc") {
      query = query.sort({ monthlyPrice: 1 });
    } else if (options?.sort === "priceDesc") {
      query = query.sort({ monthlyPrice: -1 });
    } else {
      query = query.sort({ updatedAt: -1 });
    }
    return query.exec();
  }

  private normalizePropertyPayload<T extends CreatePropertyDto | UpdatePropertyDto>(
    dto: T
  ) {
    const normalized: any = { ...dto };

    if (normalized.location && !normalized.address) {
      normalized.address = { street: normalized.location };
    }
    delete normalized.location;

    if (normalized.propertyType) {
      normalized.propertyType =
        normalizePropertyType(normalized.propertyType) ?? normalized.propertyType;
    }

    return normalized;
  }

  private async applyScoringAndFilters(
    properties: PropertyDocument[],
    options?: {
      userId?: string;
      lat?: number;
      lng?: number;
      distanceKm?: number;
      minMatchScore?: number;
    }
  ) {
    let tenantPreferences: any | undefined;
    if (options?.userId) {
      const user = await this.usersService.findById(options.userId);
      tenantPreferences = user.preferences?.tenant;
    }

    const baseCoords =
      options?.lat !== undefined && options?.lng !== undefined
        ? { lat: options.lat, lng: options.lng }
        : undefined;
    const tenantDistance =
      tenantPreferences?.maxCommuteRadius !== undefined
        ? tenantPreferences.maxCommuteRadius * 1.60934
        : undefined;
    const distanceLimit = baseCoords ? options?.distanceKm ?? tenantDistance : undefined;

    const scored = properties.map((property) => {
      const plain = property.toObject();
      const matchInput: PropertyMatchInput = {
        propertyType: plain.propertyType,
        monthlyPrice: plain.monthlyPrice,
        petFriendly: plain.petFriendly,
        landlordRequirements: plain.landlordRequirements,
      };

      const match = tenantPreferences
        ? computeMatchScore(tenantPreferences, matchInput)
        : {
            preferencesMatchPercentage: 0,
            apartmentPreferenceMatchPercentage: 0,
            matchScore: 0,
          };

      let distanceKm: number | undefined;
      if (
        baseCoords &&
        plain.address?.lat !== undefined &&
        plain.address?.lng !== undefined
      ) {
        distanceKm = haversineDistanceKm(baseCoords, {
          lat: plain.address.lat,
          lng: plain.address.lng,
        });
      }

      return {
        ...plain,
        ...match,
        distanceKm,
      };
    });

    let filtered = scored;

    if (distanceLimit !== undefined) {
      filtered = filtered.filter(
        (property) =>
          property.distanceKm !== undefined &&
          property.distanceKm <= distanceLimit
      );
    }

    if (tenantPreferences?.petFriendlyRequired) {
      filtered = filtered.filter((property) => property.petFriendly === true);
    }

    const minMatchScore = toNumber(options?.minMatchScore);
    if (minMatchScore !== undefined) {
      filtered = filtered.filter(
        (property) => property.matchScore >= minMatchScore
      );
    }

    return filtered;
  }

  private async getTenantMatchPropertyIds(tenantId?: string, includeDismissed?: boolean) {
    if (!tenantId) {
      return [];
    }
    const filter: Record<string, unknown> = { tenantId };
    if (!includeDismissed) {
      filter.status = { $ne: MatchStatus.Dismissed };
    }
    return this.matchModel.find(filter).distinct("propertyId").exec();
  }
}
