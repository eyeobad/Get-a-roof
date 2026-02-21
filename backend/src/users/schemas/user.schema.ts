import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import {
  PropertyType,
  UserRole,
  VehiclePreference,
  VerificationStatus,
} from "../../common/enums";

export type UserDocument = HydratedDocument<User>;

class Address {
  @Prop()
  street?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  zip?: string;

  @Prop()
  lat?: number;

  @Prop()
  lng?: number;
}

class VerificationDetails {
  @Prop()
  nin?: string;

  @Prop()
  passportId?: string;

  @Prop()
  utilityBillUrl?: string;

  @Prop()
  facialScanUrl?: string;
}

class LoginCredentials {
  @Prop()
  passwordHash?: string;

  @Prop()
  googleId?: string;
}

class TenantPreferences {
  @Prop({ type: [String], enum: PropertyType, default: [] })
  lookingFor?: PropertyType[];

  @Prop()
  gender?: string;

  @Prop()
  employmentStatus?: string;

  @Prop()
  annualEarnings?: number;

  @Prop()
  maritalStatus?: string;

  @Prop({ type: String, enum: VehiclePreference })
  vehicles?: VehiclePreference;

  @Prop()
  hasPets?: boolean;

  @Prop()
  petFriendlyRequired?: boolean;

  @Prop()
  smokingHabits?: string;

  @Prop()
  drinkingHabits?: string;

  @Prop()
  religionPreference?: string;

  @Prop()
  educationLevel?: string;

  @Prop()
  socialHabits?: string;

  @Prop()
  hasChildren?: boolean;

  @Prop()
  maxCommuteRadius?: number;
}

class Preferences {
  @Prop({ type: TenantPreferences })
  tenant?: TenantPreferences;

  @Prop({ type: Object })
  landlord?: Record<string, unknown>;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, enum: UserRole, default: UserRole.Unassigned })
  role: UserRole;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ unique: true, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  phoneNumber?: string;

  @Prop()
  photoUrl?: string;

  @Prop({ type: Address })
  address?: Address;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: String, enum: VerificationStatus, default: VerificationStatus.None })
  verificationStatus: VerificationStatus;

  @Prop({ type: VerificationDetails })
  verificationDetails?: VerificationDetails;

  @Prop({ type: LoginCredentials })
  loginCredentials?: LoginCredentials;

  @Prop({ type: Preferences })
  preferences?: Preferences;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop()
  emailOtp?: string;

  @Prop()
  emailOtpHash?: string;

  @Prop()
  emailOtpExpiresAt?: Date;

  @Prop({ default: 0 })
  emailOtpAttempts?: number;

  @Prop()
  phoneOtp?: string;

  @Prop()
  phoneOtpHash?: string;

  @Prop()
  phoneOtpExpiresAt?: Date;

  @Prop({ default: 0 })
  phoneOtpAttempts?: number;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpiresAt?: Date;

  @Prop({ type: [Types.ObjectId], ref: "Property", default: [] })
  savedProperties?: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
