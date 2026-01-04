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
exports.PropertiesController = void 0;
const common_1 = require("@nestjs/common");
const properties_service_1 = require("./properties.service");
const create_property_dto_1 = require("./dto/create-property.dto");
const update_property_dto_1 = require("./dto/update-property.dto");
const match_helpers_1 = require("../common/utils/match.helpers");
const enums_1 = require("../common/enums");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_decorator_1 = require("../common/guards/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const enums_2 = require("../common/enums");
let PropertiesController = class PropertiesController {
    constructor(propertiesService) {
        this.propertiesService = propertiesService;
    }
    uploadImage(body) {
        return this.propertiesService.uploadImageStub(body?.fileName);
    }
    create(dto, req) {
        dto.landlordId = req.user?.sub;
        return this.propertiesService.createProperty(dto);
    }
    async update(id, dto, req) {
        const property = await this.propertiesService.getProperty(id);
        if (property.landlordId.toString() !== req.user?.sub) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.propertiesService.updateProperty(id, dto);
    }
    explore(query, req) {
        const filters = this.buildFilters(query);
        const options = this.buildOptions(query);
        options.userId = req.user?.sub;
        return this.propertiesService.exploreProperties(filters, options);
    }
    matchesMap(query, req) {
        const filters = this.buildFilters(query);
        const options = this.buildOptions(query);
        options.userId = req.user?.sub;
        return this.propertiesService.getMapMatches(filters, options);
    }
    findOne(id) {
        return this.propertiesService.getProperty(id);
    }
    buildFilters(query) {
        const filters = {};
        const propertyTypes = new Set();
        if (query.minPrice || query.maxPrice || query.budget) {
            filters.monthlyPrice = {};
            if (query.minPrice) {
                filters.monthlyPrice.$gte = Number(query.minPrice);
            }
            if (query.maxPrice) {
                filters.monthlyPrice.$lte = Number(query.maxPrice);
            }
            if (query.budget) {
                filters.monthlyPrice.$lte = Number(query.budget);
            }
        }
        if (query.propertyType || query.lookingFor) {
            const types = (query.propertyType || query.lookingFor || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
            types.forEach((type) => propertyTypes.add(type));
        }
        const toggleMap = {
            selfCompound: "SelfCompound",
            shortlets: "Shortlet",
            sharedCompound: "SharedCompound",
            nonOwner: "NonOwnerOccupied",
            nonOwnerOccupied: "NonOwnerOccupied",
            sharedApartment: "SharedApartment",
        };
        Object.entries(toggleMap).forEach(([key, value]) => {
            if (query[key] === "true") {
                propertyTypes.add(value);
            }
        });
        if (propertyTypes.size) {
            filters.propertyType = { $in: Array.from(propertyTypes) };
        }
        if (query.apartmentType) {
            const type = query.apartmentType;
            if (type === "two") {
                filters.bedCount = 2;
            }
            else if (type === "threePlus") {
                filters.bedCount = { $gte: 3 };
            }
            else if (type === "fourPlus") {
                filters.bedCount = { $gte: 4 };
            }
            else if (type === "singleRoom" || type === "miniflat" || type === "studio1") {
                filters.bedCount = { $lte: 1 };
            }
            else if (type === "duplex") {
                filters.propertyType = { $in: ["House", "Townhouse"] };
            }
        }
        if (query.minBeds || query.maxBeds) {
            if (typeof filters.bedCount === "number") {
                filters.bedCount = { $eq: filters.bedCount };
            }
            else {
                filters.bedCount = filters.bedCount ?? {};
            }
            if (query.minBeds) {
                filters.bedCount.$gte = Number(query.minBeds);
            }
            if (query.maxBeds) {
                filters.bedCount.$lte = Number(query.maxBeds);
            }
        }
        if (query.status) {
            filters.status = query.status;
        }
        else {
            filters.status = enums_1.PropertyStatus.Listed;
        }
        if (query.petFriendly) {
            filters.petFriendly = query.petFriendly === "true";
        }
        if (query.landlordId) {
            filters.landlordId = query.landlordId;
        }
        return filters;
    }
    buildOptions(query) {
        const lat = (0, match_helpers_1.toNumber)(query.lat);
        const lng = (0, match_helpers_1.toNumber)(query.lng);
        const distanceKm = (0, match_helpers_1.toNumber)(query.distanceKm || query.distance);
        const minMatchScore = (0, match_helpers_1.toNumber)(query.minMatchScore);
        const limit = (0, match_helpers_1.toNumber)(query.limit);
        return {
            userId: query.userId,
            lat,
            lng,
            distanceKm,
            minMatchScore,
            limit,
        };
    }
};
exports.PropertiesController = PropertiesController;
__decorate([
    (0, common_1.Post)("upload-image"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_2.UserRole.Landlord),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_2.UserRole.Landlord),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_property_dto_1.CreatePropertyDto, Object]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_2.UserRole.Landlord),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_property_dto_1.UpdatePropertyDto, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "update", null);
__decorate([
    (0, common_1.Get)("explore"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "explore", null);
__decorate([
    (0, common_1.Get)("matches/map"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "matchesMap", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "findOne", null);
exports.PropertiesController = PropertiesController = __decorate([
    (0, common_1.Controller)("api/properties"),
    __metadata("design:paramtypes", [properties_service_1.PropertiesService])
], PropertiesController);
//# sourceMappingURL=properties.controller.js.map