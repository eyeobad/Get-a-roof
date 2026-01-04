import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { PropertyType, VehiclePreference } from "../../common/enums";

export class TenantPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  lookingFor?: PropertyType[];

  @IsOptional()
  @IsString()
  employmentStatus?: string;

  @IsOptional()
  @IsNumber()
  annualEarnings?: number;

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
  @IsBoolean()
  petFriendlyRequired?: boolean;

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

  @IsOptional()
  @IsNumber()
  maxCommuteRadius?: number;
}
