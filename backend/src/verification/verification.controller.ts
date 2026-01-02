import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { VerificationService } from "./verification.service";
import { UploadPassportDto } from "./dto/upload-passport.dto";
import { SubmitNinDto } from "./dto/submit-nin.dto";
import { UploadUtilityBillDto } from "./dto/upload-utility-bill.dto";
import { SubmitFacialScanDto } from "./dto/submit-facial-scan.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Controller("api/verification")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post("upload-passport")
  @UseGuards(JwtAuthGuard)
  uploadPassport(@Body() dto: UploadPassportDto, @Req() req: Request & { user?: any }) {
    dto.userId = req.user?.sub;
    return this.verificationService.uploadPassport(dto);
  }

  @Post("submit-nin")
  @UseGuards(JwtAuthGuard)
  submitNin(@Body() dto: SubmitNinDto, @Req() req: Request & { user?: any }) {
    dto.userId = req.user?.sub;
    return this.verificationService.submitNin(dto);
  }

  @Post("upload-utility-bill")
  @UseGuards(JwtAuthGuard)
  uploadUtilityBill(@Body() dto: UploadUtilityBillDto, @Req() req: Request & { user?: any }) {
    dto.userId = req.user?.sub;
    return this.verificationService.uploadUtilityBill(dto);
  }

  @Post("submit-facial-scan")
  @UseGuards(JwtAuthGuard)
  submitFacialScan(@Body() dto: SubmitFacialScanDto, @Req() req: Request & { user?: any }) {
    dto.userId = req.user?.sub;
    return this.verificationService.submitFacialScan(dto);
  }
}
