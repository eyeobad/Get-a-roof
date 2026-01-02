import { IsBoolean, IsNumber, IsObject, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
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
  budgetRange?: BudgetRangeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
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
