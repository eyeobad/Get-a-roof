import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";
import { Match, MatchSchema } from "./schemas/match.schema";
import { UsersModule } from "../users/users.module";
import { PropertiesModule } from "../properties/properties.module";
import { Message, MessageSchema } from "../chat/schemas/message.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    UsersModule,
    PropertiesModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
