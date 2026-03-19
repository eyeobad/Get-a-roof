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
exports.MatchesController = void 0;
const common_1 = require("@nestjs/common");
const matches_service_1 = require("./matches.service");
const create_match_dto_1 = require("./dto/create-match.dto");
const update_match_dto_1 = require("./dto/update-match.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_decorator_1 = require("../common/guards/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const enums_1 = require("../common/enums");
let MatchesController = class MatchesController {
    constructor(matchesService) {
        this.matchesService = matchesService;
    }
    create(dto, req) {
        dto.tenantId = req.user?.sub;
        return this.matchesService.createMatch(dto);
    }
    getTenantMatches(req, page, limit) {
        return this.matchesService.getTenantMatches(req.user?.sub, { page, limit });
    }
    getRecycledMatches(req, page, limit, cooldownDays) {
        return this.matchesService.getRecyclableMatches(req.user?.sub, {
            page,
            limit,
            cooldownDays,
        });
    }
    recycleMatch(id, req) {
        return this.matchesService.recycleDismissedMatch(id, req.user?.sub);
    }
    recycleBulk(body, req) {
        return this.matchesService.recycleDismissedMatchesBulk(body.matchIds, req.user?.sub);
    }
    hardBlock(id, req) {
        return this.matchesService.hardBlockMatch(id, req.user?.sub);
    }
    deleteMatch(id, req) {
        return this.matchesService.deleteMatch(id, req.user?.sub);
    }
    archiveMatch(id, req) {
        return this.matchesService.archiveMatch(id, req.user?.sub);
    }
    update(id, dto, req) {
        return this.matchesService.updateMatchForLandlord(id, dto, req.user?.sub);
    }
};
exports.MatchesController = MatchesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_match_dto_1.CreateMatchDto, Object]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("tenant"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("page", new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)("limit", new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "getTenantMatches", null);
__decorate([
    (0, common_1.Get)("tenant/recycled"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("page", new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)("limit", new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)("cooldownDays", new common_1.DefaultValuePipe(14), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "getRecycledMatches", null);
__decorate([
    (0, common_1.Post)(":id/recycle"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "recycleMatch", null);
__decorate([
    (0, common_1.Post)("recycle-bulk"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "recycleBulk", null);
__decorate([
    (0, common_1.Post)(":id/hard-block"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "hardBlock", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "deleteMatch", null);
__decorate([
    (0, common_1.Patch)(":id/archive"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Tenant),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "archiveMatch", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.Landlord, enums_1.UserRole.Organisation),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_match_dto_1.UpdateMatchDto, Object]),
    __metadata("design:returntype", void 0)
], MatchesController.prototype, "update", null);
exports.MatchesController = MatchesController = __decorate([
    (0, common_1.Controller)("api/matches"),
    __metadata("design:paramtypes", [matches_service_1.MatchesService])
], MatchesController);
