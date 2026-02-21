import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import { Express } from "express";
import { AppwriteStorageService } from "../appwrite/appwrite.service";
import { User, UserDocument } from "./schemas/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { Property, PropertyDocument } from "../properties/schemas/property.schema";
import { Match, MatchDocument } from "../matches/schemas/match.schema";
import { Message, MessageDocument } from "../chat/schemas/message.schema";

const profileMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly appwriteStorage: AppwriteStorageService
  ) {}

  async createUser(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    if (dto.phoneNumber) {
      const existingPhone = await this.userModel
        .findOne({ phoneNumber: dto.phoneNumber })
        .exec();
      if (existingPhone) {
        throw new ConflictException("Phone number already in use");
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;
    const { password, ...rest } = dto;

    const created = new this.userModel({
      ...rest,
      email,
      loginCredentials: {
        passwordHash,
      },
    });

    return created.save();
  }

  async createOAuthUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    googleId?: string;
  }) {
    const email = data.email.toLowerCase();
    const created = new this.userModel({
      email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      loginCredentials: {
        googleId: data.googleId,
      },
    });

    return created.save();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByResetToken(token: string) {
    return this.userModel.findOne({ passwordResetToken: token }).exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const updated = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return updated;
  }

  async updatePreferences(id: string, dto: UpdatePreferencesDto) {
    const user = await this.findById(id);
    const current = user.preferences || {};

    if (dto.tenant) {
      const tenant = current.tenant || {};
      user.preferences = {
        ...current,
        tenant: { ...tenant, ...dto.tenant },
      };
    }

    if (dto.landlord) {
      const landlord = current.landlord || {};
      user.preferences = {
        ...current,
        landlord: { ...landlord, ...dto.landlord },
      };
    }

    return user.save();
  }

  async addSavedProperty(id: string, propertyId: string) {
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { savedProperties: propertyId } },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return updated;
  }

  async getSavedProperties(id: string) {
    const user = await this.userModel
      .findById(id)
      .populate("savedProperties")
      .exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user.savedProperties ?? [];
  }

  async removeSavedProperty(id: string, propertyId: string) {
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { $pull: { savedProperties: propertyId } },
        { new: true }
      )
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return updated;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const userObjectId = new Types.ObjectId(user.id);

    const propertyIds = await this.propertyModel
      .find({ landlordId: userObjectId })
      .distinct("_id")
      .exec();
    const landlordPropertyIds = propertyIds.map((pid) => new Types.ObjectId(pid));
    if (landlordPropertyIds.length) {
      await this.propertyModel.deleteMany({
        _id: { $in: landlordPropertyIds },
      });
    }

    const matchFilter: Record<string, unknown> = {
      $or: [{ tenantId: userObjectId }],
    };
    if (landlordPropertyIds.length) {
      (matchFilter.$or as Array<Record<string, unknown>>).push({
        propertyId: { $in: landlordPropertyIds },
      });
    }

    const matchIds = await this.matchModel
      .find(matchFilter)
      .distinct("_id")
      .exec();
    if (matchIds.length) {
      await this.messageModel.deleteMany({
        matchId: { $in: matchIds.map((mid) => new Types.ObjectId(mid)) },
      });
    }
    await this.matchModel.deleteMany(matchFilter);

    const deleted = await this.userModel.findByIdAndDelete(id).exec();
    return deleted;
  }

  async uploadProfilePhoto(id: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    if (!file.mimetype || !profileMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Unsupported file type");
    }
    const result = await this.appwriteStorage.uploadFile(
      file.originalname ?? file.filename ?? `profile-${Date.now()}`,
      file.buffer,
      file.mimetype ?? "image/jpeg"
    );
    if (!result?.url) {
      throw new BadRequestException("Unable to upload file");
    }
    const updated = await this.userModel
      .findByIdAndUpdate(id, { photoUrl: result.url }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return this.sanitizeUser(updated);
  }

  sanitizeUser(user: UserDocument) {
    const obj = user.toObject();
    delete obj.loginCredentials;
    delete obj.emailOtp;
    delete obj.emailOtpHash;
    delete obj.emailOtpExpiresAt;
    delete obj.emailOtpAttempts;
    delete obj.phoneOtp;
    delete obj.phoneOtpHash;
    delete obj.phoneOtpExpiresAt;
    delete obj.phoneOtpAttempts;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpiresAt;
    return obj;
  }
}
