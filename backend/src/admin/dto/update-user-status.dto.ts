import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserStatusDto {
  @IsBoolean()
  isSuspended: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
