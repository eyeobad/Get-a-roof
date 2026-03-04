import { IsEnum, IsMongoId, IsOptional, IsBoolean } from "class-validator";
import { DismissReason, MatchStatus } from "../../common/enums";

export class CreateMatchDto {
  @IsOptional()
  @IsMongoId()
  tenantId?: string;

  @IsMongoId()
  propertyId: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsBoolean()
  tenantLiked?: boolean;

  @IsOptional()
  @IsEnum(DismissReason)
  dismissReason?: DismissReason;
}
