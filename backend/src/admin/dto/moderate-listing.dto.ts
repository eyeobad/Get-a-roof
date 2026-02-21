import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ModerateListingDto {
  @IsIn(["approve", "reject", "hide"])
  action: "approve" | "reject" | "hide";

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
