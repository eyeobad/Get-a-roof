import { IsObject, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { TenantPreferencesDto } from "./tenant-preferences.dto";

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantPreferencesDto)
  tenant?: TenantPreferencesDto;

  @IsOptional()
  @IsObject()
  landlord?: Record<string, unknown>;
}
