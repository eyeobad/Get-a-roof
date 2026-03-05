import { ForbiddenException, Injectable } from "@nestjs/common";
import { PropertiesService } from "../properties/properties.service";
import { MatchesService } from "../matches/matches.service";
import { UsersService } from "../users/users.service";
import { PropertyDocument } from "../properties/schemas/property.schema";
import { UserRole } from "../common/enums";

@Injectable()
export class LandlordService {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService
  ) {}

  async getLandlordProperties(
    landlordId: string,
    options?: { q?: string; status?: string; sort?: string }
  ) {
    const memberIds = await this.getOrgMemberIds(landlordId);
    const groupedProperties = await Promise.all(
      memberIds.map((memberId) =>
        this.propertiesService.getLandlordProperties(memberId, options)
      )
    );
    const properties = groupedProperties.flat();
    const propertyIds = properties.map((property) => property.id);
    const counts = await this.matchesService.getMatchCountsByPropertyIds(
      propertyIds
    );
    const newCounts = await this.matchesService.getNewMatchCountsByPropertyIds(
      propertyIds
    );
    const countMap = new Map(
      counts.map((item: any) => [item._id.toString(), item.count])
    );
    const newCountMap = new Map(
      newCounts.map((item: any) => [item._id.toString(), item.count])
    );

    const summaries = properties.map((property) =>
      this.mapPropertySummary(
        property,
        countMap.get(property.id) ?? 0,
        newCountMap.get(property.id) ?? 0
      )
    );
    return this.sortSummaries(summaries, options?.sort);
  }

  async getNewMatchesCount(landlordId: string, propertyId: string) {
    await this.assertPropertyOwnership(landlordId, propertyId);
    const count = await this.matchesService.countNewByProperty(propertyId);
    return { propertyId, newMatchesCount: count };
  }

  async getPropertiesWithMatches(
    landlordId: string,
    options?: { q?: string; status?: string; sort?: string }
  ) {
    const memberIds = await this.getOrgMemberIds(landlordId);
    const groupedProperties = await Promise.all(
      memberIds.map((memberId) =>
        this.propertiesService.getLandlordProperties(memberId, options)
      )
    );
    const properties = groupedProperties.flat();
    const propertyIds = properties.map((property) => property.id);
    if (!propertyIds.length) {
      return [];
    }

    const matchedIds = await this.matchesService.findPropertyIdsWithMatches(
      propertyIds
    );

    const counts = await this.matchesService.getMatchCountsByPropertyIds(
      matchedIds.map((id) => id.toString())
    );
    const newCounts = await this.matchesService.getNewMatchCountsByPropertyIds(
      matchedIds.map((id) => id.toString())
    );
    const countMap = new Map(
      counts.map((item: any) => [item._id.toString(), item.count])
    );
    const newCountMap = new Map(
      newCounts.map((item: any) => [item._id.toString(), item.count])
    );

    const summaries = properties
      .filter((property) =>
        matchedIds.some((id) => id.toString() === property.id)
      )
      .map((property) =>
        this.mapPropertySummary(
          property,
          countMap.get(property.id) ?? 0,
          newCountMap.get(property.id) ?? 0
        )
      );
    return this.sortSummaries(summaries, options?.sort);
  }

  async getPropertyMatches(landlordId: string, propertyId: string) {
    await this.assertPropertyOwnership(landlordId, propertyId);
    return this.matchesService.getPropertyMatchesWithTenant(propertyId);
  }

  async getTenantProfile(landlordId: string, tenantId: string) {
    const memberIds = await this.getOrgMemberIds(landlordId);
    const groupedProperties = await Promise.all(
      memberIds.map((memberId) =>
        this.propertiesService.getLandlordProperties(memberId)
      )
    );
    const propertyIds = groupedProperties.flat().map((property) => property.id);
    const hasMatch = await this.matchesService.landlordHasTenantMatch(
      propertyIds,
      tenantId
    );
    if (!hasMatch) {
      throw new ForbiddenException("Access denied");
    }
    const tenant = await this.usersService.findById(tenantId);
    return this.usersService.sanitizeUser(tenant);
  }

  async markPropertyMatchesSeen(landlordId: string, propertyId: string) {
    await this.assertPropertyOwnership(landlordId, propertyId);
    return this.matchesService.markMatchesSeenForProperty(propertyId);
  }

  async deleteProperty(landlordId: string, propertyId: string) {
    await this.assertPropertyOwnership(landlordId, propertyId);
    return this.propertiesService.deletePropertyForLandlord(landlordId, propertyId);
  }

  async getOrgStats(orgId: string) {
    const org = await this.usersService.findById(orgId);
    const agentIds: string[] =
      (org as any)?.orgProfile?.agentIds?.map((id: any) => id.toString()) ?? [];

    const allMemberIds = [orgId, ...agentIds];

    const agents = agentIds.length
      ? await Promise.all(
          agentIds.map(async (id) => {
            try {
              const agent = await this.usersService.findById(id);
              return {
                agentId: id,
                name:
                  [agent.firstName, agent.lastName].filter(Boolean).join(" ") ||
                  agent.email ||
                  "Agent",
                email: agent.email ?? "",
              };
            } catch {
              return { agentId: id, name: "Unknown", email: "" };
            }
          })
        )
      : [];

    const listingsByMember = await Promise.all(
      allMemberIds.map(async (memberId) => {
        const props = await this.propertiesService.getLandlordProperties(memberId);
        return { memberId, count: props.length };
      })
    );

    const totalListings = listingsByMember.reduce((sum, m) => sum + m.count, 0);

    const allProps = await Promise.all(
      allMemberIds.map((id) => this.propertiesService.getLandlordProperties(id))
    );
    const allPropertyIds = allProps
      .flat()
      .map((p: any) => p.id ?? p._id?.toString())
      .filter(Boolean);

    const totalMatchCounts = allPropertyIds.length
      ? await this.matchesService.getMatchCountsByPropertyIds(allPropertyIds)
      : [];
    const totalMatches = totalMatchCounts.reduce(
      (sum: number, item: any) => sum + (item.count ?? 0),
      0
    );

    const listingsByAgent = agents.map((agent) => {
      const entry = listingsByMember.find((m) => m.memberId === agent.agentId);
      return { ...agent, count: entry?.count ?? 0 };
    });

    const now = new Date();
    const matchesByMonth: { month: string; count: number }[] = [];
    const monthKeyToIndex = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short" });
      monthKeyToIndex.set(key, matchesByMonth.length);
      matchesByMonth.push({ month: label, count: 0 });
    }

    if (allPropertyIds.length) {
      const grouped = await this.matchesService.getMatchesByMonthForPropertyIds(
        allPropertyIds,
        6
      );
      for (const row of grouped) {
        const index = monthKeyToIndex.get(row.monthKey);
        if (index === undefined) continue;
        matchesByMonth[index].count = row.count;
      }
    }

    return {
      totalListings,
      totalMatches,
      activeAgents: agentIds.length,
      listingsByAgent,
      matchesByMonth,
      ownerListingCount:
        listingsByMember.find((m) => m.memberId === orgId)?.count ?? 0,
    };
  }

  private async assertPropertyOwnership(landlordId: string, propertyId: string) {
    const property = await this.propertiesService.getProperty(propertyId);
    if (property.landlordId.toString() === landlordId) {
      return;
    }

    const memberIds = await this.getOrgMemberIds(landlordId);
    if (!memberIds.includes(property.landlordId.toString())) {
      throw new ForbiddenException("Access denied");
    }
  }

  private async getOrgMemberIds(userId: string): Promise<string[]> {
    const user = await this.usersService.findById(userId);
    if (user.role !== UserRole.Organisation) {
      return [userId];
    }

    const agents = await this.usersService.getOrgAgents(userId);
    const orgAgentIds = agents
      .map((agent) => (agent as any)?.id ?? (agent as any)?._id)
      .map((id) => (id ? String(id) : ""))
      .filter(Boolean);

    return [userId, ...orgAgentIds];
  }

  private mapPropertySummary(
    property: PropertyDocument,
    matchCount: number,
    newCount: number
  ) {
    const plain = property.toObject();
    const addressParts = [
      plain.address?.street,
      plain.address?.city,
      plain.address?.state,
    ].filter(Boolean);
    const title = addressParts.join(", ") || plain.neighborhood || "Untitled property";
    const area =
      plain.neighborhood ||
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

  private sortSummaries(summaries: any[], sort?: string) {
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
}
