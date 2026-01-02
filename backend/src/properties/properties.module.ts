import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PropertiesController } from "./properties.controller";
import { PropertiesService } from "./properties.service";
import { Property, PropertySchema } from "./schemas/property.schema";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }]),
    UsersModule,
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
