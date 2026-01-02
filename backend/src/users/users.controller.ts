import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { SavePropertyDto } from "./dto/save-property.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Controller("api/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto).then((user) => this.usersService.sanitizeUser(user));
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id") id: string, @Req() req: Request & { user?: any }) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.findById(id).then((user) => this.usersService.sanitizeUser(user));
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.updateUser(id, dto).then((user) => this.usersService.sanitizeUser(user));
  }

  @Patch(":id/preferences")
  @UseGuards(JwtAuthGuard)
  updatePreferences(
    @Param("id") id: string,
    @Body() dto: UpdatePreferencesDto,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.updatePreferences(id, dto).then((user) => this.usersService.sanitizeUser(user));
  }

  @Post(":id/saved-properties")
  @UseGuards(JwtAuthGuard)
  saveProperty(
    @Param("id") id: string,
    @Body() dto: SavePropertyDto,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.addSavedProperty(id, dto.propertyId).then((user) => this.usersService.sanitizeUser(user));
  }

  @Get(":id/verification-status")
  @UseGuards(JwtAuthGuard)
  async getVerificationStatus(
    @Param("id") id: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    const user = await this.usersService.findById(id);
    return {
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
    };
  }
}
