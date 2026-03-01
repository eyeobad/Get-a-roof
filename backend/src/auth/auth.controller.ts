import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("google")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post("send-email-otp")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  sendEmailOtp(@Body() dto: SendOtpDto, @Req() req: Request & { user?: any }) {
    if (dto.userId !== req.user?.sub) {
      throw new ForbiddenException("Access denied");
    }
    return this.authService.sendEmailOtp(dto);
  }

  @Post("verification/send-email-otp")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendEmailOtpForVerification(@Body() dto: SendOtpDto) {
    if (!dto.verificationToken) {
      throw new ForbiddenException("Verification token is required");
    }
    return this.authService.sendEmailOtp(dto);
  }

  @Post("send-phone-otp")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  sendPhoneOtp(@Body() dto: SendOtpDto, @Req() req: Request & { user?: any }) {
    if (dto.userId !== req.user?.sub) {
      throw new ForbiddenException("Access denied");
    }
    return this.authService.sendPhoneOtp(dto);
  }

  @Post("verify-email-otp")
  @UseGuards(JwtAuthGuard)
  verifyEmailOtp(@Body() dto: VerifyOtpDto, @Req() req: Request & { user?: any }) {
    if (dto.userId !== req.user?.sub) {
      throw new ForbiddenException("Access denied");
    }
    return this.authService.verifyEmailOtp(dto);
  }

  @Post("verification/verify-email-otp")
  verifyEmailOtpForVerification(@Body() dto: VerifyOtpDto) {
    if (!dto.verificationToken) {
      throw new ForbiddenException("Verification token is required");
    }
    return this.authService.verifyEmailOtp(dto);
  }

  @Post("verify-phone-otp")
  @UseGuards(JwtAuthGuard)
  verifyPhoneOtp(@Body() dto: VerifyOtpDto, @Req() req: Request & { user?: any }) {
    if (dto.userId !== req.user?.sub) {
      throw new ForbiddenException("Access denied");
    }
    return this.authService.verifyPhoneOtp(dto);
  }

  @Post("request-password-reset")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
