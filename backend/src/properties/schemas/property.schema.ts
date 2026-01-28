import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { PropertyStatus, PropertyType, VehiclePreference } from "../../common/enums";

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

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  amenities?: string[];

  @Prop()
  proofOfOwnership?: string;

  @Prop({ type: String, enum: PropertyStatus, default: PropertyStatus.Draft })
  status: PropertyStatus;

  @Prop({ type: LandlordRequirements })
  landlordRequirements?: LandlordRequirements;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
