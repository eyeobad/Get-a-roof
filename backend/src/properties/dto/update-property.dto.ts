import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PropertyStatus, PropertyType } from "../../common/enums";
import { PropertyAddressDto } from "./property-address.dto";
import { LandlordRequirementsDto } from "./landlord-requirements.dto";

export class UpdatePropertyDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyAddressDto)
  address?: PropertyAddressDto;

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
