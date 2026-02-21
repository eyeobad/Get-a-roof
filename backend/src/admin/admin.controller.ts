import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/guards/roles.decorator";
import { UserRole } from "../common/enums";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { ModerateListingDto } from "./dto/moderate-listing.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

@Controller("api/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("metrics")
  getMetrics(@Query("from") from?: string, @Query("to") to?: string) {
    return this.adminService.getMetrics({ from, to });
  }

  @Get("users")
  listUsers(
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("suspended") suspended?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.adminService.listUsers({ q, role, suspended, page, limit });
  }

  @Patch("users/:id/status")
  updateUserStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.adminService.updateUserStatus(req.user?.sub ?? "", id, dto, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  @Patch("users/:id/role")
  updateUserRole(
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.adminService.updateUserRole(req.user?.sub ?? "", id, dto, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  @Delete("users/:id")
  deleteUser(
    @Param("id") id: string,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.adminService.deleteUser(req.user?.sub ?? "", id, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  @Get("listings")
  listListings(
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("moderationStatus") moderationStatus?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.adminService.listListings({
      q,
      status,
      moderationStatus,
      page,
      limit,
    });
  }

  @Patch("listings/:id/moderate")
  moderateListing(
    @Param("id") id: string,
    @Body() dto: ModerateListingDto,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.adminService.moderateListing(req.user?.sub ?? "", id, dto, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  @Get("audit-logs")
  getAuditLogs(
    @Query("action") action?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.adminService.getAuditLogs({ action, page, limit });
  }
}
