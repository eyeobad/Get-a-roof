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
let MatchesService = class MatchesService {
    constructor(matchModel, messageModel, usersService, propertiesService) {
        this.matchModel = matchModel;
        this.messageModel = messageModel;
        this.usersService = usersService;
        this.propertiesService = propertiesService;
    }
    async createMatch(dto) {
        if (!dto.tenantId) {
            throw new common_1.BadRequestException("tenantId is required");
        }
        const tenant = await this.usersService.findById(dto.tenantId);
        const property = await this.propertiesService.getProperty(dto.propertyId);
        const matchInput = {
            propertyType: property.propertyType,
            monthlyPrice: property.monthlyPrice,
            petFriendly: property.petFriendly,
            landlordRequirements: property.landlordRequirements,
        };
        const matchScoreData = (0, match_utils_1.computeMatchScore)(tenant.preferences?.tenant, matchInput);
        const baseStatus = dto.tenantLiked === false ? enums_1.MatchStatus.Dismissed : enums_1.MatchStatus.TenantLiked;
        const computedStatus = dto.status ||
            (baseStatus === enums_1.MatchStatus.TenantLiked && matchScoreData.matchScore >= 70
                ? enums_1.MatchStatus.LandlordQualified
                : baseStatus);
        const existing = await this.matchModel
            .findOne({ tenantId: dto.tenantId, propertyId: dto.propertyId })
            .exec();
        if (existing) {
            existing.tenantLiked = dto.tenantLiked ?? existing.tenantLiked;
            existing.status = this.mergeMatchStatus(existing.status, computedStatus);
            existing.matchScore = matchScoreData.matchScore;
            existing.preferencesMatchPercentage = matchScoreData.preferencesMatchPercentage;
            existing.apartmentPreferenceMatchPercentage =
                matchScoreData.apartmentPreferenceMatchPercentage;
            existing.timestamp = new Date();
            return existing.save();
        }
        const created = new this.matchModel({
            tenantId: dto.tenantId,
            propertyId: dto.propertyId,
            status: computedStatus,
            tenantLiked: dto.tenantLiked,
            matchScore: matchScoreData.matchScore,
            preferencesMatchPercentage: matchScoreData.preferencesMatchPercentage,
            apartmentPreferenceMatchPercentage: matchScoreData.apartmentPreferenceMatchPercentage,
            timestamp: new Date(),
        });
        return created.save();
    }
    async updateMatch(id, dto) {
        const updated = await this.matchModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException("Match not found");
        }
        return updated;
    }
    async updateMatchForLandlord(id, dto, landlordId) {
        const match = await this.matchModel.findById(id).exec();
        if (!match) {
            throw new common_1.NotFoundException("Match not found");
        }
        const property = await this.propertiesService.getProperty(match.propertyId.toString());
        if (property.landlordId.toString() !== landlordId) {
            throw new common_1.ForbiddenException("Access denied");
        }
        match.status = dto.status ?? match.status;
        match.landlordSeenAt = new Date();
        return match.save();
    }
    async findByProperty(propertyId) {
        return this.matchModel
            .find({ propertyId, status: { $ne: enums_1.MatchStatus.Dismissed } })
            .exec();
    }
    async countByProperty(propertyId) {
        const propertyIdString = propertyId?.toString?.() ?? propertyId;
        return this.matchModel
            .countDocuments({
            status: { $ne: enums_1.MatchStatus.Dismissed },
            $expr: {
                $eq: [{ $toString: "$propertyId" }, propertyIdString],
            },
        })
            .exec();
    }
    async countNewByProperty(propertyId) {
        const propertyIdString = propertyId?.toString?.() ?? propertyId;
        return this.matchModel
            .countDocuments({
            status: { $ne: enums_1.MatchStatus.Dismissed },
            $expr: {
                $eq: [{ $toString: "$propertyId" }, propertyIdString],
            },
            $or: [
                { landlordSeenAt: { $exists: false } },
                { landlordSeenAt: null },
                { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
            ],
        })
            .exec();
    }
    async getMatchCountsByPropertyIds(propertyIds) {
        if (!propertyIds.length) {
            return [];
        }
        const idStrings = propertyIds.map((id) => id?.toString?.() ?? id);
        const pipeline = [
            {
                $match: {
                    status: { $ne: enums_1.MatchStatus.Dismissed },
                    $expr: {
                        $in: [{ $toString: "$propertyId" }, idStrings],
                    },
                },
            },
            {
                $group: {
                    _id: "$propertyId",
                    count: { $sum: 1 },
                },
            },
        ];
        return this.matchModel.aggregate(pipeline).exec();
    }
    async getNewMatchCountsByPropertyIds(propertyIds) {
        if (!propertyIds.length) {
            return [];
        }
        const idStrings = propertyIds.map((id) => id?.toString?.() ?? id);
        const pipeline = [
            {
                $match: {
                    status: { $ne: enums_1.MatchStatus.Dismissed },
                    $expr: {
                        $in: [{ $toString: "$propertyId" }, idStrings],
                    },
                    $or: [
                        { landlordSeenAt: { $exists: false } },
                        { landlordSeenAt: null },
                        { $expr: { $gt: ["$updatedAt", "$landlordSeenAt"] } },
                    ],
                },
            },
            {
                $group: {
                    _id: "$propertyId",
                    count: { $sum: 1 },
                },
            },
        ];
        return this.matchModel.aggregate(pipeline).exec();
    }
    async findPropertyIdsWithMatches(landlordPropertyIds) {
        if (!landlordPropertyIds.length) {
            return [];
        }
        const idStrings = landlordPropertyIds.map((id) => id?.toString?.() ?? id);
        const results = await this.matchModel
            .aggregate([
            {
                $match: {
                    status: { $ne: enums_1.MatchStatus.Dismissed },
                    $expr: {
                        $in: [{ $toString: "$propertyId" }, idStrings],
                    },
                },
            },
            { $group: { _id: "$propertyId" } },
        ])
            .exec();
        return results.map((item) => item._id);
    }
    async getPropertyMatchesWithTenant(propertyId) {
        const propertyIdString = propertyId?.toString?.() ?? propertyId;
        const pipeline = [
            {
                $match: {
                    status: { $ne: enums_1.MatchStatus.Dismissed },
                    $expr: {
                        $eq: [{ $toString: "$propertyId" }, propertyIdString],
                    },
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
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                email: 1,
                                phoneNumber: 1,
                                photoUrl: 1,
                                isVerified: 1,
                                preferences: 1,
                            },
                        },
                    ],
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
            { $sort: { updatedAt: -1 } },
        ];
        return this.matchModel.aggregate(pipeline).exec();
    }
    async markMatchesSeenForProperty(propertyId) {
        const now = new Date();
        await this.matchModel.updateMany({ propertyId, status: { $ne: enums_1.MatchStatus.Dismissed } }, { $set: { landlordSeenAt: now } });
        return { propertyId, seenAt: now.toISOString() };
    }
    async landlordHasTenantMatch(landlordPropertyIds, tenantId) {
        if (!landlordPropertyIds.length) {
            return false;
        }
        const idStrings = landlordPropertyIds.map((id) => id?.toString?.() ?? id);
        const exists = await this.matchModel.exists({
            status: { $ne: enums_1.MatchStatus.Dismissed },
            $expr: {
                $and: [
                    { $in: [{ $toString: "$propertyId" }, idStrings] },
                    { $eq: [{ $toString: "$tenantId" }, tenantId] },
                ],
            },
        });
        return Boolean(exists);
    }
    async getTenantMatches(tenantId) {
        if (!mongoose_2.Types.ObjectId.isValid(tenantId)) {
            throw new common_1.BadRequestException("Invalid tenantId");
        }
        const tenantObjectId = new mongoose_2.Types.ObjectId(tenantId);
        const pipeline = [
            {
                $match: {
                    status: { $ne: enums_1.MatchStatus.Dismissed },
                    $or: [{ tenantId: tenantObjectId }, { tenantId }],
                },
            },
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
                $lookup: {
                    from: "messages",
                    let: {
                        matchId: "$_id",
                        currentUserId: tenantId,
                        landlordId: "$property.landlordId",
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
                                landlordReplied: {
                                    $max: {
                                        $cond: [
                                            {
                                                $eq: [
                                                    { $toString: "$senderId" },
                                                    { $toString: "$$landlordId" },
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
                                lastMessage: 1,
                                unreadCount: 1,
                                landlordReplied: 1,
                            },
                        },
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
                    landlordReplied: {
                        $ifNull: [
                            { $arrayElemAt: ["$messageMeta.landlordReplied", 0] },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    messageMeta: 0,
                },
            },
            { $sort: { updatedAt: -1 } },
        ];
        return this.matchModel.aggregate(pipeline).exec();
    }
    mergeMatchStatus(current, incoming) {
        if (incoming === enums_1.MatchStatus.Dismissed) {
            return enums_1.MatchStatus.Dismissed;
        }
        if (current === enums_1.MatchStatus.ChatInitiated) {
            return enums_1.MatchStatus.ChatInitiated;
        }
        if (incoming === enums_1.MatchStatus.ChatInitiated) {
            return enums_1.MatchStatus.ChatInitiated;
        }
        if (current === enums_1.MatchStatus.LandlordQualified ||
            incoming === enums_1.MatchStatus.LandlordQualified) {
            return enums_1.MatchStatus.LandlordQualified;
        }
        return enums_1.MatchStatus.TenantLiked;
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(match_schema_1.Match.name)),
    __param(1, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        properties_service_1.PropertiesService])
], MatchesService);
