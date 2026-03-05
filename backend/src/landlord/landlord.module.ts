import { Module } from "@nestjs/common";
import { LandlordController } from "./landlord.controller";
import { LandlordService } from "./landlord.service";
import { PropertiesModule } from "../properties/properties.module";
import { MatchesModule } from "../matches/matches.module";
import { UsersModule } from "../users/users.module";
import { WorkspaceModule } from "../common/services/workspace.module";

@Module({
  imports: [PropertiesModule, MatchesModule, UsersModule, WorkspaceModule],
  controllers: [LandlordController],
  providers: [LandlordService],
})
export class LandlordModule {}
