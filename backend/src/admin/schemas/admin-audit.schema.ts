import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AdminAuditDocument = HydratedDocument<AdminAudit>;

@Schema({ timestamps: true })
export class AdminAudit {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  adminId: Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  entityType: string;

  @Prop()
  entityId?: string;

  @Prop({ type: Object })
  details?: Record<string, unknown>;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export const AdminAuditSchema = SchemaFactory.createForClass(AdminAudit);
AdminAuditSchema.index({ adminId: 1, createdAt: -1 });
AdminAuditSchema.index({ entityType: 1, createdAt: -1 });
