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
let PropertiesService = class PropertiesService {
    constructor(propertyModel, matchModel, userModel, usersService, appwriteStorage) {
        this.propertyModel = propertyModel;
        this.matchModel = matchModel;
        this.userModel = userModel;
        this.usersService = usersService;
        this.appwriteStorage = appwriteStorage;
    }
    async createProperty(dto) {
        if (!dto.landlordId || !mongoose_2.Types.ObjectId.isValid(dto.landlordId)) {
            throw new common_1.BadRequestException("Invalid landlordId");
        }
        const landlord = await this.userModel.findById(dto.landlordId).select("role").lean();
        if (!landlord || landlord.role !== enums_1.UserRole.Landlord) {
            throw new common_1.BadRequestException("Property must be tied to a valid landlord account");
        }
        const normalized = this.normalizePropertyPayload(dto);
        const created = new this.propertyModel(normalized);
        return created.save();
    }
    async updateProperty(id, dto) {
        const normalized = this.normalizePropertyPayload(dto);
        const updated = await this.propertyModel
            .findByIdAndUpdate(id, normalized, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException("Property not found");
        }
        return updated;
    }
    async getProperty(id) {
        const property = await this.propertyModel.findById(id).exec();
        if (!property) {
            throw new common_1.NotFoundException("Property not found");
        }
        const landlordExists = await this.userModel
            .exists({ _id: property.landlordId, role: enums_1.UserRole.Landlord });
        if (!landlordExists) {
            await this.propertyModel.deleteOne({ _id: property._id });
            throw new common_1.NotFoundException("Property not found");
        }
        return property;
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
        const properties = await this.propertyModel.find(queryFilters).limit(limit).exec();
        const validProperties = await this.removeOrphanedProperties(properties);
        return this.applyScoringAndFilters(validProperties, options);
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
        const properties = await this.propertyModel
            .find(withCoords)
            .limit(limit)
            .exec();
        const validProperties = await this.removeOrphanedProperties(properties);
        const results = await this.applyScoringAndFilters(validProperties, options);
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
        const filters = { landlordId };
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
        }
        else if (options?.sort === "priceDesc") {
            query = query.sort({ monthlyPrice: -1 });
        }
        else {
            query = query.sort({ updatedAt: -1 });
        }
        return query.exec();
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
        return normalized;
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
        const tenantDistance = tenantPreferences?.maxCommuteRadius !== undefined
            ? tenantPreferences.maxCommuteRadius * 1.60934
            : undefined;
        const distanceLimit = baseCoords ? options?.distanceKm ?? tenantDistance : undefined;
        const scored = properties.map((property) => {
            const plain = property.toObject();
            const matchInput = {
                propertyType: plain.propertyType,
                monthlyPrice: plain.monthlyPrice,
                petFriendly: plain.petFriendly,
                landlordRequirements: plain.landlordRequirements,
            };
            const match = tenantPreferences
                ? (0, match_utils_1.computeMatchScore)(tenantPreferences, matchInput)
                : {
                    preferencesMatchPercentage: 0,
                    apartmentPreferenceMatchPercentage: 0,
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
        });
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
        if (!tenantId) {
            return [];
        }
        const filter = {};
        if (mongoose_2.Types.ObjectId.isValid(tenantId)) {
            const tenantObjectId = new mongoose_2.Types.ObjectId(tenantId);
            filter.$or = [{ tenantId }, { tenantId: tenantObjectId }];
        }
        else {
            filter.tenantId = tenantId;
        }
        if (!includeDismissed) {
            filter.status = { $ne: enums_1.MatchStatus.Dismissed };
        }
        return this.matchModel.find(filter).distinct("propertyId").exec();
    }
    async removeOrphanedProperties(properties) {
        if (!properties.length)
            return properties;
        const landlordIds = Array.from(new Set(properties
            .map((property) => property.landlordId?.toString?.() ?? "")
            .filter(Boolean)));
        if (!landlordIds.length)
            return [];
        const validLandlords = await this.userModel
            .find({ _id: { $in: landlordIds }, role: enums_1.UserRole.Landlord })
            .select("_id")
            .lean();
        const validSet = new Set(validLandlords.map((user) => user._id.toString()));
        const keep = [];
        const orphanIds = [];
        properties.forEach((property) => {
            const ownerId = property.landlordId?.toString?.() ?? "";
            if (ownerId && validSet.has(ownerId)) {
                keep.push(property);
            }
            else {
                orphanIds.push(property._id);
            }
        });
        if (orphanIds.length) {
            await this.propertyModel.deleteMany({ _id: { $in: orphanIds } });
            await this.matchModel.deleteMany({ propertyId: { $in: orphanIds } });
        }
        return keep;
    }
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __param(1, (0, mongoose_1.InjectModel)(match_schema_1.Match.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        appwrite_service_1.AppwriteStorageService])
], PropertiesService);
