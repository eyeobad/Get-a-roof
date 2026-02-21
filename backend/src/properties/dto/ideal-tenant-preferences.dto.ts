import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { VehiclePreference } from "../../common/enums";
import { normalizeVehiclePreference } from "../../common/utils/property.utils";

export class IdealTenantPreferencesDto {
  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  employmentStatus?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsEnum(VehiclePreference)
  @Transform(({ value }) => normalizeVehiclePreference(value))
  vehicles?: VehiclePreference;

  @IsOptional()
  @IsBoolean()
  hasPets?: boolean;

  @IsOptional()
  @IsString()
  smokingHabits?: string;

  @IsOptional()
  @IsString()
  drinkingHabits?: string;

  @IsOptional()
  @IsString()
  religionPreference?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  socialHabits?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value).trim().toLowerCase();
    if (["have", "yes", "true"].includes(normalized)) {
      return true;
    }
    if (["dont", "don't", "no", "false"].includes(normalized)) {
      return false;
    }
    return undefined;
  })
  hasChildren?: boolean;
}
