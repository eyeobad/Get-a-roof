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
const match_schema_1 = require("../matches/schemas/match.schema");
const property_schema_1 = require("../properties/schemas/property.schema");
const enums_1 = require("../common/enums");
const user_schema_1 = require("../users/schemas/user.schema");
const workspace_service_1 = require("../common/services/workspace.service");
const ROUTE_REQUEST_PREFIX = "__route_request__:";
let ChatService = class ChatService {
    constructor(messageModel, matchModel, propertyModel, userModel, workspaceService) {
        this.messageModel = messageModel;
        this.matchModel = matchModel;
        this.propertyModel = propertyModel;
        this.userModel = userModel;
        this.workspaceService = workspaceService;
    }
    parseRouteRequestPayload(content) {
        if (!content?.startsWith(ROUTE_REQUEST_PREFIX)) {
            return null;
        }
        try {
            const parsed = JSON.parse(content.slice(ROUTE_REQUEST_PREFIX.length));
            if (parsed &&
                parsed.kind === "route-access" &&
                typeof parsed.id === "string" &&
                (parsed.status === "pending" ||
                    parsed.status === "approved" ||
                    parsed.status === "denied")) {
                if (parsed.tenantLocation) {
                    const { lat, lng } = parsed.tenantLocation;
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                        return null;
                    }
                }
                if (parsed.ttlMinutes !== undefined && ![5, 30, 1440].includes(parsed.ttlMinutes)) {
                    return null;
                }
                return parsed;
            }
        }
        catch {
            return null;
        }
        return null;
    }
    buildConversationResponse(match, property, lastMessage, participants) {
        const propertyObject = property.toObject ? property.toObject() : property;
        const landlordId = propertyObject?.landlordId;
        const tenant = this.toUserSummary(participants?.tenant);
        const landlord = this.toUserSummary(participants?.landlord);
        return {
            matchId: match.id,
            tenantId: match.tenantId?.toString?.() ?? match.tenantId,
            property: {
                ...propertyObject,
                landlordId: landlordId?.toString?.() ?? landlordId,
            },
            tenant: tenant ?? undefined,
            landlord: landlord ?? undefined,
            lastMessage: lastMessage
                ? { content: lastMessage.content, timestamp: lastMessage.timestamp }
                : null,
            unreadCount: 0,
        };
    }
    toUserSummary(user) {
        if (!user)
            return null;
        return {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: user.photoUrl,
        };
    }
    async createMessage(dto) {
        if (!dto.senderId) {
            throw new common_1.BadRequestException("senderId is required");
        }
        const { match, property } = await this.assertChatParticipant(dto.matchId, dto.senderId, dto.receiverId);
        const routePayload = this.parseRouteRequestPayload(dto.content);
        const tenantId = match.tenantId.toString();
        const landlordId = property.landlordId.toString();
        const matchPatch = {};
        if (routePayload) {
            if (routePayload.status === "pending") {
                if (dto.senderId !== tenantId) {
                    throw new common_1.ForbiddenException("Only tenant can request route access");
                }
                if (!routePayload.tenantLocation) {
                    throw new common_1.BadRequestException("Tenant location is required for route request");
                }
                matchPatch.routeAccessStatus = enums_1.RouteAccessStatus.Pending;
                matchPatch.routeAccessRequestedAt = new Date();
                matchPatch.routeAccessRespondedAt = null;
                matchPatch.routeAccessExpiresAt = null;
                matchPatch.routeOriginLat = routePayload.tenantLocation.lat;
                matchPatch.routeOriginLng = routePayload.tenantLocation.lng;
            }
            if (routePayload.status === "approved" || routePayload.status === "denied") {
                const canManage = await this.workspaceService.canActorManageProperty(dto.senderId, property);
                if (!canManage) {
                    throw new common_1.ForbiddenException("Only landlord can approve or deny route access");
                }
                matchPatch.routeAccessStatus =
                    routePayload.status === "approved"
                        ? enums_1.RouteAccessStatus.Approved
                        : enums_1.RouteAccessStatus.Denied;
                matchPatch.routeAccessRespondedAt = new Date();
                if (routePayload.status === "approved") {
                    const ttl = routePayload.ttlMinutes ?? 30;
                    if (![5, 30, 1440].includes(ttl)) {
                        throw new common_1.BadRequestException("Invalid route access duration");
                    }
                    matchPatch.routeAccessExpiresAt = new Date(Date.now() + ttl * 60 * 1000);
                }
                else {
                    matchPatch.routeAccessExpiresAt = null;
                }
            }
        }
        const created = new this.messageModel({
            matchId: dto.matchId,
            senderId: dto.senderId,
            receiverId: dto.receiverId,
            content: dto.content,
            timestamp: new Date(),
            isRead: false,
        });
        const saved = await created.save();
        await this.matchModel.findByIdAndUpdate(dto.matchId, {
            status: match.status === enums_1.MatchStatus.LandlordQualified
                ? enums_1.MatchStatus.ChatInitiated
                : match.status,
            updatedAt: new Date(),
            ...matchPatch,
        });
        return saved;
    }
    async getConversations(userId, options) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            throw new common_1.BadRequestException("Invalid userId");
        }
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;
        const context = await this.workspaceService.getWorkspaceActorContext(userId);
        const landlordVisibilityIds = (context.scope === "owner" ? context.orgMemberIds : [userId])
            .filter((id) => mongoose_2.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_2.Types.ObjectId(id));
        const pipeline = [
            {
                $lookup: {
                    from: "properties",
                    let: { propId: "$propertyId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$_id" }, { $toString: "$$propId" }],
                                },
                            },
                        },
                    ],
                    as: "property",
                },
            },
            { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    status: { $ne: enums_1.MatchStatus.Dismissed },
                    $or: [
                        { tenantId: userObjectId },
                        { "property.landlordId": { $in: landlordVisibilityIds } },
                    ],
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: { tenantId: "$tenantId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$_id" }, { $toString: "$$tenantId" }],
                                },
                            },
                        },
                        { $project: { firstName: 1, lastName: 1, photoUrl: 1 } },
                    ],
                    as: "tenant",
                },
            },
            { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    let: { landlordId: "$property.landlordId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$_id" }, { $toString: "$$landlordId" }],
                                },
                            },
                        },
                        { $project: { firstName: 1, lastName: 1, photoUrl: 1 } },
                    ],
                    as: "landlord",
                },
            },
            { $unwind: { path: "$landlord", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "messages",
                    let: {
                        matchId: "$_id",
                        currentUserId: userId,
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$matchId" }, { $toString: "$$matchId" }],
                                },
                            },
                        },
                        { $sort: { timestamp: -1 } },
                        {
                            $group: {
                                _id: null,
                                lastMessage: { $first: "$$ROOT" },
                                unreadCount: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            { $toString: "$receiverId" },
                                                            "$$currentUserId",
                                                        ],
                                                    },
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
                        { $project: { _id: 0, lastMessage: 1, unreadCount: 1 } },
                    ],
                    as: "messageMeta",
                },
            },
            {
                $addFields: {
                    lastMessage: {
                        $ifNull: [{ $arrayElemAt: ["$messageMeta.lastMessage", 0] }, null],
                    },
                    unreadCount: {
                        $ifNull: [{ $arrayElemAt: ["$messageMeta.unreadCount", 0] }, 0],
                    },
                },
            },
            { $unset: "messageMeta" },
            {
                $project: {
                    matchId: "$_id",
                    property: 1,
                    tenantId: 1,
                    tenant: {
                        _id: "$tenant._id",
                        firstName: "$tenant.firstName",
                        lastName: "$tenant.lastName",
                        photoUrl: "$tenant.photoUrl",
                    },
                    landlord: {
                        _id: "$landlord._id",
                        firstName: "$landlord.firstName",
                        lastName: "$landlord.lastName",
                        photoUrl: "$landlord.photoUrl",
                    },
                    lastMessage: 1,
                    unreadCount: 1,
                    updatedAt: 1,
                },
            },
            { $sort: { "lastMessage.timestamp": -1, updatedAt: -1 } },
        ];
        if (offset > 0) {
            pipeline.push({ $skip: offset });
        }
        if (limit > 0) {
            pipeline.push({ $limit: limit });
        }
        return this.matchModel.aggregate(pipeline).exec();
    }
    async getMessagesForMatch(matchId, userId, limit = 50, before) {
        await this.assertMatchMembership(matchId, userId);
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
        await this.assertMatchMembership(matchId, userId);
        const result = await this.messageModel.updateMany({ matchId, receiverId: userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        return { updatedCount: result.modifiedCount };
    }
    async startThread(tenantId, propertyId, message) {
        const property = await this.propertyModel.findById(propertyId).exec();
        if (!property) {
            throw new common_1.NotFoundException("Property not found");
        }
        const landlordId = property.landlordId?.toString?.();
        if (!landlordId) {
            throw new common_1.NotFoundException("Property not found");
        }
        const [tenantUser, landlordUser] = await Promise.all([
            this.userModel.findById(tenantId).exec(),
            this.userModel.findById(landlordId).exec(),
        ]);
        if (!landlordUser) {
            throw new common_1.NotFoundException("Property not found");
        }
        if (landlordId === tenantId) {
            throw new common_1.ForbiddenException("Cannot message your own property");
        }
        let match = await this.matchModel
            .findOne({ tenantId, propertyId })
            .exec();
        if (!match) {
            match = new this.matchModel({
                tenantId,
                propertyId,
                status: enums_1.MatchStatus.TenantLiked,
                tenantLiked: true,
                timestamp: new Date(),
            });
            await match.save();
        }
        if (match.status !== enums_1.MatchStatus.ChatInitiated) {
            match.status = enums_1.MatchStatus.ChatInitiated;
        }
        if (match.tenantLiked !== true) {
            match.tenantLiked = true;
        }
        await match.save();
        let createdMessage;
        if (message) {
            createdMessage = await this.createMessage({
                matchId: match.id,
                senderId: tenantId,
                receiverId: property.landlordId.toString(),
                content: message,
            });
        }
        return this.buildConversationResponse(match, property, createdMessage, {
            tenant: tenantUser,
            landlord: landlordUser,
        });
    }
    async startLandlordThread(matchId, landlordId, message) {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        const property = await this.propertyModel
            .findById(match.propertyId)
            .exec();
        if (!property) {
            throw new common_1.NotFoundException("Property not found");
        }
        const resolvedLandlordId = property.landlordId?.toString?.();
        if (!resolvedLandlordId) {
            throw new common_1.NotFoundException("Property not found");
        }
        const [tenantUser, landlordUser] = await Promise.all([
            this.userModel.findById(match.tenantId).exec(),
            this.userModel.findById(resolvedLandlordId).exec(),
        ]);
        if (!landlordUser) {
            throw new common_1.NotFoundException("Property not found");
        }
        const canManage = await this.workspaceService.canActorManageProperty(landlordId, property);
        if (!canManage) {
            throw new common_1.ForbiddenException("Access denied");
        }
        if (match.status !== enums_1.MatchStatus.ChatInitiated) {
            match.status = enums_1.MatchStatus.ChatInitiated;
            await match.save();
        }
        let createdMessage;
        if (message) {
            createdMessage = await this.createMessage({
                matchId: match.id,
                senderId: landlordId,
                receiverId: match.tenantId.toString(),
                content: message,
            });
        }
        return this.buildConversationResponse(match, property, createdMessage, {
            tenant: tenantUser,
            landlord: landlordUser,
        });
    }
    async assertMatchMembership(matchId, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(matchId)) {
            throw new common_1.BadRequestException("Invalid matchId");
        }
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        const property = await this.propertyModel
            .findById(match.propertyId)
            .exec();
        if (!property) {
            throw new common_1.NotFoundException("Property not found");
        }
        const tenantId = match.tenantId?.toString?.();
        const landlordId = property.landlordId?.toString?.();
        if (!tenantId || !landlordId) {
            throw new common_1.NotFoundException("Property not found");
        }
        const isTenant = tenantId === userId;
        const isAuthorizedLandlord = isTenant
            ? false
            : await this.workspaceService.canActorManageProperty(userId, property);
        if (!isTenant && !isAuthorizedLandlord) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return { match, property };
    }
    async getParticipantIds(matchId) {
        if (!mongoose_2.Types.ObjectId.isValid(matchId)) {
            throw new common_1.BadRequestException("Invalid matchId");
        }
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        const property = await this.propertyModel
            .findById(match.propertyId)
            .exec();
        if (!property) {
            throw new common_1.NotFoundException("Property not found");
        }
        const tenantId = match.tenantId?.toString?.();
        const landlordId = property.landlordId?.toString?.();
        if (!tenantId || !landlordId) {
            throw new common_1.NotFoundException("Property not found");
        }
        return { tenantId, landlordId, property };
    }
    async assertChatParticipant(matchId, senderId, receiverId) {
        const { match, property } = await this.assertMatchMembership(matchId, senderId);
        const tenantId = match.tenantId.toString();
        const landlordId = property.landlordId.toString();
        const allowed = new Set([tenantId, landlordId]);
        if (!allowed.has(receiverId) || receiverId === senderId) {
            throw new common_1.ForbiddenException("Invalid receiver");
        }
        return { match, property };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __param(1, (0, mongoose_1.InjectModel)(match_schema_1.Match.name)),
    __param(2, (0, mongoose_1.InjectModel)(property_schema_1.Property.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        workspace_service_1.WorkspaceService])
], ChatService);
