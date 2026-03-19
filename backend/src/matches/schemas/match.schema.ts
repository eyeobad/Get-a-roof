import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { DismissReason, MatchStatus, RouteAccessStatus } from "../../common/enums";

export type MatchDocument = HydratedDocument<Match>;

@Schema({ timestamps: true })
export class Match {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Property", required: true })
  propertyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  landlordId?: Types.ObjectId;

  @Prop({ type: String, enum: MatchStatus, default: MatchStatus.TenantLiked })
  status: MatchStatus;

  @Prop()
  matchScore?: number;

  @Prop()
  preferencesMatchPercentage?: number;

  @Prop()
  apartmentPreferenceMatchPercentage?: number;

  @Prop()
  locationScore?: number;

  @Prop()
  amenityScore?: number;

  @Prop()
  affordabilityScore?: number;

  @Prop({ default: false })
  tenantLiked?: boolean;

  @Prop({ default: () => new Date() })
  timestamp: Date;

  @Prop()
  landlordSeenAt?: Date;

  @Prop()
  dismissedAt?: Date;

  @Prop({ type: String, enum: DismissReason })
  dismissReason?: DismissReason;

  @Prop({ default: 0 })
  recycleCount?: number;

  @Prop({
    type: {
      content: { type: String },
      senderId: { type: Types.ObjectId, ref: "User" },
      timestamp: { type: Date },
    },
  })
  lastMessage?: {
    content?: string;
    senderId?: Types.ObjectId;
    timestamp?: Date;
  };

  @Prop({ default: 0 })
  tenantUnreadCount?: number;

  @Prop({ default: 0 })
  landlordUnreadCount?: number;

  @Prop({ default: false })
  landlordReplied?: boolean;

  @Prop({
    type: String,
    enum: RouteAccessStatus,
    default: RouteAccessStatus.None,
  })
  routeAccessStatus?: RouteAccessStatus;

  @Prop()
  routeAccessRequestedAt?: Date;

  @Prop()
  routeAccessRespondedAt?: Date;

  @Prop()
  routeOriginLat?: number;

  @Prop()
  routeOriginLng?: number;

  @Prop()
  routeAccessExpiresAt?: Date;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ tenantId: 1, propertyId: 1 }, { unique: true });
MatchSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });
MatchSchema.index({ propertyId: 1, status: 1, updatedAt: -1 });
MatchSchema.index({ status: 1, dismissReason: 1, dismissedAt: 1 });
MatchSchema.index({ landlordId: 1, status: 1, updatedAt: -1 });
