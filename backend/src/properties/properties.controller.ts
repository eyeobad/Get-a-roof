import {
  BadRequestException,
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
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import * as express from "express";
import * as multer from "multer";
import { Request } from "express";
import { PropertiesService } from "./properties.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { toNumber } from "../common/utils/match.helpers";
import { ListingIntent, PropertyStatus } from "../common/enums";
import { normalizePropertyType } from "../common/utils/property.utils";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles } from "../common/guards/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UserRole } from "../common/enums";

const imageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const proofMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const createMimeTypeFilter =
  (allowedTypes: Set<string>) =>
    (_req: Request, file: express.Multer.File, cb: multer.FileFilterCallback) => {
      if (!file?.mimetype || !allowedTypes.has(file.mimetype)) {
        return cb(new BadRequestException("Unsupported file type"));
      }
      return cb(null, true);
    };

@Controller("api/properties")
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @Post("upload-image")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord, UserRole.Organisation)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: createMimeTypeFilter(imageMimeTypes),
    })
  )
  uploadImage(@UploadedFile() file?: unknown) {
    return this.propertiesService.uploadImage(file as express.Multer.File);
  }

  @Post("upload-proof")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord, UserRole.Organisation)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: createMimeTypeFilter(proofMimeTypes),
    })
  )
  uploadProof(@UploadedFile() file?: unknown) {
    return this.propertiesService.uploadProof(file as express.Multer.File);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord, UserRole.Organisation)
  create(@Body() dto: CreatePropertyDto, @Req() req: Request & { user?: any }) {
    dto.landlordId = req.user?.sub;
    return this.propertiesService.createProperty(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord, UserRole.Organisation)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePropertyDto,
    @Req() req: Request & { user?: any }
  ) {
    const actorId = req.user?.sub;
    if (!actorId) {
      throw new ForbiddenException("Access denied");
    }
    await this.propertiesService.assertPropertyMutationAccess(id, actorId);
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
  findOne(@Param("id") id: string, @Req() req: Request & { user?: any }) {
    return this.propertiesService.getPropertyForViewer(id, req.user?.sub);
  }

  private buildFilters(query: Record<string, string>) {
    const filters: Record<string, unknown> = {};
    const propertyTypes = new Set<string>();
    const requirementFilters: Record<string, boolean>[] = [];

    const requirementTypeMap: Record<string, string> = {
      NonOwnerOccupied: "landlordRequirements.nonOwnerOccupied",
      SharedApartment: "landlordRequirements.sharedApartment",
      Shortlet: "landlordRequirements.shortlet",
      SelfCompound: "landlordRequirements.selfCompound",
      SharedCompound: "landlordRequirements.sharedCompound",
    };

    const addPropertyType = (rawType: string) => {
      const normalized = normalizePropertyType(rawType)?.toString() ?? rawType;
      if (!normalized) {
        return;
      }
      propertyTypes.add(normalized);
      const requirementPath = requirementTypeMap[normalized];
      if (requirementPath) {
        requirementFilters.push({ [requirementPath]: true });
      }
    };

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
      types.forEach(addPropertyType);
    }

    const toggleMap: Record<string, string> = {
      selfCompound: "SelfCompound",
      shortlets: "Shortlet",
      sharedCompound: "SharedCompound",
      nonOwner: "NonOwnerOccupied",
      nonOwnerOccupied: "NonOwnerOccupied",
      sharedApartment: "SharedApartment",
    };

    Object.entries(toggleMap).forEach(([key, value]) => {
      if (query[key] === "true") {
        addPropertyType(value);
      }
    });

    if (query.apartmentType) {
      const type = query.apartmentType;
      if (type === "two") {
        filters.bedCount = 2;
      } else if (type === "threePlus") {
        filters.bedCount = { $gte: 3 };
      } else if (type === "fourPlus") {
        filters.bedCount = { $gte: 4 };
      } else if (type === "singleRoom" || type === "miniflat" || type === "studio1") {
        filters.bedCount = { $lte: 1 };
      } else if (type === "duplex") {
        propertyTypes.clear();
        propertyTypes.add("House");
        propertyTypes.add("Townhouse");
      }
    }

    if (propertyTypes.size || requirementFilters.length) {
      const typeConditions: Record<string, unknown>[] = [];
      if (propertyTypes.size) {
        typeConditions.push({ propertyType: { $in: Array.from(propertyTypes) } });
      }
      typeConditions.push(...requirementFilters);
      if (typeConditions.length === 1) {
        Object.assign(filters, typeConditions[0]);
      } else {
        filters.$or = typeConditions;
      }
    }

    if (query.minBeds || query.maxBeds) {
      if (typeof filters.bedCount === "number") {
        filters.bedCount = { $eq: filters.bedCount };
      } else {
        filters.bedCount = filters.bedCount ?? {};
      }
      if (query.minBeds) {
        (filters.bedCount as any).$gte = Number(query.minBeds);
      }
      if (query.maxBeds) {
        (filters.bedCount as any).$lte = Number(query.maxBeds);
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

    if (query.listingIntent) {
      const normalizedIntent = query.listingIntent.trim().toLowerCase();
      if (normalizedIntent === "shortlet") {
        filters.listingIntent = ListingIntent.Shortlet;
      } else if (normalizedIntent === "rent") {
        filters.listingIntent = ListingIntent.Rent;
      }
    }

    if (query.state) {
      const normalizedState = query.state.trim();
      if (normalizedState) {
        filters["address.state"] = normalizedState;
      }
    }

    if (query.city) {
      const normalizedCity = query.city.trim();
      if (normalizedCity) {
        filters["address.city"] = new RegExp(`^${normalizedCity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      }
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
