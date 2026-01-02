import { BadRequestException, Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { UploadPassportDto } from "./dto/upload-passport.dto";
import { SubmitNinDto } from "./dto/submit-nin.dto";
import { UploadUtilityBillDto } from "./dto/upload-utility-bill.dto";
import { SubmitFacialScanDto } from "./dto/submit-facial-scan.dto";
import { VerificationStatus } from "../common/enums";

@Injectable()
export class VerificationService {
  constructor(private readonly usersService: UsersService) {}

  async uploadPassport(dto: UploadPassportDto) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    const user = await this.usersService.findById(dto.userId);
    const passportId = dto.passportId || dto.documentUrl;
    user.verificationDetails = {
      ...(user.verificationDetails || {}),
      passportId,
    };
    user.verificationStatus = VerificationStatus.Pending;
    await user.save();

    return { uploaded: true };
  }

  async submitNin(dto: SubmitNinDto) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    const user = await this.usersService.findById(dto.userId);
    user.verificationDetails = {
      ...(user.verificationDetails || {}),
      nin: dto.nin,
    };
    user.verificationStatus = VerificationStatus.Pending;
    await user.save();

    return { submitted: true };
  }

  async uploadUtilityBill(dto: UploadUtilityBillDto) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    const user = await this.usersService.findById(dto.userId);
    user.verificationDetails = {
      ...(user.verificationDetails || {}),
      utilityBillUrl: dto.documentUrl,
    };
    user.verificationStatus = VerificationStatus.Pending;
    await user.save();

    return { uploaded: true };
  }

  async submitFacialScan(dto: SubmitFacialScanDto) {
    if (!dto.userId) {
      throw new BadRequestException("userId is required");
    }
    const user = await this.usersService.findById(dto.userId);
    user.verificationDetails = {
      ...(user.verificationDetails || {}),
      facialScanUrl: dto.documentUrl,
    };
    user.verificationStatus = VerificationStatus.Pending;
    await user.save();

    return { submitted: true };
  }
}
