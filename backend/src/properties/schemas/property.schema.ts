import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import {
  ListingIntent,
  PropertyStatus,
  PropertyType,
  VehiclePreference,
} from "../../common/enums";

export type PropertyDocument = HydratedDocument<Property>;

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

class BudgetRange {
  @Prop()
  min?: number;

  @Prop()
  max?: number;
}

class IdealTenantPreferences {
  @Prop()
  gender?: string;

  @Prop()
  employmentStatus?: string;

  @Prop()
  maritalStatus?: string;

  @Prop({ type: String, enum: VehiclePreference })
  vehicles?: VehiclePreference;

  @Prop()
  hasPets?: boolean;

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
}

class LandlordRequirements {
  @Prop({ type: BudgetRange })
  budgetRange?: BudgetRange;

  @Prop({ type: BudgetRange })
  annualIncome?: BudgetRange;

  @Prop()
  petsAllowed?: boolean;

  @Prop()
  nonOwnerOccupied?: boolean;

  @Prop()
  sharedApartment?: boolean;

  @Prop()
  shortlet?: boolean;

  @Prop()
  selfCompound?: boolean;

  @Prop()
  sharedCompound?: boolean;

  @Prop({ type: IdealTenantPreferences })
  idealTenantPreferences?: IdealTenantPreferences;

  @Prop({ type: Object })
  tenantPreferences?: Record<string, unknown>;

}

@Schema({ timestamps: true })
export class Property {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  landlordId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop()
  monthlyPrice?: number;

  @Prop({ type: Address })
  address?: Address;

  @Prop()
  neighborhood?: string;

  @Prop()
  bedCount?: number;

  @Prop()
  bathCount?: number;

  @Prop()
  sqFt?: number;

  @Prop()
  petFriendly?: boolean;

  @Prop({ type: String, enum: PropertyType })
  propertyType?: PropertyType;

  @Prop({ type: String, enum: ListingIntent, default: ListingIntent.Rent })
  listingIntent?: ListingIntent;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  amenities?: string[];

  @Prop()
  proofOfOwnership?: string;

  @Prop({ type: String, enum: PropertyStatus, default: PropertyStatus.Draft })
  status: PropertyStatus;

  @Prop({
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Hidden"],
    default: "Pending",
  })
  moderationStatus?: "Pending" | "Approved" | "Rejected" | "Hidden";

  @Prop()
  moderationReason?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  moderatedBy?: Types.ObjectId;

  @Prop()
  moderatedAt?: Date;

  @Prop({ type: LandlordRequirements })
  landlordRequirements?: LandlordRequirements;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
PropertySchema.index({ landlordId: 1, status: 1, updatedAt: -1 });
