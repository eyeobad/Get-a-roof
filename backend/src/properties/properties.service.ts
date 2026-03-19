import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Property, PropertyDocument } from "./schemas/property.schema";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { UsersService } from "../users/users.service";
import {
  computeMatchScore,
  PropertyMatchInput,
  type TenantPreferences,
} from "../common/utils/match.utils";
import { haversineDistanceKm } from "../common/utils/geo.utils";
import { toNumber } from "../common/utils/match.helpers";
import { Match, MatchDocument } from "../matches/schemas/match.schema";
import {
  MatchStatus,
  PropertyStatus,
  RouteAccessStatus,
  UserRole,
} from "../common/enums";
import { normalizePropertyType } from "../common/utils/property.utils";
import { AppwriteStorageService } from "../appwrite/appwrite.service";
import { Express } from "express";
import { User, UserDocument } from "../users/schemas/user.schema";
import { Message, MessageDocument } from "../chat/schemas/message.schema";
import { WorkspaceService } from "../common/services/workspace.service";
import { computePropertyFingerprint } from "./utils/fingerprint.utils";
import { QueryCache, stableStringify } from "./utils/query-cache";

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

type PropertyScope = "mine" | "all";
const exploreQueryCache = new QueryCache<unknown[]>(500, 30_000);
const exploreProjection = {
  _id: 1,
  landlordId: 1,
  address: 1,
  neighborhood: 1,
  monthlyPrice: 1,
  propertyType: 1,
  listingIntent: 1,
  bedCount: 1,
  bathCount: 1,
  sqFt: 1,
  petFriendly: 1,
  landlordRequirements: 1,
  amenities: 1,
  images: 1,
  description: 1,
  status: 1,
};

const buildPublicLocationLabel = (property: {
  neighborhood?: string;
  address?: { city?: string; state?: string };
}) =>
  [property.neighborhood, property.address?.city].filter(Boolean).join(", ") ||
  [property.address?.city, property.address?.state].filter(Boolean).join(", ");

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly usersService: UsersService,
    private readonly appwriteStorage: AppwriteStorageService,
    private readonly workspaceService: WorkspaceService
  ) { }

  async createProperty(dto: CreatePropertyDto) {
    if (!dto.landlordId || !Types.ObjectId.isValid(dto.landlordId)) {
      throw new BadRequestException("Invalid landlordId");
    }
    const actor = await this.userModel
      .findById(dto.landlordId)
      .select("role agentOrgId")
      .lean()
      .exec();
    if (
      !actor ||
      (actor.role !== UserRole.Landlord &&
        actor.role !== UserRole.Organisation)
    ) {
      throw new BadRequestException("Invalid owner");
    }

    const actorContext = await this.workspaceService.getWorkspaceActorContext(
      dto.landlordId
    );
    const ownerKind = actorContext.scope === "agent" ? "agent" : "owner";
    const orgId = actorContext.orgId
      ? new Types.ObjectId(actorContext.orgId)
      : undefined;

    const normalized = this.normalizePropertyPayload(dto);
    const fingerprintHash = computePropertyFingerprint(normalized);
    const ownerIdentity = (orgId ?? new Types.ObjectId(dto.landlordId)).toString();

    let duplicateCandidates: PropertyDocument[] = [];
    if (fingerprintHash) {
      duplicateCandidates = await this.propertyModel
        .find({
          fingerprintHash,
          status: { $in: [PropertyStatus.Draft, PropertyStatus.Listed] },
        })
        .sort({ createdAt: 1 })
        .limit(10)
        .exec();

      const sameOwnerDuplicate = duplicateCandidates.find(
        (candidate) => this.resolveOwnerIdentity(candidate) === ownerIdentity
      );

      if (sameOwnerDuplicate) {
        if (!dto.duplicateAction) {
          throw new ConflictException({
            errorCode: "DUPLICATE_LISTING",
            ownershipType: "same_owner",
            message:
              "Similar listing already exists. Choose to increase units or create a new draft.",
            canonicalHint: {
              existingListingId: sameOwnerDuplicate._id?.toString?.(),
              availableUnits: sameOwnerDuplicate.availableUnits ?? 1,
              actions: ["increment_units", "create_new_draft"],
            },
          });
        }
        if (dto.duplicateAction === "create_new_draft") {
          normalized.status = PropertyStatus.Draft;
          normalized.moderationStatus = "Pending";
          normalized.moderationReason =
            "Potential duplicate detected. Manual review required.";
        } else {
          const incrementBy =
            typeof normalized.availableUnits === "number" &&
            Number.isFinite(normalized.availableUnits) &&
            normalized.availableUnits > 0
              ? Math.floor(normalized.availableUnits)
              : 1;
          const updated = await this.propertyModel
            .findByIdAndUpdate(
              sameOwnerDuplicate._id,
              { $inc: { availableUnits: incrementBy } },
              { new: true }
            )
            .exec();
          if (!updated) {
            throw new NotFoundException("Property not found");
          }
          exploreQueryCache.clear();
          return updated;
        }
      }
    }

    const duplicateFromAnotherOwner = duplicateCandidates.find(
      (candidate) => this.resolveOwnerIdentity(candidate) !== ownerIdentity
    );

    let dedupeBucketId: string | undefined;
    if (fingerprintHash) {
      dedupeBucketId =
        duplicateFromAnotherOwner?.dedupeBucketId ?? new Types.ObjectId().toHexString();

      if (
        duplicateFromAnotherOwner &&
        !duplicateFromAnotherOwner.dedupeBucketId
      ) {
        await this.propertyModel
          .updateOne(
            { _id: duplicateFromAnotherOwner._id },
            { $set: { dedupeBucketId } }
          )
          .exec();
      }
    }

    const created = new this.propertyModel({
      ...normalized,
      landlordId: new Types.ObjectId(dto.landlordId),
      ownerKind,
      fingerprintHash,
      dedupeBucketId,
      ...(duplicateFromAnotherOwner
        ? {
            status: PropertyStatus.Draft,
            moderationStatus: "Pending",
            moderationReason:
              "Potential duplicate across different accounts. Review required.",
          }
        : {}),
      ...(orgId ? { orgId } : {}),
    });
    const saved = await created.save();
    exploreQueryCache.clear();
    if (duplicateFromAnotherOwner) {
      throw new ConflictException({
        errorCode: "DUPLICATE_LISTING",
        ownershipType: "different_owner",
        message:
          "A similar listing exists under another owner. Your listing was saved as draft for review.",
        dedupeBucketId,
        draftCreated: true,
        draftId: saved._id?.toString?.(),
      });
    }
    return saved;
  }

  async updateProperty(id: string, dto: UpdatePropertyDto) {
    const current = await this.propertyModel.findById(id).exec();
    if (!current) {
      throw new NotFoundException("Property not found");
    }

    const normalized = this.normalizePropertyPayload(dto);
    const nextForFingerprint = {
      ...current.toObject(),
      ...normalized,
      address: {
        ...(current.address?.toObject ? current.address.toObject() : current.address),
        ...(normalized.address ?? {}),
      },
    };
    const fingerprintHash = computePropertyFingerprint(nextForFingerprint);
    const ownerIdentity = this.resolveOwnerIdentity(current);
    const duplicateFromAnotherOwner = fingerprintHash
      ? await this.propertyModel
          .findOne({
            _id: { $ne: current._id },
            fingerprintHash,
            status: { $in: [PropertyStatus.Draft, PropertyStatus.Listed] },
          })
          .sort({ createdAt: 1 })
          .exec()
      : null;
    const dedupeBucketId =
      duplicateFromAnotherOwner &&
      this.resolveOwnerIdentity(duplicateFromAnotherOwner) !== ownerIdentity
        ? duplicateFromAnotherOwner.dedupeBucketId ?? new Types.ObjectId().toHexString()
        : current.dedupeBucketId;

    if (duplicateFromAnotherOwner && !duplicateFromAnotherOwner.dedupeBucketId) {
      await this.propertyModel
        .updateOne(
          { _id: duplicateFromAnotherOwner._id },
          { $set: { dedupeBucketId } }
        )
        .exec();
    }

    const updated = await this.propertyModel
      .findByIdAndUpdate(
        id,
        {
          ...normalized,
          fingerprintHash,
          dedupeBucketId,
        },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException("Property not found");
    }
    exploreQueryCache.clear();
    return updated;
  }

  async getProperty(id: string) {
    const property = await this.propertyModel.findById(id).exec();
    if (!property) {
      throw new NotFoundException("Property not found");
    }
    return property;
  }

  async assertPropertyMutationAccess(propertyId: string, actorId: string) {
    const property = await this.getProperty(propertyId);
    await this.workspaceService.assertCanManageProperty(actorId, property);
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

    const cacheKey = `explore:${stableStringify({
      queryFilters,
      options,
      limit,
    })}`;
    const cached = exploreQueryCache.get(cacheKey);
    if (cached) {
      return cached as unknown[];
    }

    const properties = await this.propertyModel
      .find(queryFilters, exploreProjection)
      .limit(limit)
      .lean()
      .exec();
    const validProperties = await this.excludeOrphanedProperties(properties);
    const result = (await this.applyScoringAndFilters(validProperties, options)).map(
      (property) => this.toPublicExploreProperty(property)
    );
    exploreQueryCache.set(cacheKey, result);
    return result;
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
    const cacheKey = `map:${stableStringify({
      withCoords,
      options,
      limit,
    })}`;
    const cached = exploreQueryCache.get(cacheKey);
    if (cached) {
      return cached as unknown[];
    }

    const properties = await this.propertyModel
      .find(withCoords, exploreProjection)
      .limit(limit)
      .lean()
      .exec();
    const validProperties = await this.excludeOrphanedProperties(properties);
    const results = await this.applyScoringAndFilters(validProperties, options);
    const routeAccessMap = await this.getTenantRouteAccessMap(
      options?.userId,
      results.map((property) => property._id)
    );
    const mapped = results.map((property) => ({
      ...this.toPublicExploreProperty(property),
      ...(routeAccessMap.get(property._id?.toString?.() ?? String(property._id)) ?? {
        routeAccessStatus: RouteAccessStatus.None,
      }),
    }));
    exploreQueryCache.set(cacheKey, mapped);
    return mapped;
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
    options?: {
      q?: string;
      status?: string;
      sort?: string;
      scope?: PropertyScope;
    }
  ) {
    const workspaceFilters: Record<string, any> = await this.workspaceService.getPropertyWorkspaceFilter(
      landlordId,
      options?.scope
    );

    const clauses: Record<string, any>[] = [workspaceFilters];

    if (options?.status) {
      clauses.push({ status: options.status });
    }
    if (options?.q) {
      const regex = new RegExp(options.q, "i");
      clauses.push({
        $or: [
        { "address.street": regex },
        { "address.city": regex },
        { "address.state": regex },
        { neighborhood: regex },
        ],
      });
    }

    const filters = clauses.length === 1 ? clauses[0] : { $and: clauses };

    const projection = {
      address: 1,
      neighborhood: 1,
      status: 1,
      monthlyPrice: 1,
      bedCount: 1,
      bathCount: 1,
      propertyType: 1,
      listingIntent: 1,
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

  async deletePropertyForLandlord(landlordId: string, propertyId: string) {
    await this.assertPropertyMutationAccess(propertyId, landlordId);
    const property = await this.getProperty(propertyId);

    const matchIds = await this.matchModel
      .find({ propertyId: property._id })
      .distinct("_id")
      .exec();

    if (matchIds.length) {
      await this.messageModel.deleteMany({ matchId: { $in: matchIds } });
      await this.matchModel.deleteMany({ _id: { $in: matchIds } });
    }

    await this.propertyModel.deleteOne({ _id: property._id });
    exploreQueryCache.clear();
    return { deleted: true };
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

    if (normalized.availableUnits !== undefined) {
      const units = Number(normalized.availableUnits);
      if (Number.isFinite(units) && units > 0) {
        normalized.availableUnits = Math.floor(units);
      } else {
        delete normalized.availableUnits;
      }
    }

    delete normalized.duplicateAction;

    return normalized;
  }

  private resolveOwnerIdentity(property: {
    orgId?: Types.ObjectId | null;
    landlordId?: Types.ObjectId | null;
  }) {
    return (property.orgId ?? property.landlordId)?.toString() ?? "";
  }

  private async applyScoringAndFilters(
    properties: Array<Record<string, any>>,
    options?: {
      userId?: string;
      lat?: number;
      lng?: number;
      distanceKm?: number;
      minMatchScore?: number;
    }
  ) {
    let tenantPreferences: TenantPreferences | undefined;
    if (options?.userId) {
      const user = await this.usersService.findById(options.userId);
      tenantPreferences = user.preferences?.tenant as TenantPreferences | undefined;
    }

    const baseCoords =
      options?.lat !== undefined && options?.lng !== undefined
        ? { lat: options.lat, lng: options.lng }
        : undefined;
    const preferredDistance =
      typeof tenantPreferences?.preferredDistance === "number" &&
      Number.isFinite(tenantPreferences.preferredDistance)
        ? tenantPreferences.preferredDistance
        : undefined;
    const preferredState =
      typeof tenantPreferences?.preferredState === "string"
        ? tenantPreferences.preferredState.trim().toLowerCase()
        : "";
    const tenantDistance =
      tenantPreferences?.maxCommuteRadius !== undefined
        ? tenantPreferences.maxCommuteRadius * 1.60934
        : undefined;
    const distanceLimit = baseCoords
      ? options?.distanceKm ?? preferredDistance ?? tenantDistance
      : undefined;
    const shouldFilterState = Boolean(preferredState);

    const scored = properties
      .map((property) => {
        const plain = property;
        const listingState =
          typeof plain.address?.state === "string"
            ? plain.address.state.trim().toLowerCase()
            : "";
        if (shouldFilterState && listingState !== preferredState) {
          return null;
        }

        const matchInput: PropertyMatchInput = {
          propertyType: plain.propertyType,
          monthlyPrice: plain.monthlyPrice,
          petFriendly: plain.petFriendly,
          landlordRequirements: plain.landlordRequirements,
          amenities: plain.amenities,
          lat: plain.address?.lat,
          lng: plain.address?.lng,
        };

        const tenantInput = tenantPreferences
          ? {
            ...tenantPreferences,
            lat: baseCoords?.lat ?? tenantPreferences.lat,
            lng: baseCoords?.lng ?? tenantPreferences.lng,
          }
          : undefined;

        const match = tenantInput
          ? computeMatchScore(tenantInput, matchInput)
          : {
            preferencesMatchPercentage: 0,
            apartmentPreferenceMatchPercentage: 0,
            locationScore: 0,
            amenityScore: 0,
            affordabilityScore: 0,
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
      })
      .filter((property): property is NonNullable<typeof property> => property !== null);

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
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      return [];
    }
    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
    };
    if (!includeDismissed) {
      filter.status = {
        $nin: [MatchStatus.Dismissed, MatchStatus.Archived, MatchStatus.Closed],
      };
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
    if (!tenantId || !Types.ObjectId.isValid(tenantId) || !propertyIds.length) return map;

    const oids = propertyIds
      .map((id) => {
        const s = id?.toString?.() ?? String(id);
        return Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;
      })
      .filter(Boolean) as Types.ObjectId[];
    if (!oids.length) return map;
    const propertyIdVariants = [...oids, ...oids.map((id) => id.toString())];

    const matches = await this.matchModel
      .find({
        tenantId: { $in: [new Types.ObjectId(tenantId), tenantId] },
        propertyId: { $in: propertyIdVariants },
        status: {
          $nin: [MatchStatus.Dismissed, MatchStatus.Archived, MatchStatus.Closed],
        },
      })
      .select(
        "propertyId routeAccessStatus routeOriginLat routeOriginLng routeAccessExpiresAt updatedAt"
      )
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const rankRouteAccess = (candidate: {
      routeAccessStatus: RouteAccessStatus;
      routeAccessExpiresAt?: Date;
    }) => {
      if (candidate.routeAccessStatus === RouteAccessStatus.Approved) return 3;
      if (candidate.routeAccessStatus === RouteAccessStatus.Pending) return 2;
      if (candidate.routeAccessStatus === RouteAccessStatus.Denied) return 1;
      return 0;
    };

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
      const normalizedStatus = isActiveApproval
        ? RouteAccessStatus.Approved
        : ((match.routeAccessStatus as RouteAccessStatus) === RouteAccessStatus.Approved
            ? RouteAccessStatus.None
            : (match.routeAccessStatus as RouteAccessStatus) ?? RouteAccessStatus.None);
      const candidate = {
        routeAccessStatus: normalizedStatus,
        routeOriginLat:
          isActiveApproval &&
          typeof match.routeOriginLat === "number" &&
          Number.isFinite(match.routeOriginLat)
            ? match.routeOriginLat
            : undefined,
        routeOriginLng:
          isActiveApproval &&
          typeof match.routeOriginLng === "number" &&
          Number.isFinite(match.routeOriginLng)
            ? match.routeOriginLng
            : undefined,
        routeAccessExpiresAt: isActiveApproval ? expiresAt : undefined,
      };
      const current = map.get(propertyId);
      if (!current || rankRouteAccess(candidate) > rankRouteAccess(current)) {
        map.set(propertyId, candidate);
      }
    });
    return map;
  }

  private async excludeOrphanedProperties(properties: Array<Record<string, any>>) {
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
      .find({ _id: { $in: landlordIds }, role: { $in: [UserRole.Landlord, UserRole.Organisation] } })
      .select("_id")
      .lean();
    const validSet = new Set(validLandlords.map((user) => user._id.toString()));

    const keep: Array<Record<string, any>> = [];
    properties.forEach((property) => {
      const ownerId = property.landlordId?.toString?.() ?? "";
      if (ownerId && validSet.has(ownerId)) {
        keep.push(property);
      }
    });

    return keep;
  }

  private toPublicExploreProperty(property: Record<string, any>) {
    const safeAddress = property.address
      ? {
          ...property.address,
          street: undefined,
        }
      : property.address;

    return {
      ...property,
      address: safeAddress,
      publicLocationLabel: buildPublicLocationLabel({
        neighborhood: property.neighborhood,
        address: property.address,
      }),
    };
  }
}
