import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MinLength,
    ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AddressDto } from "./address.dto";

export class CreateOrgDto {
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @IsNotEmpty()
    @IsString()
    lastName: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    @Matches(/^\+?[1-9]\d{7,14}$/, {
        message: "phoneNumber must be a valid international phone number",
    })
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsOptional()
    @IsString()
    recaptchaToken?: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @IsNotEmpty()
    @IsString()
    orgName: string;

    @IsOptional()
    @IsString()
    registrationNumber?: string;

    @IsOptional()
    @IsString()
    website?: string;
}
