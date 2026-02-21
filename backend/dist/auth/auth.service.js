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
        this.otpTtlMs = 10 * 60 * 1000;
        this.otpMaxAttempts = 5;
        this.otpSecret = process.env.OTP_SECRET || process.env.JWT_SECRET || "dev-otp-secret";
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
        if (user.isSuspended) {
            throw new common_1.UnauthorizedException(user.suspensionReason
                ? `Account suspended: ${user.suspensionReason}`
                : "Account suspended. Contact support.");
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
            if (existing.isSuspended) {
                throw new common_1.UnauthorizedException(existing.suspensionReason
                    ? `Account suspended: ${existing.suspensionReason}`
                    : "Account suspended. Contact support.");
            }
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
        user.emailOtp = undefined;
        user.emailOtpHash = this.hashOtp(otp, user.id, "email");
        user.emailOtpExpiresAt = new Date(Date.now() + this.otpTtlMs);
        user.emailOtpAttempts = 0;
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
        user.phoneOtp = undefined;
        user.phoneOtpHash = this.hashOtp(otp, user.id, "phone");
        user.phoneOtpExpiresAt = new Date(Date.now() + this.otpTtlMs);
        user.phoneOtpAttempts = 0;
        await user.save();
        return { sent: true, channel: "phone", expiresAt: user.phoneOtpExpiresAt };
    }
    async verifyEmailOtp(dto) {
        const user = await this.usersService.findById(dto.userId);
        await this.verifyOtpOrThrow(user, dto.otp, "email");
        user.emailVerified = true;
        user.emailOtpHash = undefined;
        user.emailOtp = undefined;
        user.emailOtpExpiresAt = undefined;
        user.emailOtpAttempts = 0;
        await user.save();
        return { verified: true };
    }
    async verifyPhoneOtp(dto) {
        const user = await this.usersService.findById(dto.userId);
        await this.verifyOtpOrThrow(user, dto.otp, "phone");
        user.phoneVerified = true;
        user.phoneOtpHash = undefined;
        user.phoneOtp = undefined;
        user.phoneOtpExpiresAt = undefined;
        user.phoneOtpAttempts = 0;
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
        const { loginCredentials, emailOtp, emailOtpHash, emailOtpExpiresAt, emailOtpAttempts, phoneOtp, phoneOtpHash, phoneOtpExpiresAt, phoneOtpAttempts, passwordResetToken, passwordResetExpiresAt, ...safeUser } = user.toObject();
        return {
            accessToken,
            user: safeUser,
        };
    }
    generateOtp() {
        return (0, crypto_1.randomInt)(100000, 1000000).toString();
    }
    hashOtp(otp, userId, channel) {
        return (0, crypto_1.createHmac)("sha256", this.otpSecret)
            .update(`${channel}:${userId}:${otp}`)
            .digest("hex");
    }
    secureCompare(a, b) {
        const left = Buffer.from(a, "utf8");
        const right = Buffer.from(b, "utf8");
        if (left.length !== right.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(left, right);
    }
    async verifyOtpOrThrow(user, otp, channel) {
        const hashField = channel === "email" ? "emailOtpHash" : "phoneOtpHash";
        const legacyField = channel === "email" ? "emailOtp" : "phoneOtp";
        const expiresField = channel === "email" ? "emailOtpExpiresAt" : "phoneOtpExpiresAt";
        const attemptsField = channel === "email" ? "emailOtpAttempts" : "phoneOtpAttempts";
        const expiresAt = user[expiresField];
        if (!expiresAt || expiresAt.getTime() < Date.now()) {
            user[hashField] = undefined;
            user[legacyField] = undefined;
            user[expiresField] = undefined;
            user[attemptsField] = 0;
            await user.save();
            throw new common_1.BadRequestException("OTP expired");
        }
        const attempts = Number(user[attemptsField] ?? 0);
        if (attempts >= this.otpMaxAttempts) {
            user[hashField] = undefined;
            user[legacyField] = undefined;
            user[expiresField] = undefined;
            user[attemptsField] = 0;
            await user.save();
            throw new common_1.BadRequestException("Too many invalid OTP attempts. Request a new code.");
        }
        const storedHash = user[hashField];
        const expectedHash = this.hashOtp(otp, user.id, channel);
        const hasLegacyOtp = typeof user[legacyField] === "string";
        const isValid = storedHash
            ? this.secureCompare(storedHash, expectedHash)
            : hasLegacyOtp
                ? this.secureCompare(String(user[legacyField]), otp)
                : false;
        if (!isValid) {
            const nextAttempts = attempts + 1;
            user[attemptsField] = nextAttempts;
            if (nextAttempts >= this.otpMaxAttempts) {
                user[hashField] = undefined;
                user[legacyField] = undefined;
                user[expiresField] = undefined;
                user[attemptsField] = 0;
            }
            await user.save();
            throw new common_1.BadRequestException("Invalid OTP");
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
