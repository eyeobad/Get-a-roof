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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const message_schema_1 = require("./schemas/message.schema");
let ChatService = class ChatService {
    constructor(messageModel) {
        this.messageModel = messageModel;
    }
    async createMessage(dto) {
        if (!dto.senderId) {
            throw new common_1.BadRequestException("senderId is required");
        }
        const created = new this.messageModel({
            matchId: dto.matchId,
            senderId: dto.senderId,
            receiverId: dto.receiverId,
            content: dto.content,
            timestamp: new Date(),
            isRead: false,
        });
        return created.save();
    }
    async getConversations(userId, options) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;
        const pipeline = [
            {
                $match: {
                    $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
                },
            },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$matchId",
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$receiverId", userObjectId] },
                                        { $eq: ["$isRead", false] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    matchId: "$_id",
                    lastMessage: 1,
                    unreadCount: 1,
                },
            },
            { $sort: { "lastMessage.timestamp": -1 } },
        ];
        if (offset > 0) {
            pipeline.push({ $skip: offset });
        }
        if (limit > 0) {
            pipeline.push({ $limit: limit });
        }
        return this.messageModel.aggregate(pipeline).exec();
    }
    async getMessagesForMatch(matchId, limit = 50, before) {
        const filter = { matchId };
        if (before) {
            filter.timestamp = { $lt: before };
        }
        return this.messageModel
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .exec();
    }
    async markMatchRead(matchId, userId) {
        const result = await this.messageModel.updateMany({ matchId, receiverId: userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        return { updatedCount: result.modifiedCount };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ChatService);
//# sourceMappingURL=chat.service.js.map