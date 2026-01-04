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
        const status = dto.status ||
            (baseStatus === enums_1.MatchStatus.TenantLiked && matchScoreData.matchScore >= 70
                ? enums_1.MatchStatus.LandlordQualified
                : baseStatus);
        const created = new this.matchModel({
            tenantId: dto.tenantId,
            propertyId: dto.propertyId,
            status,
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
        return match.save();
    }
    async findByProperty(propertyId) {
        return this.matchModel.find({ propertyId }).exec();
    }
    async countByProperty(propertyId) {
        return this.matchModel.countDocuments({ propertyId }).exec();
    }
    async findPropertyIdsWithMatches(landlordPropertyIds) {
        return this.matchModel
            .find({ propertyId: { $in: landlordPropertyIds } })
            .distinct("propertyId")
            .exec();
    }
    async getTenantMatches(tenantId) {
        const tenantObjectId = new mongoose_2.Types.ObjectId(tenantId);
        const pipeline = [
            { $match: { tenantId: tenantObjectId } },
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
                    from: "messages",
                    let: { matchId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$matchId", "$$matchId"] } } },
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
                                                    { $eq: ["$receiverId", tenantObjectId] },
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
                                lastMessage: 1,
                                unreadCount: 1,
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
//# sourceMappingURL=matches.service.js.map