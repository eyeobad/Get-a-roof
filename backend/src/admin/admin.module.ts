import { Module, OnModuleInit } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { Property, PropertySchema } from "../properties/schemas/property.schema";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { Message, MessageSchema } from "../chat/schemas/message.schema";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAudit, AdminAuditSchema } from "./schemas/admin-audit.schema";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }]),
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    MongooseModule.forFeature([{ name: AdminAudit.name, schema: AdminAuditSchema }]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule implements OnModuleInit {
  constructor(private readonly adminService: AdminService) {}

  async onModuleInit() {
    await this.adminService.seedDefaultAdmin();
  }
}
