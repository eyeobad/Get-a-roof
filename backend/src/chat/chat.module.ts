import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { Property, PropertySchema } from "../properties/schemas/property.schema";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { Message, MessageSchema } from "./schemas/message.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") || "dev-secret",
      }),
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
