import { Controller, ForbiddenException, Get, Param, Req, UseGuards } from "@nestjs/common";
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
  getProperties(@Param("id") id: string, @Req() req: Request & { user?: any }) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.getLandlordProperties(id);
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
    return this.landlordService.getNewMatchesCount(propertyId);
  }

  @Get(":id/properties-with-matches")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  getPropertiesWithMatches(
    @Param("id") id: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.landlordService.getPropertiesWithMatches(id);
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
    return this.landlordService.getPropertyMatches(propertyId);
  }
}
