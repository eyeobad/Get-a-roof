import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import { Express } from "express";
import { AppwriteStorageService } from "../appwrite/appwrite.service";
import { User, UserDocument } from "./schemas/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { CreateOrgDto } from "./dto/create-org.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { Property, PropertyDocument } from "../properties/schemas/property.schema";
import { Match, MatchDocument } from "../matches/schemas/match.schema";
import { Message, MessageDocument } from "../chat/schemas/message.schema";
import { UserRole } from "../common/enums";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { MailService } from "../mail/mail.service";

const profileMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly signupVerificationTtlMs = 15 * 60 * 1000;
  private readonly agentInviteTtlMs = 72 * 60 * 60 * 1000;
  private readonly signupVerificationSecret =
    process.env.SIGNUP_VERIFICATION_SECRET ||
    process.env.OTP_SECRET ||
    process.env.JWT_SECRET ||
    "dev-signup-verification-secret";

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly appwriteStorage: AppwriteStorageService,
    private readonly mailService: MailService
  ) { }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      if (!existing.emailVerified) {
        const challenge = await this.createSignupVerificationChallenge(existing);
        return {
          status: "PENDING_VERIFICATION" as const,
          userId: existing.id,
          email: existing.email,
          verificationToken: challenge.token,
          verificationTokenExpiresAt: challenge.expiresAt,
        };
      }
      throw new ConflictException("Email already in use");
    }

    if (dto.phoneNumber) {
      const existingPhone = await this.userModel
        .findOne({ phoneNumber: dto.phoneNumber })
        .exec();
      if (existingPhone) {
        throw new ConflictException("Phone number already in use");
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;
    const { password, recaptchaToken: _recaptchaToken, ...rest } = dto;

    const resolvedRole =
      dto.role === UserRole.Landlord
        ? UserRole.Landlord
        : dto.role === UserRole.Organisation
          ? UserRole.Organisation
          : UserRole.Tenant;
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
      status: "PENDING_VERIFICATION" as const,
      userId: saved.id,
      email: saved.email,
      verificationToken: challenge.token,
      verificationTokenExpiresAt: challenge.expiresAt,
    };
  }

  async assertRecaptchaToken(token?: string) {
    const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
    const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");
    const expectedActions = new Set(
      (process.env.RECAPTCHA_EXPECTED_ACTION?.trim() || "landlord_signup,tenant_signup")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    );
    if (!secret) {
      throw new ServiceUnavailableException("reCAPTCHA is not configured");
    }
    if (!token) {
      throw new BadRequestException("Please complete reCAPTCHA verification");
    }

    const body = new URLSearchParams({
      secret,
      response: token,
    });

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );

    if (!response.ok) {
      throw new ServiceUnavailableException("Unable to validate reCAPTCHA");
    }

    const result = (await response.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };

    if (!result.success) {
      throw new BadRequestException("Invalid reCAPTCHA verification");
    }
    if (
      typeof result.action === "string" &&
      expectedActions.size > 0 &&
      !expectedActions.has(result.action)
    ) {
      throw new BadRequestException("Invalid reCAPTCHA action");
    }
    if (typeof result.score === "number" && result.score < minScore) {
      throw new BadRequestException("reCAPTCHA score too low");
    }
  }

  async createOAuthUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    googleId?: string;
  }) {
    const email = data.email.toLowerCase();
    const resolvedRole =
      data.role === UserRole.Landlord
        ? UserRole.Landlord
        : data.role === UserRole.Organisation
          ? UserRole.Organisation
          : UserRole.Tenant;
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

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByResetTokenHash(tokenHash: string) {
    return this.userModel.findOne({ passwordResetToken: tokenHash }).exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const updated = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return updated;
  }

  async updatePreferences(id: string, dto: UpdatePreferencesDto) {
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

  async addSavedProperty(id: string, propertyId: string) {
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { savedProperties: propertyId } },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return updated;
  }

  async getSavedProperties(id: string) {
    const user = await this.userModel
      .findById(id)
      .populate("savedProperties")
      .exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user.savedProperties ?? [];
  }

  async removeSavedProperty(id: string, propertyId: string) {
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { $pull: { savedProperties: propertyId } },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }

    if (Types.ObjectId.isValid(id) && Types.ObjectId.isValid(propertyId)) {
      const tenantId = new Types.ObjectId(id);
      const listingId = new Types.ObjectId(propertyId);
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

    return updated;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const userObjectId = new Types.ObjectId(user.id);

    const propertyIds = await this.propertyModel
      .find({ landlordId: userObjectId })
      .distinct("_id")
      .exec();
    const landlordPropertyIds = propertyIds.map((pid) => new Types.ObjectId(pid));
    if (landlordPropertyIds.length) {
      await this.propertyModel.deleteMany({
        _id: { $in: landlordPropertyIds },
      });
    }

    const matchFilter: Record<string, unknown> = {
      $or: [{ tenantId: userObjectId }],
    };
    if (landlordPropertyIds.length) {
      (matchFilter.$or as Array<Record<string, unknown>>).push({
        propertyId: { $in: landlordPropertyIds },
      });
    }

    const matchIds = await this.matchModel
      .find(matchFilter)
      .distinct("_id")
      .exec();
    if (matchIds.length) {
      await this.messageModel.deleteMany({
        matchId: { $in: matchIds.map((mid) => new Types.ObjectId(mid)) },
      });
    }
    await this.matchModel.deleteMany(matchFilter);

    const deleted = await this.userModel.findByIdAndDelete(id).exec();
    return deleted;
  }

  async uploadProfilePhoto(id: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    if (!file.mimetype || !profileMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Unsupported file type");
    }
    const result = await this.appwriteStorage.uploadFile(
      file.originalname ?? file.filename ?? `profile-${Date.now()}`,
      file.buffer,
      file.mimetype ?? "image/jpeg"
    );
    if (!result?.url) {
      throw new BadRequestException("Unable to upload file");
    }
    const updated = await this.userModel
      .findByIdAndUpdate(id, { photoUrl: result.url }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return this.sanitizeUser(updated);
  }

  sanitizeUser(user: UserDocument) {
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

  async createSignupVerificationChallenge(user: UserDocument) {
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + this.signupVerificationTtlMs);
    user.signupVerificationTokenHash = this.hashSignupVerificationToken(
      token,
      user.id
    );
    user.signupVerificationTokenExpiresAt = expiresAt;
    await user.save();
    return { token, expiresAt };
  }

  async validateSignupVerificationChallenge(userId: string, token: string) {
    const user = await this.findById(userId);
    if (!token || !user.signupVerificationTokenHash) {
      throw new UnauthorizedException("Verification session expired. Sign up again.");
    }
    if (
      !user.signupVerificationTokenExpiresAt ||
      user.signupVerificationTokenExpiresAt.getTime() < Date.now()
    ) {
      user.signupVerificationTokenHash = undefined;
      user.signupVerificationTokenExpiresAt = undefined;
      await user.save();
      throw new UnauthorizedException("Verification session expired. Sign up again.");
    }
    const expected = this.hashSignupVerificationToken(token, user.id);
    const isValid = this.secureCompare(user.signupVerificationTokenHash, expected);
    if (!isValid) {
      throw new UnauthorizedException("Invalid verification session.");
    }
    return user;
  }

  clearSignupVerificationChallenge(user: UserDocument) {
    user.signupVerificationTokenHash = undefined;
    user.signupVerificationTokenExpiresAt = undefined;
  }

  private hashSignupVerificationToken(token: string, userId: string) {
    return createHmac("sha256", this.signupVerificationSecret)
      .update(`${userId}:${token}`)
      .digest("hex");
  }

  private secureCompare(a: string, b: string) {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }

  /* ─── Organisation & Agent Methods ──────────────────────────── */

  async createOrganisation(dto: CreateOrgDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      if (!existing.emailVerified) {
        const challenge = await this.createSignupVerificationChallenge(existing);
        return {
          status: "PENDING_VERIFICATION" as const,
          userId: existing.id,
          email: existing.email,
          verificationToken: challenge.token,
          verificationTokenExpiresAt: challenge.expiresAt,
        };
      }
      throw new ConflictException("Email already in use");
    }

    if (dto.phoneNumber) {
      const existingPhone = await this.userModel
        .findOne({ phoneNumber: dto.phoneNumber })
        .exec();
      if (existingPhone) {
        throw new ConflictException("Phone number already in use");
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;
    const { password, recaptchaToken: _recaptchaToken, orgName, registrationNumber, website, ...rest } = dto;

    const created = new this.userModel({
      ...rest,
      role: UserRole.Organisation,
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
      status: "PENDING_VERIFICATION" as const,
      userId: saved.id,
      email: saved.email,
      verificationToken: challenge.token,
      verificationTokenExpiresAt: challenge.expiresAt,
    };
  }

  async inviteAgent(orgId: string, agentEmail: string) {
    const org = await this.findById(orgId);
    if (org.role !== UserRole.Organisation) {
      throw new ForbiddenException("Only organisations can invite agents");
    }

    const email = agentEmail.toLowerCase();

    // Check if agent already linked
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing && existing.agentOrgId?.toString() === orgId) {
      throw new ConflictException("This user is already an agent of your organisation");
    }
    if (existing && existing.agentOrgId && existing.agentOrgId.toString() !== orgId) {
      throw new ConflictException("This user is already linked to another organisation");
    }

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + this.agentInviteTtlMs);
    const tokenHash = this.hashAgentInviteToken(token, orgId, email);

    // Store invite on the org document
    org.agentInviteTokenHash = tokenHash;
    org.agentInviteEmail = email;
    org.agentInviteTokenExpiresAt = expiresAt;
    await org.save();

    const orgName = org.orgProfile?.orgName ?? "Organisation";
    const baseUrl =
      process.env.FRONTEND_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      "http://localhost:3000";
    const inviteUrl = `${baseUrl.replace(/\/$/, "")}/agent-invite?token=${encodeURIComponent(
      token
    )}&orgId=${encodeURIComponent(orgId)}&orgName=${encodeURIComponent(orgName)}`;

    try {
      await this.mailService.sendAgentInvite(email, orgName, inviteUrl);
    } catch (error) {
      this.logger.error(
        `Failed to send agent invite to ${email}: ${(error as Error)?.message ?? "unknown error"}`
      );
      throw new ServiceUnavailableException(
        "Unable to deliver invite email right now. Please try again shortly."
      );
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

  async acceptAgentInvite(token: string, orgId: string, agentUserId: string) {
    const org = await this.findById(orgId);
    if (org.role !== UserRole.Organisation) {
      throw new BadRequestException("Invalid invite");
    }

    const agent = await this.findById(agentUserId);
    const email = agent.email.toLowerCase();

    if (agent.role === UserRole.Admin || agent.role === UserRole.Organisation) {
      throw new ForbiddenException(
        "This account type cannot join an organisation as an agent"
      );
    }
    if (agent.agentOrgId && agent.agentOrgId.toString() !== orgId) {
      throw new ConflictException("This user is already linked to another organisation");
    }

    if (!org.agentInviteTokenHash) {
      throw new BadRequestException("No pending invite");
    }

    if (
      org.agentInviteTokenExpiresAt &&
      org.agentInviteTokenExpiresAt.getTime() < Date.now()
    ) {
      org.agentInviteTokenHash = undefined;
      org.agentInviteEmail = undefined;
      org.agentInviteTokenExpiresAt = undefined;
      await org.save();
      throw new BadRequestException("Invite expired");
    }

    if (org.agentInviteEmail && org.agentInviteEmail !== email) {
      throw new ForbiddenException(
        "This invite was sent to a different email. Sign in with the invited account and try again."
      );
    }

    const expected = this.hashAgentInviteToken(token, orgId, email);
    if (!this.secureCompare(org.agentInviteTokenHash, expected)) {
      throw new BadRequestException("Invalid invite token");
    }

    // Link agent to org
    agent.agentOrgId = new Types.ObjectId(orgId);
    if (agent.role === UserRole.Tenant || agent.role === UserRole.Unassigned) {
      agent.role = UserRole.Landlord;
    }
    await agent.save();

    // Add agent to org's list
    const agentObjectId = new Types.ObjectId(agentUserId);
    const currentAgentIds = org.orgProfile?.agentIds ?? [];
    if (!currentAgentIds.some((id) => id.toString() === agentUserId)) {
      await this.userModel.findByIdAndUpdate(orgId, {
        $addToSet: { "orgProfile.agentIds": agentObjectId },
      });
    }

    // Clear invite
    org.agentInviteTokenHash = undefined;
    org.agentInviteEmail = undefined;
    org.agentInviteTokenExpiresAt = undefined;
    await org.save();

    return { linked: true, orgId, agentId: agentUserId };
  }

  async removeAgent(orgId: string, agentId: string) {
    const org = await this.findById(orgId);
    if (org.role !== UserRole.Organisation) {
      throw new ForbiddenException("Only organisations can remove agents");
    }

    const agentObjectId = new Types.ObjectId(agentId);
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

  async getOrgAgents(orgId: string) {
    const org = await this.findById(orgId);
    if (org.role !== UserRole.Organisation) {
      throw new ForbiddenException("Not an organisation");
    }

    const indexedAgentIds = (org.orgProfile?.agentIds ?? []).map((id) =>
      id.toString()
    );
    const linkedAgents = await this.userModel
      .find({ agentOrgId: new Types.ObjectId(orgId) })
      .exec();

    const linkedIdSet = new Set(linkedAgents.map((agent) => agent.id));
    const missingIndexedIds = indexedAgentIds.filter((id) => !linkedIdSet.has(id));
    let indexedAgents = [] as UserDocument[];
    if (missingIndexedIds.length) {
      indexedAgents = await this.userModel
        .find({ _id: { $in: missingIndexedIds } })
        .exec();
    }

    const agents = [...linkedAgents, ...indexedAgents];
    if (!agents.length) return [];

    return agents.map((agent) => this.sanitizeUser(agent));
  }

  private hashAgentInviteToken(token: string, orgId: string, email: string) {
    return createHmac("sha256", this.signupVerificationSecret)
      .update(`agent-invite:${orgId}:${email}:${token}`)
      .digest("hex");
  }
}
