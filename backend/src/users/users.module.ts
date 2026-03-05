import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User, UserSchema } from "./schemas/user.schema";
import { AppwriteModule } from "../appwrite/appwrite.module";
import { Property, PropertySchema } from "../properties/schemas/property.schema";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { Message, MessageSchema } from "../chat/schemas/message.schema";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Property.name, schema: PropertySchema },
      { name: Match.name, schema: MatchSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    AppwriteModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
