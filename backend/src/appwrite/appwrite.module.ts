import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppwriteStorageService } from "./appwrite.service";

@Module({
  imports: [ConfigModule],
  providers: [AppwriteStorageService],
  exports: [AppwriteStorageService],
})
export class AppwriteModule {}
