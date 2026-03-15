import { IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { LandlordPreferencesDto } from "./landlord-preferences.dto";
import { TenantPreferencesDto } from "./tenant-preferences.dto";

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantPreferencesDto)
  tenant?: TenantPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandlordPreferencesDto)
  landlord?: LandlordPreferencesDto;
}
