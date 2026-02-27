import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { LandlordService } from "./landlord.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/guards/roles.decorator";
import { UserRole } from "../common/enums";

@Controller("api/landlord")
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  @Get(":id/properties")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  getProperties(
    @Param("id") id: string,
    @Req() req: Request & { user?: any },
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("sort") sort?: string
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.getLandlordProperties(id, { q, status, sort });
  }

  @Get(":id/properties/:propertyId/new-matches-count")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  getNewMatchesCount(
    @Param("id") id: string,
    @Param("propertyId") propertyId: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.getNewMatchesCount(id, propertyId);
  }

  @Get(":id/properties-with-matches")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  getPropertiesWithMatches(
    @Param("id") id: string,
    @Req() req: Request & { user?: any },
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("sort") sort?: string
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.getPropertiesWithMatches(id, { q, status, sort });
  }

  @Get(":id/properties/:propertyId/matches")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  getPropertyMatches(
    @Param("id") id: string,
    @Param("propertyId") propertyId: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.getPropertyMatches(id, propertyId);
  }

  @Patch(":id/properties/:propertyId/mark-seen")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  markPropertyMatchesSeen(
    @Param("id") id: string,
    @Param("propertyId") propertyId: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.markPropertyMatchesSeen(id, propertyId);
  }

  @Delete(":id/properties/:propertyId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  deleteProperty(
    @Param("id") id: string,
    @Param("propertyId") propertyId: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.deleteProperty(id, propertyId);
  }

  @Get(":id/tenants/:tenantId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  getTenantProfile(
    @Param("id") id: string,
    @Param("tenantId") tenantId: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.getTenantProfile(id, tenantId);
  }
}
