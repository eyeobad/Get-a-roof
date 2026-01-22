import { IsBoolean, IsNumber, IsObject, IsOptional, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";
import { IdealTenantPreferencesDto } from "./ideal-tenant-preferences.dto";

export class BudgetRangeDto {
  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;
}

export class LandlordRequirementsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return value;
    }
    if (typeof value === "number") {
      return { max: value };
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return { max: parsed };
      }
    }
    return value;
  })
  budgetRange?: BudgetRangeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return value;
    }
    if (typeof value === "number") {
      return { min: value };
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return { min: parsed };
      }
    }
    return value;
  })
  annualIncome?: BudgetRangeDto;

  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  nonOwnerOccupied?: boolean;

  @IsOptional()
  @IsBoolean()
  sharedApartment?: boolean;

  @IsOptional()
  @IsBoolean()
  shortlet?: boolean;

  @IsOptional()
  @IsBoolean()
  selfCompound?: boolean;

  @IsOptional()
  @IsBoolean()
  sharedCompound?: boolean;

  @IsOptional()
  @IsObject()
  tenantPreferences?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => IdealTenantPreferencesDto)
  idealTenantPreferences?: IdealTenantPreferencesDto;
}
