import { Body, Controller, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
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
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Tenant)
  create(@Body() dto: CreateMatchDto, @Req() req: Request & { user?: any }) {
    dto.tenantId = req.user?.sub;
    return this.matchesService.createMatch(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Landlord)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMatchDto,
    @Req() req: Request & { user?: any }
  ) {
    return this.matchesService.updateMatchForLandlord(id, dto, req.user?.sub);
  }
}
