import { IsMongoId, IsOptional, IsString } from "class-validator";

export class SubmitFacialScanDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
