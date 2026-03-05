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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandlordService = void 0;
const common_1 = require("@nestjs/common");
const properties_service_1 = require("../properties/properties.service");
const matches_service_1 = require("../matches/matches.service");
const users_service_1 = require("../users/users.service");
const enums_1 = require("../common/enums");
let LandlordService = class LandlordService {
    constructor(propertiesService, matchesService, usersService) {
        this.propertiesService = propertiesService;
        this.matchesService = matchesService;
        this.usersService = usersService;
    }
    async getLandlordProperties(landlordId, options) {
        const memberIds = await this.getOrgMemberIds(landlordId);
        const groupedProperties = await Promise.all(memberIds.map((memberId) => this.propertiesService.getLandlordProperties(memberId, options)));
        const properties = groupedProperties.flat();
        const propertyIds = properties.map((property) => property.id);
        const counts = await this.matchesService.getMatchCountsByPropertyIds(propertyIds);
        const newCounts = await this.matchesService.getNewMatchCountsByPropertyIds(propertyIds);
        const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
        const newCountMap = new Map(newCounts.map((item) => [item._id.toString(), item.count]));
        const summaries = properties.map((property) => this.mapPropertySummary(property, countMap.get(property.id) ?? 0, newCountMap.get(property.id) ?? 0));
        return this.sortSummaries(summaries, options?.sort);
    }
    async getNewMatchesCount(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        const count = await this.matchesService.countNewByProperty(propertyId);
        return { propertyId, newMatchesCount: count };
    }
    async getPropertiesWithMatches(landlordId, options) {
        const memberIds = await this.getOrgMemberIds(landlordId);
        const groupedProperties = await Promise.all(memberIds.map((memberId) => this.propertiesService.getLandlordProperties(memberId, options)));
        const properties = groupedProperties.flat();
        const propertyIds = properties.map((property) => property.id);
        if (!propertyIds.length) {
            return [];
        }
        const matchedIds = await this.matchesService.findPropertyIdsWithMatches(propertyIds);
        const counts = await this.matchesService.getMatchCountsByPropertyIds(matchedIds.map((id) => id.toString()));
        const newCounts = await this.matchesService.getNewMatchCountsByPropertyIds(matchedIds.map((id) => id.toString()));
        const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
        const newCountMap = new Map(newCounts.map((item) => [item._id.toString(), item.count]));
        const summaries = properties
            .filter((property) => matchedIds.some((id) => id.toString() === property.id))
            .map((property) => this.mapPropertySummary(property, countMap.get(property.id) ?? 0, newCountMap.get(property.id) ?? 0));
        return this.sortSummaries(summaries, options?.sort);
    }
    async getPropertyMatches(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        return this.matchesService.getPropertyMatchesWithTenant(propertyId);
    }
    async getTenantProfile(landlordId, tenantId) {
        const memberIds = await this.getOrgMemberIds(landlordId);
        const groupedProperties = await Promise.all(memberIds.map((memberId) => this.propertiesService.getLandlordProperties(memberId)));
        const propertyIds = groupedProperties.flat().map((property) => property.id);
        const hasMatch = await this.matchesService.landlordHasTenantMatch(propertyIds, tenantId);
        if (!hasMatch) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const tenant = await this.usersService.findById(tenantId);
        return this.usersService.sanitizeUser(tenant);
    }
    async markPropertyMatchesSeen(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        return this.matchesService.markMatchesSeenForProperty(propertyId);
    }
    async deleteProperty(landlordId, propertyId) {
        await this.assertPropertyOwnership(landlordId, propertyId);
        return this.propertiesService.deletePropertyForLandlord(landlordId, propertyId);
    }
    async getOrgStats(orgId) {
        const org = await this.usersService.findById(orgId);
        const agentIds = org?.orgProfile?.agentIds?.map((id) => id.toString()) ?? [];
        const allMemberIds = [orgId, ...agentIds];
        const agents = agentIds.length
            ? await Promise.all(agentIds.map(async (id) => {
                try {
                    const agent = await this.usersService.findById(id);
                    return {
                        agentId: id,
                        name: [agent.firstName, agent.lastName].filter(Boolean).join(" ") ||
                            agent.email ||
                            "Agent",
                        email: agent.email ?? "",
                    };
                }
                catch {
                    return { agentId: id, name: "Unknown", email: "" };
                }
            }))
            : [];
        const listingsByMember = await Promise.all(allMemberIds.map(async (memberId) => {
            const props = await this.propertiesService.getLandlordProperties(memberId);
            return { memberId, count: props.length };
        }));
        const totalListings = listingsByMember.reduce((sum, m) => sum + m.count, 0);
        const allProps = await Promise.all(allMemberIds.map((id) => this.propertiesService.getLandlordProperties(id)));
        const allPropertyIds = allProps
            .flat()
            .map((p) => p.id ?? p._id?.toString())
            .filter(Boolean);
        const totalMatchCounts = allPropertyIds.length
            ? await this.matchesService.getMatchCountsByPropertyIds(allPropertyIds)
            : [];
        const totalMatches = totalMatchCounts.reduce((sum, item) => sum + (item.count ?? 0), 0);
        const listingsByAgent = agents.map((agent) => {
            const entry = listingsByMember.find((m) => m.memberId === agent.agentId);
            return { ...agent, count: entry?.count ?? 0 };
        });
        const now = new Date();
        const matchesByMonth = [];
        const monthKeyToIndex = new Map();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleString("en", { month: "short" });
            monthKeyToIndex.set(key, matchesByMonth.length);
            matchesByMonth.push({ month: label, count: 0 });
        }
        if (allPropertyIds.length) {
            const grouped = await this.matchesService.getMatchesByMonthForPropertyIds(allPropertyIds, 6);
            for (const row of grouped) {
                const index = monthKeyToIndex.get(row.monthKey);
                if (index === undefined)
                    continue;
                matchesByMonth[index].count = row.count;
            }
        }
        return {
            totalListings,
            totalMatches,
            activeAgents: agentIds.length,
            listingsByAgent,
            matchesByMonth,
            ownerListingCount: listingsByMember.find((m) => m.memberId === orgId)?.count ?? 0,
        };
    }
    async assertPropertyOwnership(landlordId, propertyId) {
        const property = await this.propertiesService.getProperty(propertyId);
        if (property.landlordId.toString() === landlordId) {
            return;
        }
        const memberIds = await this.getOrgMemberIds(landlordId);
        if (!memberIds.includes(property.landlordId.toString())) {
            throw new common_1.ForbiddenException("Access denied");
        }
    }
    async getOrgMemberIds(userId) {
        const user = await this.usersService.findById(userId);
        if (user.role !== enums_1.UserRole.Organisation) {
            return [userId];
        }
        const agents = await this.usersService.getOrgAgents(userId);
        const orgAgentIds = agents
            .map((agent) => agent?.id ?? agent?._id)
            .map((id) => (id ? String(id) : ""))
            .filter(Boolean);
        return [userId, ...orgAgentIds];
    }
    mapPropertySummary(property, matchCount, newCount) {
        const plain = property.toObject();
        const addressParts = [
            plain.address?.street,
            plain.address?.city,
            plain.address?.state,
        ].filter(Boolean);
        const title = addressParts.join(", ") || plain.neighborhood || "Untitled property";
        const area = plain.neighborhood ||
            [plain.address?.city, plain.address?.state].filter(Boolean).join(", ");
        return {
            ...plain,
            matchCount,
            matches: matchCount,
            newCount,
            title,
            area,
            type: plain.propertyType,
            price: plain.monthlyPrice,
            beds: plain.bedCount,
            baths: plain.bathCount,
            coverUrl: plain.images?.[0],
        };
    }
    sortSummaries(summaries, sort) {
        if (!sort) {
            return summaries;
        }
        if (sort === "matchesDesc") {
            return summaries.sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0));
        }
        if (sort === "matchesAsc") {
            return summaries.sort((a, b) => (a.matchCount ?? 0) - (b.matchCount ?? 0));
        }
        if (sort === "newDesc") {
            return summaries.sort((a, b) => (b.newCount ?? 0) - (a.newCount ?? 0));
        }
        if (sort === "newAsc") {
            return summaries.sort((a, b) => (a.newCount ?? 0) - (b.newCount ?? 0));
        }
        return summaries;
    }
};
exports.LandlordService = LandlordService;
exports.LandlordService = LandlordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [properties_service_1.PropertiesService,
        matches_service_1.MatchesService,
        users_service_1.UsersService])
], LandlordService);
