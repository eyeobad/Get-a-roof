import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

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

    return this.issueToken(user);
  }

  async googleLogin(dto: GoogleLoginDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      if (dto.googleId) {
        existing.loginCredentials = {
          ...(existing.loginCredentials || {}),
          googleId: dto.googleId,
        };
        await existing.save();
      }
      return this.issueToken(existing);
    }

    const created = await this.usersService.createOAuthUser({
      email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      googleId: dto.googleId,
    });

    return this.issueToken(created);
  }

  async sendEmailOtp(dto: SendOtpDto) {
    const user = await this.usersService.findById(dto.userId);
    const otp = this.generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return { sent: true, channel: "email", otp, expiresAt: user.emailOtpExpiresAt };
  }

  async sendPhoneOtp(dto: SendOtpDto) {
    const user = await this.usersService.findById(dto.userId);
    const otp = this.generateOtp();
    user.phoneOtp = otp;
    user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return { sent: true, channel: "phone", otp, expiresAt: user.phoneOtpExpiresAt };
  }

  async verifyEmailOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findById(dto.userId);
    if (!user.emailOtp || user.emailOtp !== dto.otp) {
      throw new BadRequestException("Invalid OTP");
    }
    if (user.emailOtpExpiresAt && user.emailOtpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException("OTP expired");
    }

    user.emailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpiresAt = undefined;
    await user.save();

    return { verified: true };
  }

  async verifyPhoneOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findById(dto.userId);
    if (!user.phoneOtp || user.phoneOtp !== dto.otp) {
      throw new BadRequestException("Invalid OTP");
    }
    if (user.phoneOtpExpiresAt && user.phoneOtpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException("OTP expired");
    }

    user.phoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpiresAt = undefined;
    await user.save();

    return { verified: true };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const token = randomBytes(16).toString("hex");
    user.passwordResetToken = token;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    return { sent: true, token, expiresAt: user.passwordResetExpiresAt };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);
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
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const {
      loginCredentials,
      emailOtp,
      emailOtpExpiresAt,
      phoneOtp,
      phoneOtpExpiresAt,
      passwordResetToken,
      passwordResetExpiresAt,
      ...safeUser
    } = user.toObject();

    return {
      accessToken,
      user: safeUser,
    };
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
