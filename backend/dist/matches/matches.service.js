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
var MatchesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const match_schema_1 = require("./schemas/match.schema");
const enums_1 = require("../common/enums");
const users_service_1 = require("../users/users.service");
const properties_service_1 = require("../properties/properties.service");
const match_utils_1 = require("../common/utils/match.utils");
const message_schema_1 = require("../chat/schemas/message.schema");
const workspace_service_1 = require("../common/services/workspace.service");
const redis_cache_service_1 = require("../common/services/redis-cache.service");
const query_cache_1 = require("../properties/utils/query-cache");
const perf_utils_1 = require("../common/utils/perf.utils");
const DEFAULT_PAGE_LIMIT = 20;
const RECYCLE_COOLDOWN_DAYS = 14;
const TENANT_MATCH_CACHE_TTL_SECONDS = 30;
const VALID_TRANSITIONS = {
    [enums_1.MatchStatus.TenantLiked]: [
        enums_1.MatchStatus.LandlordQualified,
        enums_1.MatchStatus.ChatInitiated,
        enums_1.MatchStatus.Active,
        enums_1.MatchStatus.Archived,
        enums_1.MatchStatus.Closed,
        enums_1.MatchStatus.Dismissed,
    ],
    [enums_1.MatchStatus.LandlordQualified]: [
        enums_1.MatchStatus.ChatInitiated,
        enums_1.MatchStatus.Active,
        enums_1.MatchStatus.Archived,
        enums_1.MatchStatus.Closed,
        enums_1.MatchStatus.Dismissed,
    ],
    [enums_1.MatchStatus.ChatInitiated]: [
        enums_1.MatchStatus.Active,
        enums_1.MatchStatus.Archived,
        enums_1.MatchStatus.Closed,
        enums_1.MatchStatus.Dismissed,
    ],
    [enums_1.MatchStatus.Active]: [enums_1.MatchStatus.Archived, enums_1.MatchStatus.Closed, enums_1.MatchStatus.Dismissed],
    [enums_1.MatchStatus.Archived]: [
        enums_1.MatchStatus.TenantLiked,
        enums_1.MatchStatus.LandlordQualified,
        enums_1.MatchStatus.ChatInitiated,
        enums_1.MatchStatus.Active,
        enums_1.MatchStatus.Closed,
        enums_1.MatchStatus.Dismissed,
    ],
    [enums_1.MatchStatus.Closed]: [
        enums_1.MatchStatus.TenantLiked,
        enums_1.MatchStatus.LandlordQualified,
        enums_1.MatchStatus.ChatInitiated,
        enums_1.MatchStatus.Active,
        enums_1.MatchStatus.Dismissed,
    ],
    [enums_1.MatchStatus.Dismissed]: [enums_1.MatchStatus.TenantLiked],
};
const ACTIVE_MATCH_STATUSES = [
    enums_1.MatchStatus.TenantLiked,
    enums_1.MatchStatus.LandlordQualified,
    enums_1.MatchStatus.ChatInitiated,
    enums_1.MatchStatus.Active,
];
const CHAT_VISIBLE_STATUSES = [enums_1.MatchStatus.ChatInitiated, enums_1.MatchStatus.Active];
function toObjectId(id) {
    if (id instanceof mongoose_2.Types.ObjectId)
        return id;
    return new mongoose_2.Types.ObjectId(id);
}
function paginationStages(page = 1, limit = DEFAULT_PAGE_LIMIT) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }];
}
function isMongoDuplicateKeyError(error) {
    if (!error || typeof error !== "object")
        return false;
    const code = error.code;
    return code === 11000;
}
let MatchesService = MatchesService_1 = class MatchesService {
    constructor(matchModel, messageModel, usersService, propertiesService, workspaceService, redisCache) {
        this.matchModel = matchModel;
        this.messageModel = messageModel;
        this.usersService = usersService;
        this.propertiesService = propertiesService;
        this.workspaceService = workspaceService;
        this.redisCache = redisCache;
        this.logger = new common_1.Logger(MatchesService_1.name);
    }
    tenantMatchCacheKey(kind, tenantId, options) {
        return `tenant-matches:${kind}:${tenantId}:${(0, query_cache_1.stableStringify)(options ?? {})}`;
    }
    async clearTenantMatchCaches(tenantId) {
        await Promise.all([
            this.redisCache.deleteByPrefix(`tenant-matches:active:${tenantId}:`),
            this.redisCache.deleteByPrefix(`tenant-matches:recycled:${tenantId}:`),
        ]);
    }
    async createMatch(dto) {
        return (0, perf_utils_1.measureAsync)(this.logger, "createMatch", async () => {
            if (!dto.tenantId) {
                throw new common_1.BadRequestException("tenantId is required");
            }
            const tenantOid = toObjectId(dto.tenantId);
            const propertyOid = toObjectId(dto.propertyId);
            const [tenant, property, existing] = await Promise.all([
                this.usersService.findById(dto.tenantId),
                this.propertiesService.getProperty(dto.propertyId),
                this.matchModel
                    .findOne({ tenantId: tenantOid, propertyId: propertyOid })
                    .select("status tenantLiked")
                    .exec(),
            ]);
            const tenantPrefs = tenant.preferences?.tenant;
            const matchInput = {
                propertyType: property.propertyType,
                monthlyPrice: property.monthlyPrice,
                petFriendly: property.petFriendly,
                landlordRequirements: property.landlordRequirements,
                amenities: property.amenities,
                lat: property.address?.lat,
                lng: property.address?.lng,
            };
            const matchScoreData = (0, match_utils_1.computeMatchScore)({
                ...tenantPrefs,
                lat: tenant.address?.lat,
                lng: tenant.address?.lng,
            }, matchInput);
            const isDismiss = dto.tenantLiked === false;
            const baseStatus = isDismiss
                ? enums_1.MatchStatus.Dismissed
                : enums_1.MatchStatus.TenantLiked;
            const computedStatus = dto.status ||
                (baseStatus === enums_1.MatchStatus.TenantLiked && matchScoreData.matchScore >= 70
                    ? enums_1.MatchStatus.LandlordQualified
                    : baseStatus);
            const nextStatus = existing
                ? this.validateTransition(existing.status, existing.status === enums_1.MatchStatus.Dismissed && !isDismiss
                    ? enums_1.MatchStatus.TenantLiked
                    : computedStatus)
                : computedStatus;
            const nextValues = {
                landlordId: property.landlordId,
                status: nextStatus,
                tenantLiked: dto.tenantLiked ?? existing?.tenantLiked,
                matchScore: matchScoreData.matchScore,
                preferencesMatchPercentage: matchScoreData.preferencesMatchPercentage,
                apartmentPreferenceMatchPercentage: matchScoreData.apartmentPreferenceMatchPercentage,
                locationScore: matchScoreData.locationScore,
                amenityScore: matchScoreData.amenityScore,
                affordabilityScore: matchScoreData.affordabilityScore,
                timestamp: new Date(),
                dismissedAt: isDismiss ? new Date() : undefined,
                dismissReason: isDismiss
                    ? dto.dismissReason ?? enums_1.DismissReason.Soft
                    : undefined,
            };
            const update = {
                $set: nextValues,
                $setOnInsert: {
                    tenantId: tenantOid,
                    propertyId: propertyOid,
                },
                ...(isDismiss ? {} : { $unset: { dismissedAt: 1, dismissReason: 1 } }),
            };
            try {
                const saved = await this.matchModel
                    .findOneAndUpdate({ tenantId: tenantOid, propertyId: propertyOid }, update, { upsert: true, new: true })
                    .exec();
                await this.clearTenantMatchCaches(dto.tenantId);
                return saved;
            }
            catch (error) {
                if (!isMongoDuplicateKeyError(error)) {
                    throw error;
                }
                const saved = await this.matchModel
                    .findOneAndUpdate({ tenantId: tenantOid, propertyId: propertyOid }, update, { new: true })
                    .exec();
                if (!saved) {
                    throw error;
                }
                await this.clearTenantMatchCaches(dto.tenantId);
                return saved;
            }
        });
    }
    async updateMatch(id, dto) {
        const match = await this.matchModel.findById(id).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        if (dto.status) {
            match.status = this.validateTransition(match.status, dto.status);
        }
        return match.save();
    }
    async updateMatchForLandlord(id, dto, landlordId) {
        const match = await this.matchModel.findById(id).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        const property = await this.propertiesService.getProperty(match.propertyId.toString());
        const canManage = await this.workspaceService.canActorManageProperty(landlordId, property);
        if (!canManage) {
            throw new common_1.ForbiddenException("Access denied");
        }
        if (dto.status) {
            match.status = this.validateTransition(match.status, dto.status);
        }
        match.landlordSeenAt = new Date();
        return match.save();
    }
    async deleteMatch(matchId, tenantId) {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        if (match.tenantId.toString() !== tenantId) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const duplicateMatches = await this.matchModel
            .find({
            tenantId: match.tenantId,
            propertyId: match.propertyId,
        })
            .select("_id")
            .lean()
            .exec();
        const matchIds = duplicateMatches.map((item) => item._id);
        if (matchIds.length === 0) {
            return { success: true, deletedMatches: 0, deletedMessages: 0 };
        }
        const [deletedMessagesResult, deletedMatchesResult] = await Promise.all([
            this.messageModel.deleteMany({ matchId: { $in: matchIds } }),
            this.matchModel.deleteMany({ _id: { $in: matchIds } }),
        ]);
        await this.clearTenantMatchCaches(tenantId);
        return {
            success: true,
            deletedMatches: deletedMatchesResult.deletedCount ?? 0,
            deletedMessages: deletedMessagesResult.deletedCount ?? 0,
        };
    }
    async hardBlockMatch(matchId, tenantId) {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        if (match.tenantId.toString() !== tenantId) {
            throw new common_1.ForbiddenException("Access denied");
        }
        match.status = enums_1.MatchStatus.Dismissed;
        match.dismissReason = enums_1.DismissReason.Hard;
        match.dismissedAt = new Date();
        const saved = await match.save();
        await this.clearTenantMatchCaches(tenantId);
        return saved;
    }
    async archiveMatch(matchId, tenantId) {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        if (match.tenantId.toString() !== tenantId) {
            throw new common_1.ForbiddenException("Access denied");
        }
        if (match.status === enums_1.MatchStatus.Closed || match.status === enums_1.MatchStatus.Dismissed) {
            return { success: true, status: match.status };
        }
        match.status = this.validateTransition(match.status, enums_1.MatchStatus.Archived);
        match.tenantUnreadCount = 0;
        match.landlordUnreadCount = 0;
        await match.save();
        await this.clearTenantMatchCaches(tenantId);
        return { success: true, status: match.status };
    }
    async getRecyclableMatches(tenantId, options) {
        return (0, perf_utils_1.measureAsync)(this.logger, "getRecyclableMatches", async () => {
            const cacheKey = this.tenantMatchCacheKey("recycled", tenantId, options);
            const cached = await this.redisCache.getJson(cacheKey);
            if (cached) {
                return cached;
            }
            const cooldownDays = options?.cooldownDays ?? RECYCLE_COOLDOWN_DAYS;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - cooldownDays);
            const tenantOid = toObjectId(tenantId);
            const pipeline = [
                {
                    $match: {
                        tenantId: tenantOid,
                        status: enums_1.MatchStatus.Dismissed,
                        dismissReason: { $ne: enums_1.DismissReason.Hard },
                        dismissedAt: { $lte: cutoff },
                    },
                },
                {
                    $lookup: {
                        from: "properties",
                        localField: "propertyId",
                        foreignField: "_id",
                        as: "property",
                    },
                },
                { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        propertyUpdatedAfterDismiss: {
                            $cond: [
                                { $gt: ["$property.updatedAt", "$dismissedAt"] },
                                true,
                                false,
                            ],
                        },
                        recyclePriority: {
                            $cond: [
                                { $gt: ["$property.updatedAt", "$dismissedAt"] },
                                1,
                                2,
                            ],
                        },
                    },
                },
                { $sort: { recyclePriority: 1, matchScore: -1 } },
                ...paginationStages(options?.page, options?.limit),
                {
                    $lookup: {
                        from: "users",
                        localField: "landlordId",
                        foreignField: "_id",
                        as: "landlord",
                    },
                },
                { $unwind: { path: "$landlord", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        propertyId: 1,
                        tenantId: 1,
                        status: 1,
                        matchScore: 1,
                        dismissedAt: 1,
                        recycleCount: 1,
                        propertyUpdatedAfterDismiss: 1,
                        property: {
                            _id: "$property._id",
                            address: "$property.address",
                            monthlyPrice: "$property.monthlyPrice",
                            propertyType: "$property.propertyType",
                            listingIntent: "$property.listingIntent",
                            bedCount: "$property.bedCount",
                            bathCount: "$property.bathCount",
                            images: "$property.images",
                            amenities: "$property.amenities",
                            neighborhood: "$property.neighborhood",
                            updatedAt: "$property.updatedAt",
                        },
                        landlord: {
                            _id: "$landlord._id",
                            firstName: "$landlord.firstName",
                            lastName: "$landlord.lastName",
                            photoUrl: "$landlord.photoUrl",
                        },
                    },
                },
            ];
            const results = await this.matchModel.aggregate(pipeline).exec();
            await this.redisCache.setJson(cacheKey, results, TENANT_MATCH_CACHE_TTL_SECONDS);
            return results;
        });
    }
    async recycleDismissedMatch(matchId, tenantId) {
        const match = await this.matchModel.findById(matchId).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        if (match.tenantId.toString() !== tenantId) {
            throw new common_1.ForbiddenException("Access denied");
        }
        if (match.status !== enums_1.MatchStatus.Dismissed) {
            throw new common_1.BadRequestException("Match is not dismissed");
        }
        if (match.dismissReason === enums_1.DismissReason.Hard) {
            throw new common_1.BadRequestException("This match is permanently blocked");
        }
        await match.deleteOne();
        await this.clearTenantMatchCaches(tenantId);
        return { success: true };
    }
    async recycleDismissedMatchesBulk(matchIds, tenantId) {
        if (!matchIds?.length)
            return { success: true, count: 0 };
        const objectIds = matchIds
            .filter((id) => mongoose_2.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_2.Types.ObjectId(id));
        if (!objectIds.length)
            return { success: true, count: 0 };
        const result = await this.matchModel.deleteMany({
            _id: { $in: objectIds },
            tenantId: new mongoose_2.Types.ObjectId(tenantId),
            status: enums_1.MatchStatus.Dismissed,
            dismissReason: { $ne: enums_1.DismissReason.Hard },
        });
        await this.clearTenantMatchCaches(tenantId);
        return { success: true, count: result.deletedCount };
    }
    async findByProperty(propertyId) {
        return this.matchModel
            .find({
            propertyId: toObjectId(propertyId),
            status: { $in: ACTIVE_MATCH_STATUSES },
        })
            .exec();
    }
    async countByProperty(propertyId) {
        return this.matchModel
            .countDocuments({
            propertyId: toObjectId(propertyId),
            status: { $in: ACTIVE_MATCH_STATUSES },
        })
            .exec();
    }
    async countNewByProperty(propertyId) {
        return this.matchModel
            .countDocuments({
            propertyId: toObjectId(propertyId),
            status: { $in: ACTIVE_MATCH_STATUSES },
            $or: [
                { landlordSeenAt: { $exists: false } },
                { landlordSeenAt: null },
                { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
            ],
        })
            .exec();
    }
    async getMatchCountsByPropertyIds(propertyIds) {
        if (!propertyIds.length)
            return [];
        const oids = propertyIds.map(toObjectId);
        const pipeline = [
            {
                $match: {
                    propertyId: { $in: oids },
                    status: { $in: ACTIVE_MATCH_STATUSES },
                },
            },
            { $group: { _id: "$propertyId", count: { $sum: 1 } } },
        ];
        return this.matchModel.aggregate(pipeline).exec();
    }
    async getNewMatchCountsByPropertyIds(propertyIds) {
        if (!propertyIds.length)
            return [];
        const oids = propertyIds.map(toObjectId);
        const pipeline = [
            {
                $match: {
                    propertyId: { $in: oids },
                    status: { $in: ACTIVE_MATCH_STATUSES },
                    $or: [
                        { landlordSeenAt: { $exists: false } },
                        { landlordSeenAt: null },
                        { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
                    ],
                },
            },
            { $group: { _id: "$propertyId", count: { $sum: 1 } } },
        ];
        return this.matchModel.aggregate(pipeline).exec();
    }
    async getMatchesByMonthForPropertyIds(propertyIds, monthsBack = 6) {
        if (!propertyIds.length)
            return [];
        const oids = propertyIds.map(toObjectId);
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        start.setMonth(start.getMonth() - Math.max(0, monthsBack - 1));
        const pipeline = [
            {
                $match: {
                    propertyId: { $in: oids },
                    createdAt: { $gte: start },
                    status: { $in: ACTIVE_MATCH_STATUSES },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ];
        const rows = await this.matchModel.aggregate(pipeline).exec();
        return rows.map((row) => ({
            monthKey: row._id,
            count: row.count ?? 0,
        }));
    }
    async findPropertyIdsWithMatches(landlordPropertyIds) {
        if (!landlordPropertyIds.length)
            return [];
        const oids = landlordPropertyIds.map(toObjectId);
        const results = await this.matchModel
            .aggregate([
            {
                $match: {
                    propertyId: { $in: oids },
                    status: { $in: ACTIVE_MATCH_STATUSES },
                },
            },
            { $group: { _id: "$propertyId" } },
        ])
            .exec();
        return results.map((item) => item._id);
    }
    async getPropertyMatchesWithTenant(propertyId, options) {
        const propertyOid = toObjectId(propertyId);
        const pipeline = [
            {
                $match: {
                    propertyId: propertyOid,
                    status: { $in: ACTIVE_MATCH_STATUSES },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "tenantId",
                    foreignField: "_id",
                    as: "tenant",
                },
            },
            { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    propertyId: 1,
                    tenantId: 1,
                    status: 1,
                    matchScore: 1,
                    preferencesMatchPercentage: 1,
                    apartmentPreferenceMatchPercentage: 1,
                    locationScore: 1,
                    amenityScore: 1,
                    affordabilityScore: 1,
                    tenantLiked: 1,
                    timestamp: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    landlordSeenAt: 1,
                    isNewForLandlord: {
                        $cond: [
                            {
                                $or: [
                                    {
                                        $eq: [
                                            { $ifNull: ["$landlordSeenAt", null] },
                                            null,
                                        ],
                                    },
                                    { $gt: ["$updatedAt", "$landlordSeenAt"] },
                                ],
                            },
                            true,
                            false,
                        ],
                    },
                    tenant: {
                        _id: "$tenant._id",
                        firstName: "$tenant.firstName",
                        lastName: "$tenant.lastName",
                        email: "$tenant.email",
                        phoneNumber: "$tenant.phoneNumber",
                        photoUrl: "$tenant.photoUrl",
                        isVerified: "$tenant.isVerified",
                        preferences: "$tenant.preferences",
                    },
                },
            },
            { $sort: { matchScore: -1, updatedAt: -1 } },
            ...paginationStages(options?.page, options?.limit),
        ];
        return this.matchModel.aggregate(pipeline).exec();
    }
    async markMatchesSeenForProperty(propertyId) {
        const now = new Date();
        await this.matchModel.updateMany({ propertyId: toObjectId(propertyId), status: { $in: ACTIVE_MATCH_STATUSES } }, { $set: { landlordSeenAt: now } });
        return { propertyId, seenAt: now.toISOString() };
    }
    async landlordHasTenantMatch(landlordPropertyIds, tenantId) {
        if (!landlordPropertyIds.length)
            return false;
        const oids = landlordPropertyIds.map(toObjectId);
        const tenantOid = toObjectId(tenantId);
        const exists = await this.matchModel.exists({
            propertyId: { $in: oids },
            tenantId: tenantOid,
            status: { $in: ACTIVE_MATCH_STATUSES },
        });
        return Boolean(exists);
    }
    async getTenantMatches(tenantId, options) {
        return (0, perf_utils_1.measureAsync)(this.logger, "getTenantMatches", async () => {
            if (!mongoose_2.Types.ObjectId.isValid(tenantId)) {
                throw new common_1.BadRequestException("Invalid tenantId");
            }
            const cacheKey = this.tenantMatchCacheKey("active", tenantId, options);
            const cached = await this.redisCache.getJson(cacheKey);
            if (cached) {
                return cached;
            }
            const tenantOid = toObjectId(tenantId);
            const pipeline = [
                {
                    $match: {
                        tenantId: tenantOid,
                        status: { $in: ACTIVE_MATCH_STATUSES },
                    },
                },
                {
                    $lookup: {
                        from: "properties",
                        localField: "propertyId",
                        foreignField: "_id",
                        as: "property",
                    },
                },
                { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "users",
                        localField: "landlordId",
                        foreignField: "_id",
                        as: "landlord",
                    },
                },
                { $unwind: { path: "$landlord", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        lastMessage: "$lastMessage",
                        unreadCount: { $ifNull: ["$tenantUnreadCount", 0] },
                        landlordReplied: { $ifNull: ["$landlordReplied", 0] },
                    },
                },
                { $sort: { "lastMessage.timestamp": -1, updatedAt: -1, _id: -1 } },
                ...paginationStages(options?.page, options?.limit),
            ];
            const results = await this.matchModel.aggregate(pipeline).exec();
            await this.redisCache.setJson(cacheKey, results, TENANT_MATCH_CACHE_TTL_SECONDS);
            return results;
        });
    }
    validateTransition(current, incoming) {
        if (current === incoming)
            return incoming;
        const allowed = VALID_TRANSITIONS[current];
        if (!allowed || !allowed.includes(incoming)) {
            throw new common_1.BadRequestException(`Invalid status transition: ${current} → ${incoming}`);
        }
        return incoming;
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = MatchesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(match_schema_1.Match.name)),
    __param(1, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        properties_service_1.PropertiesService,
        workspace_service_1.WorkspaceService,
        redis_cache_service_1.RedisCacheService])
], MatchesService);
