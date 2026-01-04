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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcrypt");
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async createUser(dto) {
        const email = dto.email.toLowerCase();
        const existing = await this.userModel.findOne({ email }).exec();
        if (existing) {
            throw new common_1.ConflictException("Email already in use");
        }
        if (dto.phoneNumber) {
            const existingPhone = await this.userModel
                .findOne({ phoneNumber: dto.phoneNumber })
                .exec();
            if (existingPhone) {
                throw new common_1.ConflictException("Phone number already in use");
            }
        }
        const passwordHash = dto.password
            ? await bcrypt.hash(dto.password, 10)
            : undefined;
        const { password, ...rest } = dto;
        const created = new this.userModel({
            ...rest,
            email,
            loginCredentials: {
                passwordHash,
            },
        });
        return created.save();
    }
    async createOAuthUser(data) {
        const email = data.email.toLowerCase();
        const created = new this.userModel({
            email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            loginCredentials: {
                googleId: data.googleId,
            },
        });
        return created.save();
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }
    async findByResetToken(token) {
        return this.userModel.findOne({ passwordResetToken: token }).exec();
    }
    async findById(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return user;
    }
    async updateUser(id, dto) {
        const updated = await this.userModel
            .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException("User not found");
        }
        return updated;
    }
    async updatePreferences(id, dto) {
        const user = await this.findById(id);
        const current = user.preferences || {};
        if (dto.tenant) {
            const tenant = current.tenant || {};
            user.preferences = {
                ...current,
                tenant: { ...tenant, ...dto.tenant },
            };
        }
        if (dto.landlord) {
            const landlord = current.landlord || {};
            user.preferences = {
                ...current,
                landlord: { ...landlord, ...dto.landlord },
            };
        }
        return user.save();
    }
    async addSavedProperty(id, propertyId) {
        const updated = await this.userModel
            .findByIdAndUpdate(id, { $addToSet: { savedProperties: propertyId } }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException("User not found");
        }
        return updated;
    }
    async getSavedProperties(id) {
        const user = await this.userModel
            .findById(id)
            .populate("savedProperties")
            .exec();
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return user.savedProperties ?? [];
    }
    sanitizeUser(user) {
        const obj = user.toObject();
        delete obj.loginCredentials;
        delete obj.emailOtp;
        delete obj.emailOtpExpiresAt;
        delete obj.phoneOtp;
        delete obj.phoneOtpExpiresAt;
        delete obj.passwordResetToken;
        delete obj.passwordResetExpiresAt;
        return obj;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map