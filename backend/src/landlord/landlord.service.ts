import { ForbiddenException, Injectable } from "@nestjs/common";
import { PropertiesService } from "../properties/properties.service";
import { MatchesService } from "../matches/matches.service";
import { UsersService } from "../users/users.service";
import { PropertyDocument } from "../properties/schemas/property.schema";

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
    const properties = await this.propertiesService.getLandlordProperties(
      landlordId,
      options
    );
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
    const properties = await this.propertiesService.getLandlordProperties(
      landlordId,
      options
    );
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
    const properties = await this.propertiesService.getLandlordProperties(
      landlordId
    );
    const propertyIds = properties.map((property) => property.id);
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

  private async assertPropertyOwnership(landlordId: string, propertyId: string) {
    const property = await this.propertiesService.getProperty(propertyId);
    if (property.landlordId.toString() !== landlordId) {
      throw new ForbiddenException("Access denied");
    }
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
    const title =
      addressParts.join(", ") ||
      plain.neighborhood ||
      "Untitled property";
    const area =
      plain.neighborhood ||
      [plain.address?.city, plain.address?.state]
        .filter(Boolean)
        .join(", ");

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
