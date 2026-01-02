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
exports.LandlordController = void 0;
const common_1 = require("@nestjs/common");
const landlord_service_1 = require("./landlord.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/guards/roles.decorator");
const enums_1 = require("../common/enums");
let LandlordController = class LandlordController {
    constructor(landlordService) {
        this.landlordService = landlordService;
    }
    getProperties(id, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.landlordService.getLandlordProperties(id);
    }
    getNewMatchesCount(id, propertyId, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.landlordService.getNewMatchesCount(propertyId);
    }
    getPropertiesWithMatches(id, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.landlordService.getPropertiesWithMatches(id);
    }
    getPropertyMatches(id, propertyId, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.landlordService.getPropertyMatches(propertyId);
    }
};
exports.LandlordController = LandlordController;
__decorate([
    (0, common_1.Get)(":id/properties"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Landlord),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LandlordController.prototype, "getProperties", null);
__decorate([
    (0, common_1.Get)(":id/properties/:propertyId/new-matches-count"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Landlord),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("propertyId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LandlordController.prototype, "getNewMatchesCount", null);
__decorate([
    (0, common_1.Get)(":id/properties-with-matches"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Landlord),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LandlordController.prototype, "getPropertiesWithMatches", null);
__decorate([
    (0, common_1.Get)(":id/properties/:propertyId/matches"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Landlord),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("propertyId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LandlordController.prototype, "getPropertyMatches", null);
exports.LandlordController = LandlordController = __decorate([
    (0, common_1.Controller)("api/landlord"),
    __metadata("design:paramtypes", [landlord_service_1.LandlordService])
], LandlordController);
//# sourceMappingURL=landlord.controller.js.map