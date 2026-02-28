import { IsMongoId, IsOptional, IsString, MinLength } from "class-validator";

export class SendOtpDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  verificationToken?: string;
}
