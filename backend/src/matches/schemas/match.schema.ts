import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { MatchStatus } from "../../common/enums";

export type MatchDocument = HydratedDocument<Match>;

@Schema({ timestamps: true })
export class Match {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Property", required: true })
  propertyId: Types.ObjectId;

  @Prop({ type: String, enum: MatchStatus, default: MatchStatus.TenantLiked })
  status: MatchStatus;

  @Prop()
  matchScore?: number;

  @Prop()
  preferencesMatchPercentage?: number;

  @Prop()
  apartmentPreferenceMatchPercentage?: number;

  @Prop({ default: false })
  tenantLiked?: boolean;

  @Prop({ default: () => new Date() })
  timestamp: Date;

  @Prop()
  landlordSeenAt?: Date;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
