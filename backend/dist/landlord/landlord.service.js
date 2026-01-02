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
let LandlordService = class LandlordService {
    constructor(propertiesService, matchesService) {
        this.propertiesService = propertiesService;
        this.matchesService = matchesService;
    }
    async getLandlordProperties(landlordId) {
        return this.propertiesService.getLandlordProperties(landlordId);
    }
    async getNewMatchesCount(propertyId) {
        const count = await this.matchesService.countByProperty(propertyId);
        return { propertyId, newMatchesCount: count };
    }
    async getPropertiesWithMatches(landlordId) {
        const properties = await this.propertiesService.getLandlordProperties(landlordId);
        const propertyIds = properties.map((property) => property.id);
        if (!propertyIds.length) {
            return [];
        }
        const matchedIds = await this.matchesService.findPropertyIdsWithMatches(propertyIds);
        const matchedSet = new Set(matchedIds.map((id) => id.toString()));
        const results = [];
        for (const property of properties) {
            if (matchedSet.has(property.id)) {
                const count = await this.matchesService.countByProperty(property.id);
                results.push({ ...property.toObject(), matchCount: count });
            }
        }
        return results;
    }
    async getPropertyMatches(propertyId) {
        return this.matchesService.findByProperty(propertyId);
    }
};
exports.LandlordService = LandlordService;
exports.LandlordService = LandlordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [properties_service_1.PropertiesService,
        matches_service_1.MatchesService])
], LandlordService);
//# sourceMappingURL=landlord.service.js.map