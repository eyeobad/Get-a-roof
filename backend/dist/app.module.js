"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const app_controller_1 = require("./app.controller");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const properties_module_1 = require("./properties/properties.module");
const matches_module_1 = require("./matches/matches.module");
const chat_module_1 = require("./chat/chat.module");
const verification_module_1 = require("./verification/verification.module");
const landlord_module_1 = require("./landlord/landlord.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get("MONGODB_URI") || "mongodb://127.0.0.1:27017/get-a-roof",
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            properties_module_1.PropertiesModule,
            matches_module_1.MatchesModule,
            chat_module_1.ChatModule,
            verification_module_1.VerificationModule,
            landlord_module_1.LandlordModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map