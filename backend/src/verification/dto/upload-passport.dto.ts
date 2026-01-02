import { IsMongoId, IsOptional, IsString } from "class-validator";

export class UploadPassportDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  passportId?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
