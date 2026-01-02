import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: "Match", required: true })
  matchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  receiverId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: () => new Date() })
  timestamp: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
