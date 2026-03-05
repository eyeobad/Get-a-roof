import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { MailService } from "../mail/mail.service";
import { getFirebaseAuth } from "./firebase-admin";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpTtlMs = 10 * 60 * 1000;
  private readonly otpMaxAttempts = 5;
  private readonly otpSecret =
    process.env.OTP_SECRET || process.env.JWT_SECRET || "dev-otp-secret";

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService
  ) { }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.loginCredentials?.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await bcrypt.compare(
      dto.password,
      user.loginCredentials.passwordHash
    );

    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.isSuspended) {
      throw new UnauthorizedException(
        user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}`
          : "Account suspended. Contact support."
      );
    }

    if (!user.emailVerified) {
      const challenge = await this.usersService.createSignupVerificationChallenge(
        user
      );
      let otpSent = true;
      try {
        await this.sendEmailOtp({
          userId: user.id,
          verificationToken: challenge.token,
        });
      } catch (error) {
        otpSent = false;
        this.logger.warn(
          `Unable to auto-send verification OTP for ${user.email}: ${(error as Error)?.message ?? "unknown error"}`
        );
      }
      return {
        status: "EMAIL_NOT_VERIFIED" as const,
        userId: user.id,
        email: user.email,
        verificationToken: challenge.token,
        verificationTokenExpiresAt: challenge.expiresAt,
        otpSent,
        message: "Email not verified. Continue verification.",
      };
    }

    return this.issueToken(user);
  }

  async googleLogin(dto: GoogleLoginDto) {
    const payload = await this.resolveFirebaseIdentity(dto.firebaseIdToken);
    const email = payload.email.toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      if (existing.isSuspended) {
        throw new UnauthorizedException(
          existing.suspensionReason
            ? `Account suspended: ${existing.suspensionReason}`
            : "Account suspended. Contact support."
        );
      }
      if (payload.googleId) {
        existing.loginCredentials = {
          ...(existing.loginCredentials || {}),
          googleId: payload.googleId,
        };
      }
      // Google accounts are already email-verified by provider.
      existing.emailVerified = true;
      await existing.save();
      return this.issueToken(existing);
    }

    const created = await this.usersService.createOAuthUser({
      email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: dto.role,
      googleId: payload.googleId,
    });
    created.emailVerified = true;
    await created.save();

    return this.issueToken(created);
  }

  private async resolveFirebaseIdentity(firebaseIdToken: string) {
    try {
      // Do not block login on token revocation checks here; accept valid Firebase ID token.
      const decoded = await getFirebaseAuth().verifyIdToken(firebaseIdToken);
      const email = decoded.email?.toLowerCase();
      if (!email || !decoded.email_verified) {
        throw new UnauthorizedException("Google account has no verified email");
      }
      const fullName = decoded.name?.trim() || "";
      const nameParts = fullName ? fullName.split(/\s+/) : [];
      const firstName = nameParts[0] || undefined;
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      return {
        email,
        firstName,
        lastName,
        googleId: decoded.uid,
      };
    } catch (error) {
      const reason = (error as Error)?.message ?? "unknown error";
      this.logger.warn(`Firebase token verification failed: ${reason}`);
      const message =
        process.env.NODE_ENV === "production"
          ? "Invalid Google authentication token"
          : `Invalid Google authentication token: ${reason}`;
      throw new UnauthorizedException(message);
    }
  }

  async sendEmailOtp(dto: SendOtpDto) {
    const user = await this.usersService.findById(dto.userId);
    if (!user.emailVerified && dto.verificationToken) {
      await this.usersService.validateSignupVerificationChallenge(
        dto.userId,
        dto.verificationToken
      );
    }
    const otp = this.generateOtp();
    user.emailOtp = undefined;
    user.emailOtpHash = this.hashOtp(otp, user.id, "email");
    user.emailOtpExpiresAt = new Date(Date.now() + this.otpTtlMs);
    user.emailOtpAttempts = 0;
    await user.save();
    try {
      await this.mailService.sendVerificationOtp(user.email, otp);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}: ${(error as Error)?.message ?? "unknown error"}`
      );
      throw new ServiceUnavailableException(
        "Unable to deliver OTP email right now. Please try again shortly."
      );
    }

    return { sent: true, channel: "email", expiresAt: user.emailOtpExpiresAt };
  }

  async sendPhoneOtp(dto: SendOtpDto) {
    const user = await this.usersService.findById(dto.userId);
    const otp = this.generateOtp();
    user.phoneOtp = undefined;
    user.phoneOtpHash = this.hashOtp(otp, user.id, "phone");
    user.phoneOtpExpiresAt = new Date(Date.now() + this.otpTtlMs);
    user.phoneOtpAttempts = 0;
    await user.save();

    return { sent: true, channel: "phone", expiresAt: user.phoneOtpExpiresAt };
  }

  async verifyEmailOtp(dto: VerifyOtpDto) {
    const user = dto.verificationToken
      ? await this.usersService.validateSignupVerificationChallenge(
        dto.userId,
        dto.verificationToken
      )
      : await this.usersService.findById(dto.userId);
    await this.verifyOtpOrThrow(user, dto.otp, "email");

    user.emailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtp = undefined;
    user.emailOtpExpiresAt = undefined;
    user.emailOtpAttempts = 0;
    this.usersService.clearSignupVerificationChallenge(user);
    await user.save();

    return { verified: true };
  }

  async verifyPhoneOtp(dto: VerifyOtpDto) {
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

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { sent: true };
    }

    const token = randomBytes(16).toString("hex");
    user.passwordResetToken = this.hashPasswordResetToken(token);
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const baseUrl =
      process.env.FRONTEND_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      "http://localhost:3000";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/auth/set-new-password#token=${encodeURIComponent(
      token
    )}`;

    try {
      await this.mailService.sendPasswordResetLink(user.email, resetUrl);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}: ${(error as Error)?.message ?? "unknown error"}`
      );
      throw new ServiceUnavailableException(
        "Unable to deliver reset email right now. Please try again shortly."
      );
    }

    return { sent: true, expiresAt: user.passwordResetExpiresAt };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetTokenHash(
      this.hashPasswordResetToken(dto.token)
    );
    if (!user) {
      throw new BadRequestException("Invalid token");
    }
    if (
      user.passwordResetExpiresAt &&
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException("Reset token expired");
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

  private issueToken(user: any) {
    const payload: Record<string, unknown> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion ?? 0,
    };

    if (user.agentOrgId) {
      payload.orgId = user.agentOrgId.toString();
    }

    const accessToken = this.jwtService.sign(payload);
    const {
      loginCredentials,
      emailOtp,
      emailOtpHash,
      emailOtpExpiresAt,
      emailOtpAttempts,
      phoneOtp,
      phoneOtpHash,
      phoneOtpExpiresAt,
      phoneOtpAttempts,
      passwordResetToken,
      passwordResetExpiresAt,
      verificationDetails,
      ...safeUser
    } = user.toObject();

    return {
      accessToken,
      user: safeUser,
    };
  }

  private generateOtp() {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string, userId: string, channel: "email" | "phone") {
    return createHmac("sha256", this.otpSecret)
      .update(`${channel}:${userId}:${otp}`)
      .digest("hex");
  }

  private hashPasswordResetToken(token: string) {
    return createHmac("sha256", this.otpSecret)
      .update(`reset:${token}`)
      .digest("hex");
  }

  private secureCompare(a: string, b: string) {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }

  private async verifyOtpOrThrow(
    user: any,
    otp: string,
    channel: "email" | "phone"
  ) {
    const hashField = channel === "email" ? "emailOtpHash" : "phoneOtpHash";
    const legacyField = channel === "email" ? "emailOtp" : "phoneOtp";
    const expiresField = channel === "email" ? "emailOtpExpiresAt" : "phoneOtpExpiresAt";
    const attemptsField = channel === "email" ? "emailOtpAttempts" : "phoneOtpAttempts";

    const expiresAt = user[expiresField] as Date | undefined;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      user[hashField] = undefined;
      user[legacyField] = undefined;
      user[expiresField] = undefined;
      user[attemptsField] = 0;
      await user.save();
      throw new BadRequestException("OTP expired");
    }

    const attempts = Number(user[attemptsField] ?? 0);
    if (attempts >= this.otpMaxAttempts) {
      user[hashField] = undefined;
      user[legacyField] = undefined;
      user[expiresField] = undefined;
      user[attemptsField] = 0;
      await user.save();
      throw new BadRequestException("Too many invalid OTP attempts. Request a new code.");
    }

    const storedHash = user[hashField] as string | undefined;
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
      throw new BadRequestException("Invalid OTP");
    }
  }
}
