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
const redis_cache_service_1 = require("../common/services/redis-cache.service");
const match_utils_1 = require("../common/utils/match.utils");
const ROUTE_REQUEST_PREFIX = "__route_request__:";
const CHAT_VISIBLE_STATUSES = [enums_1.MatchStatus.ChatInitiated, enums_1.MatchStatus.Active];
function isMongoDuplicateKeyError(error) {
    if (!error || typeof error !== "object")
        return false;
    const code = error.code;
    return code === 11000;
}
let ChatService = class ChatService {
    constructor(messageModel, matchModel, propertyModel, userModel, workspaceService, redisCache) {
        this.messageModel = messageModel;
        this.matchModel = matchModel;
        this.propertyModel = propertyModel;
        this.userModel = userModel;
        this.workspaceService = workspaceService;
        this.redisCache = redisCache;
    }
    async clearTenantMatchCaches(tenantId) {
        await Promise.all([
            this.redisCache.deleteByPrefix(`tenant-matches:active:${tenantId}:`),
            this.redisCache.deleteByPrefix(`tenant-matches:recycled:${tenantId}:`),
        ]);
    }
    async applyMatchScore(match, property, tenantId) {
        const tenant = await this.userModel.findById(tenantId).lean().exec();
        if (!tenant)
            return false;
        const tenantPrefs = (tenant
            .preferences?.tenant ?? {});
        const tenantAddress = tenant
            .address;
        const propertyAddress = property
            .address;
        const matchInput = {
            propertyType: property.propertyType,
            monthlyPrice: property.monthlyPrice,
            petFriendly: property.petFriendly,
            landlordRequirements: property.landlordRequirements,
            amenities: property.amenities,
            lat: propertyAddress?.lat,
            lng: propertyAddress?.lng,
        };
        const nextScore = (0, match_utils_1.computeMatchScore)({
            ...tenantPrefs,
            lat: tenantAddress?.lat,
            lng: tenantAddress?.lng,
        }, matchInput);
        const changed = match.matchScore !== nextScore.matchScore ||
            match.preferencesMatchPercentage !== nextScore.preferencesMatchPercentage ||
            match.apartmentPreferenceMatchPercentage !==
                nextScore.apartmentPreferenceMatchPercentage ||
            match.locationScore !== nextScore.locationScore ||
            match.amenityScore !== nextScore.amenityScore ||
            match.affordabilityScore !== nextScore.affordabilityScore;
        if (!changed)
            return false;
        match.matchScore = nextScore.matchScore;
        match.preferencesMatchPercentage = nextScore.preferencesMatchPercentage;
        match.apartmentPreferenceMatchPercentage =
            nextScore.apartmentPreferenceMatchPercentage;
        match.locationScore = nextScore.locationScore;
        match.amenityScore = nextScore.amenityScore;
        match.affordabilityScore = nextScore.affordabilityScore;
        return true;
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
    buildConversationResponse(match, property, lastMessage, participants, currentUserId) {
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
            lastMessage: lastMessage || match.lastMessage
                ? {
                    content: lastMessage?.content ?? match.lastMessage?.content,
                    timestamp: lastMessage?.timestamp ?? match.lastMessage?.timestamp,
                }
                : null,
            unreadCount: currentUserId && match.tenantId?.toString?.() === currentUserId
                ? match.tenantUnreadCount ?? 0
                : match.landlordUnreadCount ?? 0,
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
        const senderIsTenant = dto.senderId === tenantId;
        const nextStatus = match.status === enums_1.MatchStatus.Closed
            ? enums_1.MatchStatus.Closed
            : enums_1.MatchStatus.Active;
        await this.matchModel.findByIdAndUpdate(dto.matchId, {
            $set: {
                status: nextStatus,
                updatedAt: new Date(),
                landlordId: property.landlordId,
                ...(senderIsTenant ? {} : { landlordReplied: true }),
                lastMessage: {
                    content: saved.content,
                    senderId: saved.senderId,
                    timestamp: saved.timestamp,
                },
                ...(senderIsTenant
                    ? { tenantUnreadCount: 0 }
                    : { landlordUnreadCount: 0 }),
                ...matchPatch,
            },
            $inc: senderIsTenant
                ? { landlordUnreadCount: 1 }
                : { tenantUnreadCount: 1 },
        });
        await this.clearTenantMatchCaches(tenantId);
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
                    status: { $in: CHAT_VISIBLE_STATUSES },
                    $or: [
                        { tenantId: { $in: [userObjectId, userId] } },
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
                $addFields: {
                    lastMessage: "$lastMessage",
                    unreadCount: {
                        $cond: [
                            { $eq: [{ $toString: "$tenantId" }, userId] },
                            { $ifNull: ["$tenantUnreadCount", 0] },
                            { $ifNull: ["$landlordUnreadCount", 0] },
                        ],
                    },
                },
            },
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
            { $sort: { "lastMessage.timestamp": -1, updatedAt: -1, _id: -1 } },
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
        const { match } = await this.assertMatchMembership(matchId, userId);
        const result = await this.messageModel.updateMany({ matchId, receiverId: userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        const isTenant = match.tenantId.toString() === userId;
        await this.matchModel.findByIdAndUpdate(matchId, {
            $set: isTenant ? { tenantUnreadCount: 0 } : { landlordUnreadCount: 0 },
        });
        await this.clearTenantMatchCaches(match.tenantId.toString());
        return { updatedCount: result.modifiedCount };
    }
    async startThread(tenantId, propertyId, message) {
        if (!mongoose_2.Types.ObjectId.isValid(tenantId) || !mongoose_2.Types.ObjectId.isValid(propertyId)) {
            throw new common_1.BadRequestException("Invalid tenantId or propertyId");
        }
        const tenantOid = new mongoose_2.Types.ObjectId(tenantId);
        const propertyOid = new mongoose_2.Types.ObjectId(propertyId);
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
        let match = null;
        try {
            match = await this.matchModel
                .findOneAndUpdate({
                $or: [
                    { tenantId: tenantOid, propertyId: propertyOid },
                    { tenantId, propertyId },
                ],
            }, {
                $setOnInsert: {
                    tenantId: tenantOid,
                    propertyId: propertyOid,
                    landlordId: property.landlordId,
                    status: enums_1.MatchStatus.TenantLiked,
                    tenantLiked: true,
                    timestamp: new Date(),
                },
            }, {
                upsert: true,
                new: true,
            })
                .exec();
        }
        catch (error) {
            if (!isMongoDuplicateKeyError(error)) {
                throw error;
            }
            match = await this.matchModel
                .findOne({
                $or: [
                    { tenantId: tenantOid, propertyId: propertyOid },
                    { tenantId, propertyId },
                ],
            })
                .exec();
        }
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        let shouldNormalize = false;
        const currentTenantId = match.tenantId?.toString?.() ?? String(match.tenantId);
        const currentPropertyId = match.propertyId?.toString?.() ?? String(match.propertyId);
        if (currentTenantId === tenantId && !(match.tenantId instanceof mongoose_2.Types.ObjectId)) {
            match.tenantId = tenantOid;
            shouldNormalize = true;
        }
        if (currentPropertyId === propertyId && !(match.propertyId instanceof mongoose_2.Types.ObjectId)) {
            match.propertyId = propertyOid;
            shouldNormalize = true;
        }
        if (shouldNormalize) {
            await match.save();
        }
        if (!match.landlordId) {
            match.landlordId = property.landlordId;
        }
        if (match.status !== enums_1.MatchStatus.ChatInitiated &&
            match.status !== enums_1.MatchStatus.Active) {
            match.status = enums_1.MatchStatus.ChatInitiated;
        }
        if (match.tenantLiked !== true) {
            match.tenantLiked = true;
        }
        await this.applyMatchScore(match, property, tenantId);
        await match.save();
        await this.clearTenantMatchCaches(tenantId);
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
        }, tenantId);
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
        let shouldSave = false;
        if (!match.landlordId) {
            match.landlordId = property.landlordId;
            shouldSave = true;
        }
        if (match.status !== enums_1.MatchStatus.ChatInitiated &&
            match.status !== enums_1.MatchStatus.Active) {
            match.status = enums_1.MatchStatus.ChatInitiated;
            shouldSave = true;
        }
        if (await this.applyMatchScore(match, property, match.tenantId.toString())) {
            shouldSave = true;
        }
        if (shouldSave) {
            await match.save();
            await this.clearTenantMatchCaches(match.tenantId.toString());
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
        }, landlordId);
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
        if (!CHAT_VISIBLE_STATUSES.includes(match.status)) {
            throw new common_1.ForbiddenException("Chat is not active for this match");
        }
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
        workspace_service_1.WorkspaceService,
        redis_cache_service_1.RedisCacheService])
], ChatService);
