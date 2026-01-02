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
let PropertiesService = class PropertiesService {
    constructor(propertyModel, usersService) {
        this.propertyModel = propertyModel;
        this.usersService = usersService;
    }
    async createProperty(dto) {
        const created = new this.propertyModel(dto);
        return created.save();
    }
    async updateProperty(id, dto) {
        const updated = await this.propertyModel
            .findByIdAndUpdate(id, dto, { new: true })
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
        return property;
    }
    async exploreProperties(filters, options) {
        const limit = options?.limit ?? 50;
        const properties = await this.propertyModel.find(filters).limit(limit).exec();
        return this.applyScoringAndFilters(properties, options);
    }
    async getMapMatches(filters, options) {
        const withCoords = {
            ...filters,
            "address.lat": { $ne: null },
            "address.lng": { $ne: null },
        };
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
            images: property.images,
            matchScore: property.matchScore,
            preferencesMatchPercentage: property.preferencesMatchPercentage,
            apartmentPreferenceMatchPercentage: property.apartmentPreferenceMatchPercentage,
            distanceKm: property.distanceKm,
        }));
    }
    async uploadImageStub(fileName) {
        const slug = fileName ? fileName.replace(/\s+/g, "-") : "upload";
        const url = `https://example.com/uploads/${Date.now()}-${slug}`;
        return { url };
    }
    async getLandlordProperties(landlordId) {
        return this.propertyModel.find({ landlordId }).exec();
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
        const minMatchScore = (0, match_helpers_1.toNumber)(options?.minMatchScore);
        if (minMatchScore !== undefined) {
            filtered = filtered.filter((property) => property.matchScore >= minMatchScore);
        }
        return filtered;
    }
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService])
], PropertiesService);
//# sourceMappingURL=properties.service.js.map