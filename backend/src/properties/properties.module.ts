import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PropertiesController } from "./properties.controller";
import { PropertiesService } from "./properties.service";
import { Property, PropertySchema } from "./schemas/property.schema";
import { UsersModule } from "../users/users.module";
import { AppwriteModule } from "../appwrite/appwrite.module";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { User, UserSchema } from "../users/schemas/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }]),
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
    AppwriteModule,
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
