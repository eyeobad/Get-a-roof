import { Module } from "@nestjs/common";
import { LandlordController } from "./landlord.controller";
import { LandlordService } from "./landlord.service";
import { PropertiesModule } from "../properties/properties.module";
import { MatchesModule } from "../matches/matches.module";

@Module({
  imports: [PropertiesModule, MatchesModule],
  controllers: [LandlordController],
  providers: [LandlordService],
})
export class LandlordModule {}
