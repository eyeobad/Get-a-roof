import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { PropertiesService } from "./properties.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { toNumber } from "../common/utils/match.helpers";
import { PropertyStatus } from "../common/enums";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles } from "../common/guards/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UserRole } from "../common/enums";

@Controller("api/properties")
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post("upload-image")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  uploadImage(@Body() body: { fileName?: string }) {
    return this.propertiesService.uploadImageStub(body?.fileName);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  create(@Body() dto: CreatePropertyDto, @Req() req: Request & { user?: any }) {
    dto.landlordId = req.user?.sub;
    return this.propertiesService.createProperty(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePropertyDto,
    @Req() req: Request & { user?: any }
  ) {
    const property = await this.propertiesService.getProperty(id);
    if (property.landlordId.toString() !== req.user?.sub) {
      throw new ForbiddenException("Access denied");
    }
    return this.propertiesService.updateProperty(id, dto);
  }

  @Get("explore")
  @UseGuards(JwtAuthGuard)
  explore(@Query() query: Record<string, string>, @Req() req: Request & { user?: any }) {
    const filters = this.buildFilters(query);
    const options = this.buildOptions(query);
    options.userId = req.user?.sub;
    return this.propertiesService.exploreProperties(filters, options);
  }

  @Get("matches/map")
  @UseGuards(JwtAuthGuard)
  matchesMap(@Query() query: Record<string, string>, @Req() req: Request & { user?: any }) {
    const filters = this.buildFilters(query);
    const options = this.buildOptions(query);
    options.userId = req.user?.sub;
    return this.propertiesService.getMapMatches(filters, options);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id") id: string) {
    return this.propertiesService.getProperty(id);
  }

  private buildFilters(query: Record<string, string>) {
    const filters: Record<string, unknown> = {};

    if (query.minPrice || query.maxPrice || query.budget) {
      filters.monthlyPrice = {} as any;
      if (query.minPrice) {
        (filters.monthlyPrice as any).$gte = Number(query.minPrice);
      }
      if (query.maxPrice) {
        (filters.monthlyPrice as any).$lte = Number(query.maxPrice);
      }
      if (query.budget) {
        (filters.monthlyPrice as any).$lte = Number(query.budget);
      }
    }

    if (query.propertyType || query.lookingFor) {
      const types = (query.propertyType || query.lookingFor || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (types.length) {
        filters.propertyType = { $in: types } as any;
      }
    }

    if (query.status) {
      filters.status = query.status as any;
    } else {
      filters.status = PropertyStatus.Listed;
    }

    if (query.petFriendly) {
      filters.petFriendly = query.petFriendly === "true";
    }

    if (query.landlordId) {
      filters.landlordId = query.landlordId as any;
    }

    return filters;
  }

  private buildOptions(query: Record<string, string>) {
    const lat = toNumber(query.lat);
    const lng = toNumber(query.lng);
    const distanceKm = toNumber(query.distanceKm || query.distance);
    const minMatchScore = toNumber(query.minMatchScore);
    const limit = toNumber(query.limit);

    return {
      userId: query.userId,
      lat,
      lng,
      distanceKm,
      minMatchScore,
      limit,
    };
  }
}
