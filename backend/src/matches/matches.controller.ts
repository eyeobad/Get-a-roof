import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { MatchesService } from "./matches.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles } from "../common/guards/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UserRole } from "../common/enums";

@Controller("api/matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Tenant)
  create(@Body() dto: CreateMatchDto, @Req() req: Request & { user?: any }) {
    dto.tenantId = req.user?.sub;
    return this.matchesService.createMatch(dto);
  }

  @Get("tenant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Tenant)
  getTenantMatches(
    @Req() req: Request & { user?: any },
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.matchesService.getTenantMatches(req.user?.sub, { page, limit });
  }

  @Get("tenant/recycled")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Tenant)
  getRecycledMatches(
    @Req() req: Request & { user?: any },
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("cooldownDays", new DefaultValuePipe(14), ParseIntPipe)
    cooldownDays: number
  ) {
    return this.matchesService.getRecyclableMatches(req.user?.sub, {
      page,
      limit,
      cooldownDays,
    });
  }

  @Post(":id/recycle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Tenant)
  recycleMatch(
    @Param("id") id: string,
    @Req() req: Request & { user?: any }
  ) {
    return this.matchesService.recycleDismissedMatch(id, req.user?.sub);
  }

  @Post("recycle-bulk")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Tenant)
  recycleBulk(
    @Body() body: { matchIds: string[] },
    @Req() req: Request & { user?: any }
  ) {
    return this.matchesService.recycleDismissedMatchesBulk(body.matchIds, req.user?.sub);
  }

  @Post(":id/hard-block")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Tenant)
  hardBlock(
    @Param("id") id: string,
    @Req() req: Request & { user?: any }
  ) {
    return this.matchesService.hardBlockMatch(id, req.user?.sub);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord, UserRole.Organisation)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMatchDto,
    @Req() req: Request & { user?: any }
  ) {
    return this.matchesService.updateMatchForLandlord(id, dto, req.user?.sub);
  }
}
