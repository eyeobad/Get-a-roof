import {
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from "class-validator";

export class VerifyOtpDto {
  @IsMongoId()
  userId: string;

  @IsString()
  @Length(4, 8)
  otp: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  verificationToken?: string;
}
