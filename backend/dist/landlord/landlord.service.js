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
const workspace_service_1 = require("../common/services/workspace.service");
let LandlordService = class LandlordService {
    constructor(propertiesService, matchesService, usersService, workspaceService) {
        this.propertiesService = propertiesService;
        this.matchesService = matchesService;
        this.usersService = usersService;
        this.workspaceService = workspaceService;
    }
    async getLandlordProperties(landlordId, options) {
        const normalizedScope = await this.normalizePropertyScope(landlordId, options?.scope);
        const properties = await this.propertiesService.getLandlordProperties(landlordId, { ...options, scope: normalizedScope });
        const propertyIds = properties.map((property) => property.id);
        const counts = await this.matchesService.getMatchCountsByPropertyIds(propertyIds);
        const newCounts = await this.matchesService.getNewMatchCountsByPropertyIds(propertyIds);
        const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
        const newCountMap = new Map(newCounts.map((item) => [item._id.toString(), item.count]));
        const summaries = properties.map((property) => this.mapPropertySummary(property, countMap.get(property.id) ?? 0, newCountMap.get(property.id) ?? 0));
        return this.sortSummaries(summaries, options?.sort);
    }
    async getNewMatchesCount(landlordId, propertyId) {
        await this.assertPropertyManagement(landlordId, propertyId);
        const count = await this.matchesService.countNewByProperty(propertyId);
        return { propertyId, newMatchesCount: count };
    }
    async getPropertiesWithMatches(landlordId, options) {
        const normalizedScope = await this.normalizePropertyScope(landlordId, options?.scope);
        const properties = await this.propertiesService.getLandlordProperties(landlordId, { ...options, scope: normalizedScope });
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
        await this.assertPropertyManagement(landlordId, propertyId);
        return this.matchesService.getPropertyMatchesWithTenant(propertyId);
    }
    async getTenantProfile(landlordId, tenantId) {
        const normalizedScope = await this.normalizePropertyScope(landlordId, "all");
        const properties = await this.propertiesService.getLandlordProperties(landlordId, {
            scope: normalizedScope,
        });
        const propertyIds = properties.map((property) => property.id);
        const hasMatch = await this.matchesService.landlordHasTenantMatch(propertyIds, tenantId);
        if (!hasMatch) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const tenant = await this.usersService.findById(tenantId);
        return this.usersService.sanitizeUser(tenant);
    }
    async markPropertyMatchesSeen(landlordId, propertyId) {
        await this.assertPropertyManagement(landlordId, propertyId);
        return this.matchesService.markMatchesSeenForProperty(propertyId);
    }
    async deleteProperty(landlordId, propertyId) {
        await this.assertPropertyManagement(landlordId, propertyId);
        return this.propertiesService.deletePropertyForLandlord(landlordId, propertyId);
    }
    async getOrgStats(orgId) {
        const org = await this.usersService.findById(orgId);
        if (org.role !== enums_1.UserRole.Organisation) {
            throw new common_1.ForbiddenException("Not an organisation");
        }
        const memberIds = await this.workspaceService.getOrgMemberIds(orgId);
        const normalizedMembers = Array.from(new Set(memberIds));
        const [orgAgents, properties] = await Promise.all([
            this.usersService.getOrgAgents(orgId),
            this.propertiesService.getLandlordProperties(orgId, { scope: "all" }),
        ]);
        const listingCountByOwnerId = new Map();
        properties.forEach((property) => {
            const ownerId = property.landlordId?.toString?.();
            if (!ownerId)
                return;
            listingCountByOwnerId.set(ownerId, (listingCountByOwnerId.get(ownerId) ?? 0) + 1);
        });
        const totalListings = properties.length;
        const activeAgents = normalizedMembers.length > 0 ? normalizedMembers.length - 1 : 0;
        const allPropertyIds = properties
            .map((property) => property.id ?? property._id?.toString())
            .filter(Boolean);
        const totalMatchCounts = allPropertyIds.length
            ? await this.matchesService.getMatchCountsByPropertyIds(allPropertyIds)
            : [];
        const totalMatches = totalMatchCounts.reduce((sum, item) => sum + (item.count ?? 0), 0);
        const agentMap = new Map();
        orgAgents.forEach((agent) => {
            const agentId = agent?.id ?? agent?._id;
            if (!agentId)
                return;
            agentMap.set(String(agentId), {
                name: [agent.firstName, agent.lastName].filter(Boolean).join(" ") ||
                    agent.email ||
                    "Agent",
                email: agent.email ?? "",
            });
        });
        const listingsByAgent = normalizedMembers
            .filter((memberId) => memberId !== orgId)
            .map((memberId) => ({
            agentId: memberId,
            name: agentMap.get(memberId)?.name || "Agent",
            email: agentMap.get(memberId)?.email || "",
            count: listingCountByOwnerId.get(memberId) ?? 0,
        }));
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
            activeAgents,
            ownerListingCount: listingCountByOwnerId.get(orgId) ?? 0,
            listingsByAgent,
            matchesByMonth,
        };
    }
    async normalizePropertyScope(actorId, scope) {
        const context = await this.workspaceService.getWorkspaceActorContext(actorId);
        if (context.scope === "solo") {
            return "mine";
        }
        return scope === "mine" ? "mine" : "all";
    }
    async assertPropertyManagement(landlordId, propertyId) {
        const property = await this.propertiesService.getProperty(propertyId);
        const canManage = await this.workspaceService.canActorManageProperty(landlordId, property);
        if (!canManage) {
            throw new common_1.ForbiddenException("Access denied");
        }
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
        users_service_1.UsersService,
        workspace_service_1.WorkspaceService])
], LandlordService);
