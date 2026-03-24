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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcrypt");
const appwrite_service_1 = require("../appwrite/appwrite.service");
const user_schema_1 = require("./schemas/user.schema");
const property_schema_1 = require("../properties/schemas/property.schema");
const match_schema_1 = require("../matches/schemas/match.schema");
const message_schema_1 = require("../chat/schemas/message.schema");
const enums_1 = require("../common/enums");
const crypto_1 = require("crypto");
const mail_service_1 = require("../mail/mail.service");
const redis_cache_service_1 = require("../common/services/redis-cache.service");
const profileMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);
let UsersService = UsersService_1 = class UsersService {
    constructor(userModel, propertyModel, matchModel, messageModel, appwriteStorage, mailService, redisCache) {
        this.userModel = userModel;
        this.propertyModel = propertyModel;
        this.matchModel = matchModel;
        this.messageModel = messageModel;
        this.appwriteStorage = appwriteStorage;
        this.mailService = mailService;
        this.redisCache = redisCache;
        this.logger = new common_1.Logger(UsersService_1.name);
        this.signupVerificationTtlMs = 15 * 60 * 1000;
        this.agentInviteTtlMs = 72 * 60 * 60 * 1000;
        this.signupVerificationSecret = process.env.SIGNUP_VERIFICATION_SECRET ||
            process.env.OTP_SECRET ||
            process.env.JWT_SECRET ||
            "dev-signup-verification-secret";
    }
    async createUser(dto) {
        const email = dto.email.toLowerCase();
        const existing = await this.userModel.findOne({ email }).exec();
        if (existing) {
            if (!existing.emailVerified) {
                const challenge = await this.createSignupVerificationChallenge(existing);
                return {
                    status: "PENDING_VERIFICATION",
                    userId: existing.id,
                    email: existing.email,
                    verificationToken: challenge.token,
                    verificationTokenExpiresAt: challenge.expiresAt,
                };
            }
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
        const { password, recaptchaToken: _recaptchaToken, ...rest } = dto;
        const resolvedRole = dto.role === enums_1.UserRole.Landlord
            ? enums_1.UserRole.Landlord
            : dto.role === enums_1.UserRole.Organisation
                ? enums_1.UserRole.Organisation
                : enums_1.UserRole.Tenant;
        const created = new this.userModel({
            ...rest,
            role: resolvedRole,
            email,
            loginCredentials: {
                passwordHash,
            },
        });
        const saved = await created.save();
        const challenge = await this.createSignupVerificationChallenge(saved);
        return {
            status: "PENDING_VERIFICATION",
            userId: saved.id,
            email: saved.email,
            verificationToken: challenge.token,
            verificationTokenExpiresAt: challenge.expiresAt,
        };
    }
    async assertRecaptchaToken(token) {
        const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
        const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");
        const expectedActions = new Set((process.env.RECAPTCHA_EXPECTED_ACTION?.trim() || "landlord_signup,tenant_signup")
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean));
        if (!secret) {
            throw new common_1.ServiceUnavailableException("reCAPTCHA is not configured");
        }
        if (!token) {
            throw new common_1.BadRequestException("Please complete reCAPTCHA verification");
        }
        const body = new URLSearchParams({
            secret,
            response: token,
        });
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        if (!response.ok) {
            throw new common_1.ServiceUnavailableException("Unable to validate reCAPTCHA");
        }
        const result = (await response.json());
        if (!result.success) {
            throw new common_1.BadRequestException("Invalid reCAPTCHA verification");
        }
        if (typeof result.action === "string" &&
            expectedActions.size > 0 &&
            !expectedActions.has(result.action)) {
            throw new common_1.BadRequestException("Invalid reCAPTCHA action");
        }
        if (typeof result.score === "number" && result.score < minScore) {
            throw new common_1.BadRequestException("reCAPTCHA score too low");
        }
    }
    async createOAuthUser(data) {
        const email = data.email.toLowerCase();
        const resolvedRole = data.role === enums_1.UserRole.Landlord
            ? enums_1.UserRole.Landlord
            : data.role === enums_1.UserRole.Organisation
                ? enums_1.UserRole.Organisation
                : enums_1.UserRole.Tenant;
        const created = new this.userModel({
            email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: resolvedRole,
            loginCredentials: {
                googleId: data.googleId,
            },
        });
        return created.save();
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }
    async findByResetTokenHash(tokenHash) {
        return this.userModel.findOne({ passwordResetToken: tokenHash }).exec();
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
    async removeSavedProperty(id, propertyId) {
        const updated = await this.userModel
            .findByIdAndUpdate(id, { $pull: { savedProperties: propertyId } }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException("User not found");
        }
        if (mongoose_2.Types.ObjectId.isValid(id) && mongoose_2.Types.ObjectId.isValid(propertyId)) {
            const tenantId = new mongoose_2.Types.ObjectId(id);
            const listingId = new mongoose_2.Types.ObjectId(propertyId);
            const duplicateMatches = await this.matchModel
                .find({
                $or: [
                    { tenantId, propertyId: listingId },
                    { tenantId: id, propertyId },
                ],
            })
                .select("_id")
                .lean()
                .exec();
            const matchIds = duplicateMatches.map((match) => match._id);
            if (matchIds.length > 0) {
                await this.messageModel.deleteMany({ matchId: { $in: matchIds } });
                await this.matchModel.deleteMany({ _id: { $in: matchIds } });
            }
        }
        await Promise.all([
            this.redisCache.deleteByPrefix(`tenant-matches:active:${id}:`),
            this.redisCache.deleteByPrefix(`tenant-matches:recycled:${id}:`),
        ]);
        return updated;
    }
    async deleteUser(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        const userObjectId = new mongoose_2.Types.ObjectId(user.id);
        const propertyIds = await this.propertyModel
            .find({ landlordId: userObjectId })
            .distinct("_id")
            .exec();
        const landlordPropertyIds = propertyIds.map((pid) => new mongoose_2.Types.ObjectId(pid));
        if (landlordPropertyIds.length) {
            await this.propertyModel.deleteMany({
                _id: { $in: landlordPropertyIds },
            });
        }
        const matchFilter = {
            $or: [{ tenantId: userObjectId }],
        };
        if (landlordPropertyIds.length) {
            matchFilter.$or.push({
                propertyId: { $in: landlordPropertyIds },
            });
        }
        const matchIds = await this.matchModel
            .find(matchFilter)
            .distinct("_id")
            .exec();
        if (matchIds.length) {
            await this.messageModel.deleteMany({
                matchId: { $in: matchIds.map((mid) => new mongoose_2.Types.ObjectId(mid)) },
            });
        }
        await this.matchModel.deleteMany(matchFilter);
        await Promise.all([
            this.redisCache.deleteByPrefix(`tenant-matches:active:${id}:`),
            this.redisCache.deleteByPrefix(`tenant-matches:recycled:${id}:`),
        ]);
        const deleted = await this.userModel.findByIdAndDelete(id).exec();
        return deleted;
    }
    async uploadProfilePhoto(id, file) {
        if (!file) {
            throw new common_1.BadRequestException("File is required");
        }
        if (!file.mimetype || !profileMimeTypes.has(file.mimetype)) {
            throw new common_1.BadRequestException("Unsupported file type");
        }
        const result = await this.appwriteStorage.uploadFile(file.originalname ?? file.filename ?? `profile-${Date.now()}`, file.buffer, file.mimetype ?? "image/jpeg");
        if (!result?.url) {
            throw new common_1.BadRequestException("Unable to upload file");
        }
        const updated = await this.userModel
            .findByIdAndUpdate(id, { photoUrl: result.url }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException("User not found");
        }
        return this.sanitizeUser(updated);
    }
    sanitizeUser(user) {
        const obj = user.toObject();
        delete obj.loginCredentials;
        delete obj.emailOtp;
        delete obj.emailOtpHash;
        delete obj.emailOtpExpiresAt;
        delete obj.emailOtpAttempts;
        delete obj.phoneOtp;
        delete obj.phoneOtpHash;
        delete obj.phoneOtpExpiresAt;
        delete obj.phoneOtpAttempts;
        delete obj.signupVerificationTokenHash;
        delete obj.signupVerificationTokenExpiresAt;
        delete obj.passwordResetToken;
        delete obj.passwordResetExpiresAt;
        delete obj.verificationDetails;
        return obj;
    }
    async createSignupVerificationChallenge(user) {
        const token = (0, crypto_1.randomBytes)(24).toString("base64url");
        const expiresAt = new Date(Date.now() + this.signupVerificationTtlMs);
        user.signupVerificationTokenHash = this.hashSignupVerificationToken(token, user.id);
        user.signupVerificationTokenExpiresAt = expiresAt;
        await user.save();
        return { token, expiresAt };
    }
    async validateSignupVerificationChallenge(userId, token) {
        const user = await this.findById(userId);
        if (!token || !user.signupVerificationTokenHash) {
            throw new common_1.UnauthorizedException("Verification session expired. Sign up again.");
        }
        if (!user.signupVerificationTokenExpiresAt ||
            user.signupVerificationTokenExpiresAt.getTime() < Date.now()) {
            user.signupVerificationTokenHash = undefined;
            user.signupVerificationTokenExpiresAt = undefined;
            await user.save();
            throw new common_1.UnauthorizedException("Verification session expired. Sign up again.");
        }
        const expected = this.hashSignupVerificationToken(token, user.id);
        const isValid = this.secureCompare(user.signupVerificationTokenHash, expected);
        if (!isValid) {
            throw new common_1.UnauthorizedException("Invalid verification session.");
        }
        return user;
    }
    clearSignupVerificationChallenge(user) {
        user.signupVerificationTokenHash = undefined;
        user.signupVerificationTokenExpiresAt = undefined;
    }
    hashSignupVerificationToken(token, userId) {
        return (0, crypto_1.createHmac)("sha256", this.signupVerificationSecret)
            .update(`${userId}:${token}`)
            .digest("hex");
    }
    secureCompare(a, b) {
        const left = Buffer.from(a, "utf8");
        const right = Buffer.from(b, "utf8");
        if (left.length !== right.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(left, right);
    }
    async createOrganisation(dto) {
        const email = dto.email.toLowerCase();
        const existing = await this.userModel.findOne({ email }).exec();
        if (existing) {
            if (!existing.emailVerified) {
                const challenge = await this.createSignupVerificationChallenge(existing);
                return {
                    status: "PENDING_VERIFICATION",
                    userId: existing.id,
                    email: existing.email,
                    verificationToken: challenge.token,
                    verificationTokenExpiresAt: challenge.expiresAt,
                };
            }
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
        const { password, recaptchaToken: _recaptchaToken, orgName, registrationNumber, website, ...rest } = dto;
        const created = new this.userModel({
            ...rest,
            role: enums_1.UserRole.Organisation,
            email,
            loginCredentials: { passwordHash },
            orgProfile: {
                orgName,
                registrationNumber,
                website,
                agentIds: [],
            },
        });
        const saved = await created.save();
        const challenge = await this.createSignupVerificationChallenge(saved);
        return {
            status: "PENDING_VERIFICATION",
            userId: saved.id,
            email: saved.email,
            verificationToken: challenge.token,
            verificationTokenExpiresAt: challenge.expiresAt,
        };
    }
    async inviteAgent(orgId, agentEmail) {
        const org = await this.findById(orgId);
        if (org.role !== enums_1.UserRole.Organisation) {
            throw new common_1.ForbiddenException("Only organisations can invite agents");
        }
        const email = agentEmail.toLowerCase();
        const existing = await this.userModel.findOne({ email }).exec();
        if (existing && existing.agentOrgId?.toString() === orgId) {
            throw new common_1.ConflictException("This user is already an agent of your organisation");
        }
        if (existing && existing.agentOrgId && existing.agentOrgId.toString() !== orgId) {
            throw new common_1.ConflictException("This user is already linked to another organisation");
        }
        const token = (0, crypto_1.randomBytes)(24).toString("base64url");
        const expiresAt = new Date(Date.now() + this.agentInviteTtlMs);
        const tokenHash = this.hashAgentInviteToken(token, orgId, email);
        org.agentInviteTokenHash = tokenHash;
        org.agentInviteEmail = email;
        org.agentInviteTokenExpiresAt = expiresAt;
        await org.save();
        const orgName = org.orgProfile?.orgName ?? "Organisation";
        const baseUrl = process.env.FRONTEND_URL?.trim() ||
            process.env.APP_URL?.trim() ||
            "http://localhost:3000";
        const inviteUrl = `${baseUrl.replace(/\/$/, "")}/agent-invite?token=${encodeURIComponent(token)}&orgId=${encodeURIComponent(orgId)}&orgName=${encodeURIComponent(orgName)}`;
        try {
            await this.mailService.sendAgentInvite(email, orgName, inviteUrl);
        }
        catch (error) {
            this.logger.error(`Failed to send agent invite to ${email}: ${error?.message ?? "unknown error"}`);
            throw new common_1.ServiceUnavailableException("Unable to deliver invite email right now. Please try again shortly.");
        }
        return {
            token,
            inviteUrl,
            email,
            orgName,
            expiresAt,
            sent: true,
        };
    }
    async acceptAgentInvite(token, orgId, agentUserId) {
        const org = await this.findById(orgId);
        if (org.role !== enums_1.UserRole.Organisation) {
            throw new common_1.BadRequestException("Invalid invite");
        }
        const agent = await this.findById(agentUserId);
        const email = agent.email.toLowerCase();
        if (agent.role === enums_1.UserRole.Admin || agent.role === enums_1.UserRole.Organisation) {
            throw new common_1.ForbiddenException("This account type cannot join an organisation as an agent");
        }
        if (agent.agentOrgId && agent.agentOrgId.toString() !== orgId) {
            throw new common_1.ConflictException("This user is already linked to another organisation");
        }
        if (!org.agentInviteTokenHash) {
            throw new common_1.BadRequestException("No pending invite");
        }
        if (org.agentInviteTokenExpiresAt &&
            org.agentInviteTokenExpiresAt.getTime() < Date.now()) {
            org.agentInviteTokenHash = undefined;
            org.agentInviteEmail = undefined;
            org.agentInviteTokenExpiresAt = undefined;
            await org.save();
            throw new common_1.BadRequestException("Invite expired");
        }
        if (org.agentInviteEmail && org.agentInviteEmail !== email) {
            throw new common_1.ForbiddenException("This invite was sent to a different email. Sign in with the invited account and try again.");
        }
        const expected = this.hashAgentInviteToken(token, orgId, email);
        if (!this.secureCompare(org.agentInviteTokenHash, expected)) {
            throw new common_1.BadRequestException("Invalid invite token");
        }
        agent.agentOrgId = new mongoose_2.Types.ObjectId(orgId);
        if (agent.role === enums_1.UserRole.Tenant || agent.role === enums_1.UserRole.Unassigned) {
            agent.role = enums_1.UserRole.Landlord;
        }
        await agent.save();
        const agentObjectId = new mongoose_2.Types.ObjectId(agentUserId);
        const currentAgentIds = org.orgProfile?.agentIds ?? [];
        if (!currentAgentIds.some((id) => id.toString() === agentUserId)) {
            await this.userModel.findByIdAndUpdate(orgId, {
                $addToSet: { "orgProfile.agentIds": agentObjectId },
            });
        }
        org.agentInviteTokenHash = undefined;
        org.agentInviteEmail = undefined;
        org.agentInviteTokenExpiresAt = undefined;
        await org.save();
        return { linked: true, orgId, agentId: agentUserId };
    }
    async removeAgent(orgId, agentId) {
        const org = await this.findById(orgId);
        if (org.role !== enums_1.UserRole.Organisation) {
            throw new common_1.ForbiddenException("Only organisations can remove agents");
        }
        const agentObjectId = new mongoose_2.Types.ObjectId(agentId);
        await this.userModel.findByIdAndUpdate(orgId, {
            $pull: { "orgProfile.agentIds": agentObjectId },
        });
        const agent = await this.userModel.findById(agentId).exec();
        if (agent && agent.agentOrgId?.toString() === orgId) {
            agent.agentOrgId = undefined;
            await agent.save();
        }
        return { removed: true };
    }
    async getOrgAgents(orgId) {
        const org = await this.findById(orgId);
        if (org.role !== enums_1.UserRole.Organisation) {
            throw new common_1.ForbiddenException("Not an organisation");
        }
        const indexedAgentIds = (org.orgProfile?.agentIds ?? []).map((id) => id.toString());
        const linkedAgents = await this.userModel
            .find({ agentOrgId: new mongoose_2.Types.ObjectId(orgId) })
            .exec();
        const linkedIdSet = new Set(linkedAgents.map((agent) => agent.id));
        const missingIndexedIds = indexedAgentIds.filter((id) => !linkedIdSet.has(id));
        let indexedAgents = [];
        if (missingIndexedIds.length) {
            indexedAgents = await this.userModel
                .find({ _id: { $in: missingIndexedIds } })
                .exec();
        }
        const agents = [...linkedAgents, ...indexedAgents];
        if (!agents.length)
            return [];
        return agents.map((agent) => this.sanitizeUser(agent));
    }
    hashAgentInviteToken(token, orgId, email) {
        return (0, crypto_1.createHmac)("sha256", this.signupVerificationSecret)
            .update(`agent-invite:${orgId}:${email}:${token}`)
            .digest("hex");
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __param(2, (0, mongoose_1.InjectModel)(match_schema_1.Match.name)),
    __param(3, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        appwrite_service_1.AppwriteStorageService,
        mail_service_1.MailService,
        redis_cache_service_1.RedisCacheService])
], UsersService);
