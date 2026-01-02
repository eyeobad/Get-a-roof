import { IsMongoId } from "class-validator";

export class SendOtpDto {
  @IsMongoId()
  userId: string;
}
