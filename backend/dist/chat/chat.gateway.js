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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const websockets_2 = require("@nestjs/websockets");
const chat_service_1 = require("./chat.service");
const create_chat_dto_1 = require("./dto/create-chat.dto");
const jwt_1 = require("@nestjs/jwt");
let ChatGateway = class ChatGateway {
    constructor(chatService, jwtService) {
        this.chatService = chatService;
        this.jwtService = jwtService;
    }
    handleConnection(client) {
        const token = this.extractToken(client);
        if (!token) {
            client.disconnect();
            return;
        }
        try {
            const payload = this.jwtService.verify(token);
            client.data.user = payload;
        }
        catch (error) {
            client.disconnect();
        }
    }
    handleDisconnect(_client) { }
    handleJoin(body, client) {
        if (!body?.matchId) {
            throw new websockets_2.WsException("matchId is required");
        }
        client.join(body.matchId);
        return { joined: body.matchId };
    }
    async handleSendMessage(body, client) {
        if (!body?.matchId || !body?.receiverId || !body?.content) {
            throw new websockets_2.WsException("matchId, receiverId, and content are required");
        }
        const senderId = client.data.user?.sub;
        if (!senderId) {
            throw new websockets_2.WsException("Unauthorized");
        }
        const message = await this.chatService.createMessage({
            ...body,
            senderId,
        });
        this.server.to(body.matchId).emit("message", message);
        client.emit("message:sent", message);
        return message;
    }
    async handleMarkRead(body, client) {
        const readerId = client.data.user?.sub;
        if (!readerId) {
            throw new websockets_2.WsException("Unauthorized");
        }
        if (!body?.matchId) {
            throw new websockets_2.WsException("matchId is required");
        }
        const result = await this.chatService.markMatchRead(body.matchId, readerId);
        this.server.to(body.matchId).emit("messages:read", {
            matchId: body.matchId,
            readerId,
            updatedCount: result.updatedCount,
        });
        return result;
    }
    extractToken(client) {
        const authToken = client.handshake.auth?.token;
        if (authToken) {
            return authToken;
        }
        const header = client.handshake.headers.authorization;
        if (!header) {
            return undefined;
        }
        const [type, token] = header.split(" ");
        if (type === "Bearer" && token) {
            return token;
        }
        return header;
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("join"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("sendMessage"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_chat_dto_1.CreateChatDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("markRead"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkRead", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true }),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map