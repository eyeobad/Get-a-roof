import { IsMongoId, IsOptional, IsString, MinLength } from "class-validator";

export class CreateChatDto {
  @IsMongoId()
  matchId: string;

  @IsOptional()
  @IsMongoId()
  senderId?: string;

  @IsMongoId()
  receiverId: string;

  @IsString()
  @MinLength(1)
  content: string;
}
