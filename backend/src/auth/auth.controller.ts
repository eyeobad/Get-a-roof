import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

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
  sendEmailOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendEmailOtp(dto);
  }

  @Post("send-phone-otp")
  sendPhoneOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendPhoneOtp(dto);
  }

  @Post("verify-email-otp")
  verifyEmailOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmailOtp(dto);
  }

  @Post("verify-phone-otp")
  verifyPhoneOtp(@Body() dto: VerifyOtpDto) {
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
