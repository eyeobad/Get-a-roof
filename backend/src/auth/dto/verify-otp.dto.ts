import { IsMongoId, IsString, Length } from "class-validator";

export class VerifyOtpDto {
  @IsMongoId()
  userId: string;

  @IsString()
  @Length(4, 8)
  otp: string;
}
