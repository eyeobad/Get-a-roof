import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PropertiesModule } from "./properties/properties.module";
import { MatchesModule } from "./matches/matches.module";
import { ChatModule } from "./chat/chat.module";
import { VerificationModule } from "./verification/verification.module";
import { LandlordModule } from "./landlord/landlord.module";
import { MailModule } from "./mail/mail.module";
import { AppwriteModule } from "./appwrite/appwrite.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get("THROTTLE_TTL") ?? 60),
            limit: Number(configService.get("THROTTLE_LIMIT") ?? 100),
          },
        ],
      }),
    }),
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
    MailModule,
    AppwriteModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
