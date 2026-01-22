import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { PropertyStatus, PropertyType } from "../../common/enums";
import { PropertyAddressDto } from "./property-address.dto";
import { LandlordRequirementsDto } from "./landlord-requirements.dto";
import { normalizePropertyType } from "../../common/utils/property.utils";

export class CreatePropertyDto {
  @IsOptional()
  @IsMongoId()
  landlordId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @IsOptional()
  @ValidateNested()
  @Transform(({ value }) =>
    typeof value === "string" ? { street: value } : value
  )
  @Type(() => PropertyAddressDto)
  address?: PropertyAddressDto;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsNumber()
  bedCount?: number;

  @IsOptional()
  @IsNumber()
  bathCount?: number;

  @IsOptional()
  @IsNumber()
  sqFt?: number;

  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @IsOptional()
  @IsEnum(PropertyType)
  @Transform(({ value }) => normalizePropertyType(value))
  propertyType?: PropertyType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsString()
  proofOfOwnership?: string;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandlordRequirementsDto)
  landlordRequirements?: LandlordRequirementsDto;
}
