import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
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
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("google")
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post("send-email-otp")
  @UseGuards(JwtAuthGuard)
  sendEmailOtp(@Body() dto: SendOtpDto, @Req() req: Request & { user?: any }) {
    if (dto.userId !== req.user?.sub) {
      throw new ForbiddenException("Access denied");
    }
    return this.authService.sendEmailOtp(dto);
  }

  @Post("send-phone-otp")
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

  @Post("verify-phone-otp")
  @UseGuards(JwtAuthGuard)
  verifyPhoneOtp(@Body() dto: VerifyOtpDto, @Req() req: Request & { user?: any }) {
    if (dto.userId !== req.user?.sub) {
      throw new ForbiddenException("Access denied");
    }
    return this.authService.verifyPhoneOtp(dto);
  }

  @Post("request-password-reset")
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
