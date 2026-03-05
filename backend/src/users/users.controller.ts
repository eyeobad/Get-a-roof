import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import * as express from "express";
import { Request } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import * as multer from "multer";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { CreateOrgDto } from "./dto/create-org.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { SavePropertyDto } from "./dto/save-property.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/guards/roles.decorator";
import { UserRole } from "../common/enums";

const profileImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const createMimeTypeFilter =
  (allowedTypes: Set<string>) =>
    (_req: Request, file: express.Multer.File, cb: multer.FileFilterCallback) => {
      if (!file?.mimetype || !allowedTypes.has(file.mimetype)) {
        return cb(new BadRequestException("Unsupported file type"));
      }
      return cb(null, true);
    };

@Controller("api/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const requestedRole = dto.role;
    if (requestedRole === UserRole.Admin || requestedRole === UserRole.Unassigned) {
      throw new ForbiddenException("Invalid role");
    }
    if (requestedRole === UserRole.Organisation) {
      throw new ForbiddenException("Use /api/users/org to register an organisation");
    }
    dto.role =
      requestedRole === UserRole.Landlord ? UserRole.Landlord : UserRole.Tenant;
    await this.usersService.assertRecaptchaToken(dto.recaptchaToken);
    return this.usersService.createUser(dto);
  }

  @Post("org")
  async createOrg(@Body() dto: CreateOrgDto) {
    return this.usersService.createOrganisation(dto);
  }

  @Post(":orgId/agents/invite")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Organisation)
  async inviteAgent(
    @Param("orgId") orgId: string,
    @Body() body: { email: string },
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== orgId) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.inviteAgent(orgId, body.email);
  }

  @Post("agents/accept-invite")
  @UseGuards(JwtAuthGuard)
  async acceptAgentInvite(
    @Body() body: { token: string; orgId: string },
    @Req() req: Request & { user?: any }
  ) {
    return this.usersService.acceptAgentInvite(
      body.token,
      body.orgId,
      req.user?.sub
    );
  }

  @Delete(":orgId/agents/:agentId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Organisation)
  async removeAgent(
    @Param("orgId") orgId: string,
    @Param("agentId") agentId: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== orgId) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.removeAgent(orgId, agentId);
  }

  @Get(":orgId/agents")
  @UseGuards(JwtAuthGuard)
  async getOrgAgents(
    @Param("orgId") orgId: string,
    @Req() req: Request & { user?: any }
  ) {
    // Allow org owner or any agent of the org
    const callerIsOrg = req.user?.sub === orgId;
    if (!callerIsOrg) {
      const caller = await this.usersService.findById(req.user?.sub);
      if (!caller.agentOrgId || caller.agentOrgId.toString() !== orgId) {
        throw new ForbiddenException("Access denied");
      }
    }
    return this.usersService.getOrgAgents(orgId);
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
    delete (dto as Partial<UpdateUserDto>).role;
    delete (dto as Partial<UpdateUserDto>).isVerified;
    delete (dto as Partial<UpdateUserDto>).verificationStatus;
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

  @Get(":id/saved-properties")
  @UseGuards(JwtAuthGuard)
  getSavedProperties(@Param("id") id: string, @Req() req: Request & { user?: any }) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.getSavedProperties(id);
  }

  @Delete(":id/saved-properties/:propertyId")
  @UseGuards(JwtAuthGuard)
  removeSavedProperty(
    @Param("id") id: string,
    @Param("propertyId") propertyId: string,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService
      .removeSavedProperty(id, propertyId)
      .then((user) => this.usersService.sanitizeUser(user));
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

  @Post(":id/photo")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: createMimeTypeFilter(profileImageMimeTypes),
    })
  )
  uploadPhoto(
    @Param("id") id: string,
    @UploadedFile() file?: unknown,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.uploadProfilePhoto(id, file as express.Multer.File);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Param("id") id: string, @Req() req: Request & { user?: any }) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    await this.usersService.deleteUser(id);
    return { success: true };
  }
}
