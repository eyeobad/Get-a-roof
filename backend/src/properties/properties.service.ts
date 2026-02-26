import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Property, PropertyDocument } from "./schemas/property.schema";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { UsersService } from "../users/users.service";
import { computeMatchScore, PropertyMatchInput } from "../common/utils/match.utils";
import { haversineDistanceKm } from "../common/utils/geo.utils";
import { toNumber } from "../common/utils/match.helpers";
import { Match, MatchDocument } from "../matches/schemas/match.schema";
import { MatchStatus, RouteAccessStatus, UserRole } from "../common/enums";
import { normalizePropertyType } from "../common/utils/property.utils";
import { AppwriteStorageService } from "../appwrite/appwrite.service";
import { Express } from "express";
import { User, UserDocument } from "../users/schemas/user.schema";

const propertyImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const propertyProofMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
    private readonly appwriteStorage: AppwriteStorageService
  ) {}

  async createProperty(dto: CreatePropertyDto) {
    if (!dto.landlordId || !Types.ObjectId.isValid(dto.landlordId)) {
      throw new BadRequestException("Invalid landlordId");
    }
    const landlord = await this.userModel.findById(dto.landlordId).select("role").lean();
    if (!landlord || landlord.role !== UserRole.Landlord) {
      throw new BadRequestException("Property must be tied to a valid landlord account");
    }
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
    const landlordExists = await this.userModel
      .exists({ _id: property.landlordId, role: UserRole.Landlord });
    if (!landlordExists) {
      await this.propertyModel.deleteOne({ _id: property._id });
      throw new NotFoundException("Property not found");
    }
    return property;
  }

  async getPropertyForViewer(id: string, userId?: string) {
    const property = await this.getProperty(id);
    const base = property.toObject();
    if (!userId) {
      return base;
    }

    const routeAccessMap = await this.getTenantRouteAccessMap(userId, [property._id]);
    const routeAccess = routeAccessMap.get(property._id.toString());
    return {
      ...base,
      ...(routeAccess ?? { routeAccessStatus: RouteAccessStatus.None }),
    };
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
    const validProperties = await this.removeOrphanedProperties(properties);
    return this.applyScoringAndFilters(validProperties, options);
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
    const validProperties = await this.removeOrphanedProperties(properties);
    const results = await this.applyScoringAndFilters(validProperties, options);
    const routeAccessMap = await this.getTenantRouteAccessMap(
      options?.userId,
      results.map((property) => property._id)
    );
    return results.map((property) => ({
      ...(routeAccessMap.get(property._id?.toString?.() ?? String(property._id)) ?? {
        routeAccessStatus: RouteAccessStatus.None,
      }),
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
    return this.uploadToAppwrite(file, propertyImageMimeTypes);
  }

  async uploadProof(file?: Express.Multer.File) {
    return this.uploadToAppwrite(file, propertyProofMimeTypes);
  }

  private async uploadToAppwrite(
    file?: Express.Multer.File,
    allowedTypes?: Set<string>
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    if (allowedTypes && (!file.mimetype || !allowedTypes.has(file.mimetype))) {
      throw new BadRequestException("Unsupported file type");
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
    const filters: Record<string, any> = {
      landlordId: Types.ObjectId.isValid(landlordId)
        ? new Types.ObjectId(landlordId)
        : landlordId,
    };
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

    const projection = {
      address: 1,
      neighborhood: 1,
      status: 1,
      monthlyPrice: 1,
      bedCount: 1,
      bathCount: 1,
      propertyType: 1,
      images: 1,
      updatedAt: 1,
      landlordId: 1,
    };

    let query = this.propertyModel.find(filters).select(projection);
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
    const filter: Record<string, unknown> = {};
    if (Types.ObjectId.isValid(tenantId)) {
      const tenantObjectId = new Types.ObjectId(tenantId);
      filter.$or = [{ tenantId }, { tenantId: tenantObjectId }];
    } else {
      filter.tenantId = tenantId;
    }
    if (!includeDismissed) {
      filter.status = { $ne: MatchStatus.Dismissed };
    }
    return this.matchModel.find(filter).distinct("propertyId").exec();
  }

  private async getTenantRouteAccessMap(
    tenantId: string | undefined,
    propertyIds: Array<unknown>
  ) {
    const map = new Map<
      string,
      {
        routeAccessStatus: RouteAccessStatus;
        routeOriginLat?: number;
        routeOriginLng?: number;
        routeAccessExpiresAt?: Date;
      }
    >();
    if (!tenantId || !propertyIds.length) return map;

    const normalizedPropertyIds = propertyIds
      .map((id) => id?.toString?.() ?? String(id))
      .filter(Boolean);
    if (!normalizedPropertyIds.length) return map;

    const filter: Record<string, unknown> = {
      status: { $ne: MatchStatus.Dismissed },
      $expr: {
        $in: [{ $toString: "$propertyId" }, normalizedPropertyIds],
      },
    };
    if (Types.ObjectId.isValid(tenantId)) {
      const tenantObjectId = new Types.ObjectId(tenantId);
      filter.$or = [{ tenantId }, { tenantId: tenantObjectId }];
    } else {
      filter.tenantId = tenantId;
    }

    const matches = await this.matchModel
      .find(filter)
      .select("propertyId routeAccessStatus routeOriginLat routeOriginLng routeAccessExpiresAt")
      .lean()
      .exec();

    matches.forEach((match) => {
      const propertyId = match.propertyId?.toString?.();
      if (!propertyId) return;
      const expiresAt = match.routeAccessExpiresAt
        ? new Date(match.routeAccessExpiresAt)
        : undefined;
      const isActiveApproval =
        match.routeAccessStatus === RouteAccessStatus.Approved &&
        !!expiresAt &&
        Number.isFinite(expiresAt.getTime()) &&
        expiresAt.getTime() > Date.now();
      map.set(
        propertyId,
        {
          routeAccessStatus: isActiveApproval
            ? RouteAccessStatus.Approved
            : ((match.routeAccessStatus as RouteAccessStatus) === RouteAccessStatus.Approved
              ? RouteAccessStatus.None
              : (match.routeAccessStatus as RouteAccessStatus) ?? RouteAccessStatus.None),
          routeOriginLat: isActiveApproval &&
            typeof match.routeOriginLat === "number" && Number.isFinite(match.routeOriginLat)
            ? match.routeOriginLat
            : undefined,
          routeOriginLng: isActiveApproval &&
            typeof match.routeOriginLng === "number" && Number.isFinite(match.routeOriginLng)
            ? match.routeOriginLng
            : undefined,
          routeAccessExpiresAt: isActiveApproval ? expiresAt : undefined,
        }
      );
    });
    return map;
  }

  private async removeOrphanedProperties(properties: PropertyDocument[]) {
    if (!properties.length) return properties;
    const landlordIds = Array.from(
      new Set(
        properties
          .map((property) => property.landlordId?.toString?.() ?? "")
          .filter(Boolean)
      )
    );
    if (!landlordIds.length) return [];

    const validLandlords = await this.userModel
      .find({ _id: { $in: landlordIds }, role: UserRole.Landlord })
      .select("_id")
      .lean();
    const validSet = new Set(validLandlords.map((user) => user._id.toString()));

    const keep: PropertyDocument[] = [];
    const orphanIds: Types.ObjectId[] = [];
    properties.forEach((property) => {
      const ownerId = property.landlordId?.toString?.() ?? "";
      if (ownerId && validSet.has(ownerId)) {
        keep.push(property);
      } else {
        orphanIds.push(property._id);
      }
    });

    if (orphanIds.length) {
      await this.propertyModel.deleteMany({ _id: { $in: orphanIds } });
      await this.matchModel.deleteMany({ propertyId: { $in: orphanIds } });
    }

    return keep;
  }
}
