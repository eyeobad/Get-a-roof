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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandlordService = void 0;
const common_1 = require("@nestjs/common");
const properties_service_1 = require("../properties/properties.service");
const matches_service_1 = require("../matches/matches.service");
const users_service_1 = require("../users/users.service");
let LandlordService = class LandlordService {
    constructor(propertiesService, matchesService, usersService) {
        this.propertiesService = propertiesService;
        this.matchesService = matchesService;
        this.usersService = usersService;
    }
    async getLandlordProperties(landlordId, options) {
        const properties = await this.propertiesService.getLandlordProperties(landlordId, options);
        const propertyIds = properties.map((property) => property.id);
        const counts = await this.matchesService.getMatchCountsByPropertyIds(propertyIds);
        const newCounts = await this.matchesService.getNewMatchCountsByPropertyIds(propertyIds);
        const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
        const newCountMap = new Map(newCounts.map((item) => [item._id.toString(), item.count]));
        const summaries = properties.map((property) => this.mapPropertySummary(property, countMap.get(property.id) ?? 0, newCountMap.get(property.id) ?? 0));
        return this.sortSummaries(summaries, options?.sort);
    }
    async getNewMatchesCount(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        const count = await this.matchesService.countNewByProperty(propertyId);
        return { propertyId, newMatchesCount: count };
    }
    async getPropertiesWithMatches(landlordId, options) {
        const properties = await this.propertiesService.getLandlordProperties(landlordId, options);
        const propertyIds = properties.map((property) => property.id);
        if (!propertyIds.length) {
            return [];
        }
        const matchedIds = await this.matchesService.findPropertyIdsWithMatches(propertyIds);
        const counts = await this.matchesService.getMatchCountsByPropertyIds(matchedIds.map((id) => id.toString()));
        const newCounts = await this.matchesService.getNewMatchCountsByPropertyIds(matchedIds.map((id) => id.toString()));
        const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
        const newCountMap = new Map(newCounts.map((item) => [item._id.toString(), item.count]));
        const summaries = properties
            .filter((property) => matchedIds.some((id) => id.toString() === property.id))
            .map((property) => this.mapPropertySummary(property, countMap.get(property.id) ?? 0, newCountMap.get(property.id) ?? 0));
        return this.sortSummaries(summaries, options?.sort);
    }
    async getPropertyMatches(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        return this.matchesService.getPropertyMatchesWithTenant(propertyId);
    }
    async getTenantProfile(landlordId, tenantId) {
        const properties = await this.propertiesService.getLandlordProperties(landlordId);
        const propertyIds = properties.map((property) => property.id);
        const hasMatch = await this.matchesService.landlordHasTenantMatch(propertyIds, tenantId);
        if (!hasMatch) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const tenant = await this.usersService.findById(tenantId);
        return this.usersService.sanitizeUser(tenant);
    }
    async markPropertyMatchesSeen(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        return this.matchesService.markMatchesSeenForProperty(propertyId);
    }
    async deleteProperty(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        return this.propertiesService.deletePropertyForLandlord(landlordId, propertyId);
    }
    async assertPropertyOwnership(landlordId, propertyId) {
        const property = await this.propertiesService.getProperty(propertyId);
        if (property.landlordId.toString() !== landlordId) {
            throw new common_1.ForbiddenException("Access denied");
        }
    }
    mapPropertySummary(property, matchCount, newCount) {
        const plain = property.toObject();
        const addressParts = [
            plain.address?.street,
            plain.address?.city,
            plain.address?.state,
        ].filter(Boolean);
        const title = addressParts.join(", ") ||
            plain.neighborhood ||
            "Untitled property";
        const area = plain.neighborhood ||
            [plain.address?.city, plain.address?.state]
                .filter(Boolean)
                .join(", ");
        return {
            ...plain,
            matchCount,
            matches: matchCount,
            newCount,
            title,
            area,
            type: plain.propertyType,
            price: plain.monthlyPrice,
            beds: plain.bedCount,
            baths: plain.bathCount,
            coverUrl: plain.images?.[0],
        };
    }
    sortSummaries(summaries, sort) {
        if (!sort) {
            return summaries;
        }
        if (sort === "matchesDesc") {
            return summaries.sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0));
        }
        if (sort === "matchesAsc") {
            return summaries.sort((a, b) => (a.matchCount ?? 0) - (b.matchCount ?? 0));
        }
        if (sort === "newDesc") {
            return summaries.sort((a, b) => (b.newCount ?? 0) - (a.newCount ?? 0));
        }
        if (sort === "newAsc") {
            return summaries.sort((a, b) => (a.newCount ?? 0) - (b.newCount ?? 0));
        }
        return summaries;
    }
};
exports.LandlordService = LandlordService;
exports.LandlordService = LandlordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [properties_service_1.PropertiesService,
        matches_service_1.MatchesService,
        users_service_1.UsersService])
], LandlordService);
