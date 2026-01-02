import { IsMongoId, IsOptional, IsString } from "class-validator";

export class SubmitNinDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsString()
  nin: string;
}
