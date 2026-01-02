import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PropertiesModule } from "./properties/properties.module";
import { MatchesModule } from "./matches/matches.module";
import { ChatModule } from "./chat/chat.module";
import { VerificationModule } from "./verification/verification.module";
import { LandlordModule } from "./landlord/landlord.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI") || "mongodb://127.0.0.1:27017/get-a-roof",
      }),
    }),
    AuthModule,
    UsersModule,
    PropertiesModule,
    MatchesModule,
    ChatModule,
    VerificationModule,
    LandlordModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
