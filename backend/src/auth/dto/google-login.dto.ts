import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { UserRole } from "../../common/enums";

export class GoogleLoginDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
