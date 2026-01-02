import { Injectable } from "@nestjs/common";
import { PropertiesService } from "../properties/properties.service";
import { MatchesService } from "../matches/matches.service";

@Injectable()
export class LandlordService {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly matchesService: MatchesService
  ) {}

  async getLandlordProperties(landlordId: string) {
    return this.propertiesService.getLandlordProperties(landlordId);
  }

  async getNewMatchesCount(propertyId: string) {
    const count = await this.matchesService.countByProperty(propertyId);
    return { propertyId, newMatchesCount: count };
  }

  async getPropertiesWithMatches(landlordId: string) {
    const properties = await this.propertiesService.getLandlordProperties(
      landlordId
    );
    const propertyIds = properties.map((property) => property.id);
    if (!propertyIds.length) {
      return [];
    }

    const matchedIds = await this.matchesService.findPropertyIdsWithMatches(
      propertyIds
    );

    const matchedSet = new Set(matchedIds.map((id) => id.toString()));

    const results: Record<string, unknown>[] = [];
    for (const property of properties) {
      if (matchedSet.has(property.id)) {
        const count = await this.matchesService.countByProperty(property.id);
        results.push({ ...property.toObject(), matchCount: count });
      }
    }

    return results;
  }

  async getPropertyMatches(propertyId: string) {
    return this.matchesService.findByProperty(propertyId);
  }
}
