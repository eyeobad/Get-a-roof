import { IsBoolean, IsOptional } from "class-validator";

export class LandlordPreferencesDto {
  @IsOptional()
  @IsBoolean()
  hasSeenLandlordTutorial?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSeenLandlordMatchesTutorial?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSeenLandlordMessagesTutorial?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSeenLandlordProfileTutorial?: boolean;
}
