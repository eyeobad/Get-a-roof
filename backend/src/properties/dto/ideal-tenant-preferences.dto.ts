import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { VehiclePreference } from "../../common/enums";

export class IdealTenantPreferencesDto {
  @IsOptional()
  @IsString()
  employmentStatus?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsEnum(VehiclePreference)
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
  hasChildren?: boolean;
}
