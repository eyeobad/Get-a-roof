import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
} from "class-validator";
import { UserRole } from "../../common/enums";

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  firebaseIdToken: string;

  @IsOptional()
  @IsString()
  email?: string;

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
