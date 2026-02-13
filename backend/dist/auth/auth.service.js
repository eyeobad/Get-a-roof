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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, mailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || !user.loginCredentials?.passwordHash) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        const isValid = await bcrypt.compare(dto.password, user.loginCredentials.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException("Email not verified. Please verify your email before logging in.");
        }
        return this.issueToken(user);
    }
    async googleLogin(dto) {
        const email = dto.email.toLowerCase();
        const existing = await this.usersService.findByEmail(email);
        if (existing) {
            if (dto.googleId) {
                existing.loginCredentials = {
                    ...(existing.loginCredentials || {}),
                    googleId: dto.googleId,
                };
            }
            existing.emailVerified = true;
            await existing.save();
            return this.issueToken(existing);
        }
        const created = await this.usersService.createOAuthUser({
            email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: dto.role,
            googleId: dto.googleId,
        });
        created.emailVerified = true;
        await created.save();
        return this.issueToken(created);
    }
    async sendEmailOtp(dto) {
        const user = await this.usersService.findById(dto.userId);
        const otp = this.generateOtp();
        user.emailOtp = otp;
        user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        try {
            await this.mailService.sendVerificationOtp(user.email, otp);
        }
        catch (error) {
            this.logger.error(`Failed to send verification email to ${user.email}: ${error?.message ?? "unknown error"}`);
            throw new common_1.ServiceUnavailableException("Unable to deliver OTP email right now. Please try again shortly.");
        }
        return { sent: true, channel: "email", expiresAt: user.emailOtpExpiresAt };
    }
    async sendPhoneOtp(dto) {
        const user = await this.usersService.findById(dto.userId);
        const otp = this.generateOtp();
        user.phoneOtp = otp;
        user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        return { sent: true, channel: "phone", otp, expiresAt: user.phoneOtpExpiresAt };
    }
    async verifyEmailOtp(dto) {
        const user = await this.usersService.findById(dto.userId);
        if (!user.emailOtp || user.emailOtp !== dto.otp) {
            throw new common_1.BadRequestException("Invalid OTP");
        }
        if (user.emailOtpExpiresAt && user.emailOtpExpiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException("OTP expired");
        }
        user.emailVerified = true;
        user.emailOtp = undefined;
        user.emailOtpExpiresAt = undefined;
        await user.save();
        return { verified: true };
    }
    async verifyPhoneOtp(dto) {
        const user = await this.usersService.findById(dto.userId);
        if (!user.phoneOtp || user.phoneOtp !== dto.otp) {
            throw new common_1.BadRequestException("Invalid OTP");
        }
        if (user.phoneOtpExpiresAt && user.phoneOtpExpiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException("OTP expired");
        }
        user.phoneVerified = true;
        user.phoneOtp = undefined;
        user.phoneOtpExpiresAt = undefined;
        await user.save();
        return { verified: true };
    }
    async requestPasswordReset(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        const token = (0, crypto_1.randomBytes)(16).toString("hex");
        user.passwordResetToken = token;
        user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();
        return { sent: true, token, expiresAt: user.passwordResetExpiresAt };
    }
    async resetPassword(dto) {
        const user = await this.usersService.findByResetToken(dto.token);
        if (!user) {
            throw new common_1.BadRequestException("Invalid token");
        }
        if (user.passwordResetExpiresAt &&
            user.passwordResetExpiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException("Reset token expired");
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        user.loginCredentials = {
            ...(user.loginCredentials || {}),
            passwordHash,
        };
        user.passwordResetToken = undefined;
        user.passwordResetExpiresAt = undefined;
        await user.save();
        return { reset: true };
    }
    issueToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload);
        const { loginCredentials, emailOtp, emailOtpExpiresAt, phoneOtp, phoneOtpExpiresAt, passwordResetToken, passwordResetExpiresAt, ...safeUser } = user.toObject();
        return {
            accessToken,
            user: safeUser,
        };
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
