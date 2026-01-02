import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { User, UserDocument } from "./schemas/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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

  sanitizeUser(user: UserDocument) {
    const obj = user.toObject();
    delete obj.loginCredentials;
    delete obj.emailOtp;
    delete obj.emailOtpExpiresAt;
    delete obj.phoneOtp;
    delete obj.phoneOtpExpiresAt;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpiresAt;
    return obj;
  }
}
