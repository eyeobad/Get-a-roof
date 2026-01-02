import { IsEnum, IsOptional } from "class-validator";
import { MatchStatus } from "../../common/enums";

export class UpdateMatchDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
