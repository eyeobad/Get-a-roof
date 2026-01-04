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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const update_preferences_dto_1 = require("./dto/update-preferences.dto");
const save_property_dto_1 = require("./dto/save-property.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    create(dto) {
        return this.usersService.createUser(dto).then((user) => this.usersService.sanitizeUser(user));
    }
    findOne(id, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.usersService.findById(id).then((user) => this.usersService.sanitizeUser(user));
    }
    update(id, dto, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.usersService.updateUser(id, dto).then((user) => this.usersService.sanitizeUser(user));
    }
    updatePreferences(id, dto, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.usersService.updatePreferences(id, dto).then((user) => this.usersService.sanitizeUser(user));
    }
    saveProperty(id, dto, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.usersService.addSavedProperty(id, dto.propertyId).then((user) => this.usersService.sanitizeUser(user));
    }
    getSavedProperties(id, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.usersService.getSavedProperties(id);
    }
    async getVerificationStatus(id, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const user = await this.usersService.findById(id);
        return {
            isVerified: user.isVerified,
            verificationStatus: user.verificationStatus,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(":id/preferences"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_preferences_dto_1.UpdatePreferencesDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Post)(":id/saved-properties"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_property_dto_1.SavePropertyDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "saveProperty", null);
__decorate([
    (0, common_1.Get)(":id/saved-properties"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getSavedProperties", null);
__decorate([
    (0, common_1.Get)(":id/verification-status"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getVerificationStatus", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)("api/users"),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map