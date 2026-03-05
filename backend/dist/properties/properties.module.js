"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const properties_controller_1 = require("./properties.controller");
const properties_service_1 = require("./properties.service");
const property_schema_1 = require("./schemas/property.schema");
const users_module_1 = require("../users/users.module");
const appwrite_module_1 = require("../appwrite/appwrite.module");
const match_schema_1 = require("../matches/schemas/match.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const message_schema_1 = require("../chat/schemas/message.schema");
const workspace_module_1 = require("../common/services/workspace.module");
let PropertiesModule = class PropertiesModule {
};
exports.PropertiesModule = PropertiesModule;
exports.PropertiesModule = PropertiesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: property_schema_1.Property.name, schema: property_schema_1.PropertySchema }]),
            mongoose_1.MongooseModule.forFeature([{ name: match_schema_1.Match.name, schema: match_schema_1.MatchSchema }]),
            mongoose_1.MongooseModule.forFeature([{ name: user_schema_1.User.name, schema: user_schema_1.UserSchema }]),
            mongoose_1.MongooseModule.forFeature([{ name: message_schema_1.Message.name, schema: message_schema_1.MessageSchema }]),
            users_module_1.UsersModule,
            appwrite_module_1.AppwriteModule,
            workspace_module_1.WorkspaceModule,
        ],
        controllers: [properties_controller_1.PropertiesController],
        providers: [properties_service_1.PropertiesService],
        exports: [properties_service_1.PropertiesService],
    })
], PropertiesModule);
