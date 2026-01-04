"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const create_chat_dto_1 = require("./dto/create-chat.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    create(dto, req) {
        dto.senderId = req.user?.sub;
        return this.chatService.createMessage(dto);
    }
    startThread(body, req) {
        if (!body?.propertyId) {
            return { matchId: null };
        }
        return this.chatService.startThread(req.user?.sub, body.propertyId, body.message);
    }
    getConversations(req, limit, offset) {
        const parsedLimit = limit && !Number.isNaN(Number(limit)) ? Number(limit) : 20;
        const parsedOffset = offset && !Number.isNaN(Number(offset)) ? Number(offset) : 0;
        return this.chatService.getConversations(req.user?.sub, {
            limit: parsedLimit,
            offset: parsedOffset,
        });
    }
    getMessages(req, matchId, limit, before) {
        if (!matchId) {
            return [];
        }
        const parsedLimit = limit && !Number.isNaN(Number(limit)) ? Number(limit) : 50;
        const parsedBefore = before ? new Date(before) : undefined;
        const validBefore = parsedBefore && !Number.isNaN(parsedBefore.getTime())
            ? parsedBefore
            : undefined;
        return this.chatService.getMessagesForMatch(matchId, req.user?.sub, parsedLimit, validBefore);
    }
    markRead(body, req) {
        if (!body?.matchId) {
            return { updatedCount: 0 };
        }
        return this.chatService.markMatchRead(body.matchId, req.user?.sub);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_chat_dto_1.CreateChatDto, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "create", null);
__decorate([
    (0, common_1.Post)("start"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "startThread", null);
__decorate([
    (0, common_1.Get)("conversations"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("offset")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)("messages"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("matchId")),
    __param(2, (0, common_1.Query)("limit")),
    __param(3, (0, common_1.Query)("before")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Patch)("mark-read"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "markRead", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)("api/chat"),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map