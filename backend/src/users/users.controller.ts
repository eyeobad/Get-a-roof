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
import { Express, Request } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import * as multer from "multer";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { SavePropertyDto } from "./dto/save-property.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

const profileImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const createMimeTypeFilter =
  (allowedTypes: Set<string>) =>
  (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file?.mimetype || !allowedTypes.has(file.mimetype)) {
      return cb(new BadRequestException("Unsupported file type"));
    }
    return cb(null, true);
  };

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
    @UploadedFile() file?: Express.Multer.File,
    @Req() req: Request & { user?: any }
  ) {
    if (req.user?.sub !== id) {
      throw new ForbiddenException("Access denied");
    }
    return this.usersService.uploadProfilePhoto(id, file);
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
