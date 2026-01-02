import { IsMongoId, IsOptional, IsString } from "class-validator";

export class UploadUtilityBillDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
