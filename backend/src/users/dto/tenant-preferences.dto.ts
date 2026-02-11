import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { PropertyType, VehiclePreference } from "../../common/enums";
import {
  normalizePropertyType,
  normalizeVehiclePreference,
} from "../../common/utils/property.utils";

export class TenantPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) {
      return value;
    }
    return value
      .map((item) => normalizePropertyType(item) ?? item)
      .filter(Boolean);
  })
  lookingFor?: PropertyType[];

  @IsOptional()
  @IsString()
  gender?: string;

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
  @Transform(({ value }) => normalizeVehiclePreference(value))
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
