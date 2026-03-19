"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const property_schema_1 = require("./schemas/property.schema");
const users_service_1 = require("../users/users.service");
const match_utils_1 = require("../common/utils/match.utils");
const geo_utils_1 = require("../common/utils/geo.utils");
const match_helpers_1 = require("../common/utils/match.helpers");
const match_schema_1 = require("../matches/schemas/match.schema");
const enums_1 = require("../common/enums");
const property_utils_1 = require("../common/utils/property.utils");
const appwrite_service_1 = require("../appwrite/appwrite.service");
const user_schema_1 = require("../users/schemas/user.schema");
const message_schema_1 = require("../chat/schemas/message.schema");
const workspace_service_1 = require("../common/services/workspace.service");
const fingerprint_utils_1 = require("./utils/fingerprint.utils");
const query_cache_1 = require("./utils/query-cache");
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
const exploreQueryCache = new query_cache_1.QueryCache(500, 30_000);
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
const buildPublicLocationLabel = (property) => [property.neighborhood, property.address?.city].filter(Boolean).join(", ") ||
    [property.address?.city, property.address?.state].filter(Boolean).join(", ");
let PropertiesService = class PropertiesService {
    constructor(propertyModel, matchModel, userModel, messageModel, usersService, appwriteStorage, workspaceService) {
        this.propertyModel = propertyModel;
        this.matchModel = matchModel;
        this.userModel = userModel;
        this.messageModel = messageModel;
        this.usersService = usersService;
        this.appwriteStorage = appwriteStorage;
        this.workspaceService = workspaceService;
    }
    async createProperty(dto) {
        if (!dto.landlordId || !mongoose_2.Types.ObjectId.isValid(dto.landlordId)) {
            throw new common_1.BadRequestException("Invalid landlordId");
        }
        const actor = await this.userModel
            .findById(dto.landlordId)
            .select("role agentOrgId")
            .lean()
            .exec();
        if (!actor ||
            (actor.role !== enums_1.UserRole.Landlord &&
                actor.role !== enums_1.UserRole.Organisation)) {
            throw new common_1.BadRequestException("Invalid owner");
        }
        const actorContext = await this.workspaceService.getWorkspaceActorContext(dto.landlordId);
        const ownerKind = actorContext.scope === "agent" ? "agent" : "owner";
        const orgId = actorContext.orgId
            ? new mongoose_2.Types.ObjectId(actorContext.orgId)
            : undefined;
        const normalized = this.normalizePropertyPayload(dto);
        const fingerprintHash = (0, fingerprint_utils_1.computePropertyFingerprint)(normalized);
        const ownerIdentity = (orgId ?? new mongoose_2.Types.ObjectId(dto.landlordId)).toString();
        let duplicateCandidates = [];
        if (fingerprintHash) {
            duplicateCandidates = await this.propertyModel
                .find({
                fingerprintHash,
                status: { $in: [enums_1.PropertyStatus.Draft, enums_1.PropertyStatus.Listed] },
            })
                .sort({ createdAt: 1 })
                .limit(10)
                .exec();
            const sameOwnerDuplicate = duplicateCandidates.find((candidate) => this.resolveOwnerIdentity(candidate) === ownerIdentity);
            if (sameOwnerDuplicate) {
                if (!dto.duplicateAction) {
                    throw new common_1.ConflictException({
                        errorCode: "DUPLICATE_LISTING",
                        ownershipType: "same_owner",
                        message: "Similar listing already exists. Choose to increase units or create a new draft.",
                        canonicalHint: {
                            existingListingId: sameOwnerDuplicate._id?.toString?.(),
                            availableUnits: sameOwnerDuplicate.availableUnits ?? 1,
                            actions: ["increment_units", "create_new_draft"],
                        },
                    });
                }
                if (dto.duplicateAction === "create_new_draft") {
                    normalized.status = enums_1.PropertyStatus.Draft;
                    normalized.moderationStatus = "Pending";
                    normalized.moderationReason =
                        "Potential duplicate detected. Manual review required.";
                }
                else {
                    const incrementBy = typeof normalized.availableUnits === "number" &&
                        Number.isFinite(normalized.availableUnits) &&
                        normalized.availableUnits > 0
                        ? Math.floor(normalized.availableUnits)
                        : 1;
                    const updated = await this.propertyModel
                        .findByIdAndUpdate(sameOwnerDuplicate._id, { $inc: { availableUnits: incrementBy } }, { new: true })
                        .exec();
                    if (!updated) {
                        throw new common_1.NotFoundException("Property not found");
                    }
                    exploreQueryCache.clear();
                    return updated;
                }
            }
        }
        const duplicateFromAnotherOwner = duplicateCandidates.find((candidate) => this.resolveOwnerIdentity(candidate) !== ownerIdentity);
        let dedupeBucketId;
        if (fingerprintHash) {
            dedupeBucketId =
                duplicateFromAnotherOwner?.dedupeBucketId ?? new mongoose_2.Types.ObjectId().toHexString();
            if (duplicateFromAnotherOwner &&
                !duplicateFromAnotherOwner.dedupeBucketId) {
                await this.propertyModel
                    .updateOne({ _id: duplicateFromAnotherOwner._id }, { $set: { dedupeBucketId } })
                    .exec();
            }
        }
        const created = new this.propertyModel({
            ...normalized,
            landlordId: new mongoose_2.Types.ObjectId(dto.landlordId),
            ownerKind,
            fingerprintHash,
            dedupeBucketId,
            ...(duplicateFromAnotherOwner
                ? {
                    status: enums_1.PropertyStatus.Draft,
                    moderationStatus: "Pending",
                    moderationReason: "Potential duplicate across different accounts. Review required.",
                }
                : {}),
            ...(orgId ? { orgId } : {}),
        });
        const saved = await created.save();
        exploreQueryCache.clear();
        if (duplicateFromAnotherOwner) {
            throw new common_1.ConflictException({
                errorCode: "DUPLICATE_LISTING",
                ownershipType: "different_owner",
                message: "A similar listing exists under another owner. Your listing was saved as draft for review.",
                dedupeBucketId,
                draftCreated: true,
                draftId: saved._id?.toString?.(),
            });
        }
        return saved;
    }
    async updateProperty(id, dto) {
        const current = await this.propertyModel.findById(id).exec();
        if (!current) {
            throw new common_1.NotFoundException("Property not found");
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
        const fingerprintHash = (0, fingerprint_utils_1.computePropertyFingerprint)(nextForFingerprint);
        const ownerIdentity = this.resolveOwnerIdentity(current);
        const duplicateFromAnotherOwner = fingerprintHash
            ? await this.propertyModel
                .findOne({
                _id: { $ne: current._id },
                fingerprintHash,
                status: { $in: [enums_1.PropertyStatus.Draft, enums_1.PropertyStatus.Listed] },
            })
                .sort({ createdAt: 1 })
                .exec()
            : null;
        const dedupeBucketId = duplicateFromAnotherOwner &&
            this.resolveOwnerIdentity(duplicateFromAnotherOwner) !== ownerIdentity
            ? duplicateFromAnotherOwner.dedupeBucketId ?? new mongoose_2.Types.ObjectId().toHexString()
            : current.dedupeBucketId;
        if (duplicateFromAnotherOwner && !duplicateFromAnotherOwner.dedupeBucketId) {
            await this.propertyModel
                .updateOne({ _id: duplicateFromAnotherOwner._id }, { $set: { dedupeBucketId } })
                .exec();
        }
        const updated = await this.propertyModel
            .findByIdAndUpdate(id, {
            ...normalized,
            fingerprintHash,
            dedupeBucketId,
        }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException("Property not found");
        }
        exploreQueryCache.clear();
        return updated;
    }
    async getProperty(id) {
        const property = await this.propertyModel.findById(id).exec();
        if (!property) {
            throw new common_1.NotFoundException("Property not found");
        }
        return property;
    }
    async assertPropertyMutationAccess(propertyId, actorId) {
        const property = await this.getProperty(propertyId);
        await this.workspaceService.assertCanManageProperty(actorId, property);
        return property;
    }
    async getPropertyForViewer(id, userId) {
        const property = await this.getProperty(id);
        const base = property.toObject();
        if (!userId) {
            return base;
        }
        const routeAccessMap = await this.getTenantRouteAccessMap(userId, [property._id]);
        const routeAccess = routeAccessMap.get(property._id.toString());
        return {
            ...base,
            ...(routeAccess ?? { routeAccessStatus: enums_1.RouteAccessStatus.None }),
        };
    }
    async exploreProperties(filters, options) {
        const limit = options?.limit ?? 50;
        const queryFilters = { ...filters };
        if (options?.userId) {
            const excludedIds = await this.getTenantMatchPropertyIds(options.userId, true);
            if (excludedIds.length) {
                if (queryFilters._id && typeof queryFilters._id === "object") {
                    queryFilters._id.$nin = excludedIds;
                }
                else {
                    queryFilters._id = { $nin: excludedIds };
                }
            }
        }
        const cacheKey = `explore:${(0, query_cache_1.stableStringify)({
            queryFilters,
            options,
            limit,
        })}`;
        const cached = exploreQueryCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const properties = await this.propertyModel
            .find(queryFilters, exploreProjection)
            .limit(limit)
            .lean()
            .exec();
        const validProperties = await this.excludeOrphanedProperties(properties);
        const result = (await this.applyScoringAndFilters(validProperties, options)).map((property) => this.toPublicExploreProperty(property));
        exploreQueryCache.set(cacheKey, result);
        return result;
    }
    async getMapMatches(filters, options) {
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
            withCoords._id.$in = matchIds;
        }
        else {
            withCoords._id = { $in: matchIds };
        }
        const limit = options?.limit ?? 50;
        const cacheKey = `map:${(0, query_cache_1.stableStringify)({
            withCoords,
            options,
            limit,
        })}`;
        const cached = exploreQueryCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const properties = await this.propertyModel
            .find(withCoords, exploreProjection)
            .limit(limit)
            .lean()
            .exec();
        const validProperties = await this.excludeOrphanedProperties(properties);
        const results = await this.applyScoringAndFilters(validProperties, options);
        const routeAccessMap = await this.getTenantRouteAccessMap(options?.userId, results.map((property) => property._id));
        const mapped = results.map((property) => ({
            ...this.toPublicExploreProperty(property),
            ...(routeAccessMap.get(property._id?.toString?.() ?? String(property._id)) ?? {
                routeAccessStatus: enums_1.RouteAccessStatus.None,
            }),
        }));
        exploreQueryCache.set(cacheKey, mapped);
        return mapped;
    }
    async uploadImage(file) {
        return this.uploadToAppwrite(file, propertyImageMimeTypes);
    }
    async uploadProof(file) {
        return this.uploadToAppwrite(file, propertyProofMimeTypes);
    }
    async uploadToAppwrite(file, allowedTypes) {
        if (!file) {
            throw new common_1.BadRequestException("File is required");
        }
        if (allowedTypes && (!file.mimetype || !allowedTypes.has(file.mimetype))) {
            throw new common_1.BadRequestException("Unsupported file type");
        }
        const result = await this.appwriteStorage.uploadFile(file.originalname ?? file.filename ?? `property-${Date.now()}`, file.buffer, file.mimetype ?? "image/jpeg");
        if (!result?.url) {
            throw new common_1.BadRequestException("Unable to upload file");
        }
        return { url: result.url };
    }
    async getLandlordProperties(landlordId, options) {
        const workspaceFilters = await this.workspaceService.getPropertyWorkspaceFilter(landlordId, options?.scope);
        const clauses = [workspaceFilters];
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
        }
        else if (options?.sort === "priceDesc") {
            query = query.sort({ monthlyPrice: -1 });
        }
        else {
            query = query.sort({ updatedAt: -1 });
        }
        return query.exec();
    }
    async deletePropertyForLandlord(landlordId, propertyId) {
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
    normalizePropertyPayload(dto) {
        const normalized = { ...dto };
        if (normalized.location && !normalized.address) {
            normalized.address = { street: normalized.location };
        }
        delete normalized.location;
        if (normalized.propertyType) {
            normalized.propertyType =
                (0, property_utils_1.normalizePropertyType)(normalized.propertyType) ?? normalized.propertyType;
        }
        if (normalized.availableUnits !== undefined) {
            const units = Number(normalized.availableUnits);
            if (Number.isFinite(units) && units > 0) {
                normalized.availableUnits = Math.floor(units);
            }
            else {
                delete normalized.availableUnits;
            }
        }
        delete normalized.duplicateAction;
        return normalized;
    }
    resolveOwnerIdentity(property) {
        return (property.orgId ?? property.landlordId)?.toString() ?? "";
    }
    async applyScoringAndFilters(properties, options) {
        let tenantPreferences;
        if (options?.userId) {
            const user = await this.usersService.findById(options.userId);
            tenantPreferences = user.preferences?.tenant;
        }
        const baseCoords = options?.lat !== undefined && options?.lng !== undefined
            ? { lat: options.lat, lng: options.lng }
            : undefined;
        const preferredDistance = typeof tenantPreferences?.preferredDistance === "number" &&
            Number.isFinite(tenantPreferences.preferredDistance)
            ? tenantPreferences.preferredDistance
            : undefined;
        const preferredState = typeof tenantPreferences?.preferredState === "string"
            ? tenantPreferences.preferredState.trim().toLowerCase()
            : "";
        const tenantDistance = tenantPreferences?.maxCommuteRadius !== undefined
            ? tenantPreferences.maxCommuteRadius * 1.60934
            : undefined;
        const distanceLimit = baseCoords
            ? options?.distanceKm ?? preferredDistance ?? tenantDistance
            : undefined;
        const shouldFilterState = Boolean(preferredState);
        const scored = properties
            .map((property) => {
            const plain = property;
            const listingState = typeof plain.address?.state === "string"
                ? plain.address.state.trim().toLowerCase()
                : "";
            if (shouldFilterState && listingState !== preferredState) {
                return null;
            }
            const matchInput = {
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
                ? (0, match_utils_1.computeMatchScore)(tenantInput, matchInput)
                : {
                    preferencesMatchPercentage: 0,
                    apartmentPreferenceMatchPercentage: 0,
                    locationScore: 0,
                    amenityScore: 0,
                    affordabilityScore: 0,
                    matchScore: 0,
                };
            let distanceKm;
            if (baseCoords &&
                plain.address?.lat !== undefined &&
                plain.address?.lng !== undefined) {
                distanceKm = (0, geo_utils_1.haversineDistanceKm)(baseCoords, {
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
            .filter((property) => property !== null);
        let filtered = scored;
        if (distanceLimit !== undefined) {
            filtered = filtered.filter((property) => property.distanceKm !== undefined &&
                property.distanceKm <= distanceLimit);
        }
        if (tenantPreferences?.petFriendlyRequired) {
            filtered = filtered.filter((property) => property.petFriendly === true);
        }
        const minMatchScore = (0, match_helpers_1.toNumber)(options?.minMatchScore);
        if (minMatchScore !== undefined) {
            filtered = filtered.filter((property) => property.matchScore >= minMatchScore);
        }
        return filtered;
    }
    async getTenantMatchPropertyIds(tenantId, includeDismissed) {
        if (!tenantId || !mongoose_2.Types.ObjectId.isValid(tenantId)) {
            return [];
        }
        const filter = {
            tenantId: new mongoose_2.Types.ObjectId(tenantId),
        };
        if (!includeDismissed) {
            filter.status = {
                $nin: [enums_1.MatchStatus.Dismissed, enums_1.MatchStatus.Archived, enums_1.MatchStatus.Closed],
            };
        }
        return this.matchModel.find(filter).distinct("propertyId").exec();
    }
    async getTenantRouteAccessMap(tenantId, propertyIds) {
        const map = new Map();
        if (!tenantId || !mongoose_2.Types.ObjectId.isValid(tenantId) || !propertyIds.length)
            return map;
        const oids = propertyIds
            .map((id) => {
            const s = id?.toString?.() ?? String(id);
            return mongoose_2.Types.ObjectId.isValid(s) ? new mongoose_2.Types.ObjectId(s) : null;
        })
            .filter(Boolean);
        if (!oids.length)
            return map;
        const propertyIdVariants = [...oids, ...oids.map((id) => id.toString())];
        const matches = await this.matchModel
            .find({
            tenantId: { $in: [new mongoose_2.Types.ObjectId(tenantId), tenantId] },
            propertyId: { $in: propertyIdVariants },
            status: {
                $nin: [enums_1.MatchStatus.Dismissed, enums_1.MatchStatus.Archived, enums_1.MatchStatus.Closed],
            },
        })
            .select("propertyId routeAccessStatus routeOriginLat routeOriginLng routeAccessExpiresAt updatedAt")
            .sort({ updatedAt: -1 })
            .lean()
            .exec();
        const rankRouteAccess = (candidate) => {
            if (candidate.routeAccessStatus === enums_1.RouteAccessStatus.Approved)
                return 3;
            if (candidate.routeAccessStatus === enums_1.RouteAccessStatus.Pending)
                return 2;
            if (candidate.routeAccessStatus === enums_1.RouteAccessStatus.Denied)
                return 1;
            return 0;
        };
        matches.forEach((match) => {
            const propertyId = match.propertyId?.toString?.();
            if (!propertyId)
                return;
            const expiresAt = match.routeAccessExpiresAt
                ? new Date(match.routeAccessExpiresAt)
                : undefined;
            const isActiveApproval = match.routeAccessStatus === enums_1.RouteAccessStatus.Approved &&
                !!expiresAt &&
                Number.isFinite(expiresAt.getTime()) &&
                expiresAt.getTime() > Date.now();
            const normalizedStatus = isActiveApproval
                ? enums_1.RouteAccessStatus.Approved
                : (match.routeAccessStatus === enums_1.RouteAccessStatus.Approved
                    ? enums_1.RouteAccessStatus.None
                    : match.routeAccessStatus ?? enums_1.RouteAccessStatus.None);
            const candidate = {
                routeAccessStatus: normalizedStatus,
                routeOriginLat: isActiveApproval &&
                    typeof match.routeOriginLat === "number" &&
                    Number.isFinite(match.routeOriginLat)
                    ? match.routeOriginLat
                    : undefined,
                routeOriginLng: isActiveApproval &&
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
    async excludeOrphanedProperties(properties) {
        if (!properties.length)
            return properties;
        const landlordIds = Array.from(new Set(properties
            .map((property) => property.landlordId?.toString?.() ?? "")
            .filter(Boolean)));
        if (!landlordIds.length)
            return [];
        const validLandlords = await this.userModel
            .find({ _id: { $in: landlordIds }, role: { $in: [enums_1.UserRole.Landlord, enums_1.UserRole.Organisation] } })
            .select("_id")
            .lean();
        const validSet = new Set(validLandlords.map((user) => user._id.toString()));
        const keep = [];
        properties.forEach((property) => {
            const ownerId = property.landlordId?.toString?.() ?? "";
            if (ownerId && validSet.has(ownerId)) {
                keep.push(property);
            }
        });
        return keep;
    }
    toPublicExploreProperty(property) {
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
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __param(1, (0, mongoose_1.InjectModel)(match_schema_1.Match.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(3, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        appwrite_service_1.AppwriteStorageService,
        workspace_service_1.WorkspaceService])
], PropertiesService);
