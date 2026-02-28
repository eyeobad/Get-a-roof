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
const platform_express_1 = require("@nestjs/platform-express");
const multer = require("multer");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const update_preferences_dto_1 = require("./dto/update-preferences.dto");
const save_property_dto_1 = require("./dto/save-property.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const enums_1 = require("../common/enums");
const profileImageMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);
const createMimeTypeFilter = (allowedTypes) => (_req, file, cb) => {
    if (!file?.mimetype || !allowedTypes.has(file.mimetype)) {
        return cb(new common_1.BadRequestException("Unsupported file type"));
    }
    return cb(null, true);
};
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async create(dto) {
        const requestedRole = dto.role;
        if (requestedRole === enums_1.UserRole.Admin || requestedRole === enums_1.UserRole.Unassigned) {
            throw new common_1.ForbiddenException("Invalid role");
        }
        dto.role =
            requestedRole === enums_1.UserRole.Landlord ? enums_1.UserRole.Landlord : enums_1.UserRole.Tenant;
        if (dto.role === enums_1.UserRole.Landlord) {
            await this.usersService.assertRecaptchaToken(dto.recaptchaToken);
        }
        return this.usersService.createUser(dto);
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
        delete dto.role;
        delete dto.isVerified;
        delete dto.verificationStatus;
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
    removeSavedProperty(id, propertyId, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.usersService
            .removeSavedProperty(id, propertyId)
            .then((user) => this.usersService.sanitizeUser(user));
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
    uploadPhoto(id, file, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return this.usersService.uploadProfilePhoto(id, file);
    }
    async deleteAccount(id, req) {
        if (req.user?.sub !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        await this.usersService.deleteUser(id);
        return { success: true };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
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
    (0, common_1.Delete)(":id/saved-properties/:propertyId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("propertyId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removeSavedProperty", null);
__decorate([
    (0, common_1.Get)(":id/verification-status"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getVerificationStatus", null);
__decorate([
    (0, common_1.Post)(":id/photo"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: createMimeTypeFilter(profileImageMimeTypes),
    })),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteAccount", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)("api/users"),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
