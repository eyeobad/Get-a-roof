import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import mongoose, { Model, Types } from "mongoose";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { Message, MessageSchema } from "../chat/schemas/message.schema";
import { Property, PropertySchema } from "../properties/schemas/property.schema";

const loadEnv = () => {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...rest] = trimmed.split("=");
    if (!key) return;
    const raw = rest.join("=").trim();
    const value = raw.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
};

const getModel = <T>(name: string, schema: mongoose.Schema): Model<T> =>
  (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

async function run() {
  loadEnv();
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/get-a-roof";
  await mongoose.connect(uri);

  const MatchModel = getModel<Match>("Match", MatchSchema);
  const MessageModel = getModel<Message>("Message", MessageSchema);
  const PropertyModel = getModel<Property>("Property", PropertySchema);

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  const cursor = MatchModel.find({})
    .select("_id tenantId propertyId landlordId")
    .lean()
    .cursor({ batchSize: 200 });

  for await (const match of cursor) {
    scanned += 1;
    const matchId = new Types.ObjectId(String(match._id));
    const tenantId = String(match.tenantId);

    if (!Types.ObjectId.isValid(tenantId)) {
      skipped += 1;
      continue;
    }

    const [latestMessage, tenantUnreadCount, landlordUnreadCount, property] =
      await Promise.all([
        MessageModel.findOne({ matchId }).sort({ timestamp: -1 }).lean().exec(),
        MessageModel.countDocuments({
          matchId,
          receiverId: new Types.ObjectId(tenantId),
          isRead: false,
        }).exec(),
        (async () => {
          const landlordId =
            (match.landlordId && String(match.landlordId)) ||
            (await PropertyModel.findById(match.propertyId).select("landlordId").lean().exec())
              ?.landlordId?.toString?.();
          if (!landlordId || !Types.ObjectId.isValid(landlordId)) return 0;
          return MessageModel.countDocuments({
            matchId,
            receiverId: new Types.ObjectId(landlordId),
            isRead: false,
          }).exec();
        })(),
        match.landlordId
          ? Promise.resolve(null)
          : PropertyModel.findById(match.propertyId).select("landlordId").lean().exec(),
      ]);

    const patch: Record<string, unknown> = {
      tenantUnreadCount,
      landlordUnreadCount,
    };
    if (!match.landlordId && property?.landlordId) {
      patch.landlordId = property.landlordId;
    }
    if (latestMessage) {
      patch.lastMessage = {
        content: latestMessage.content,
        senderId: latestMessage.senderId,
        timestamp: latestMessage.timestamp,
      };
    }
    const landlordIdForReply =
      (patch.landlordId as Types.ObjectId | undefined)?.toString?.() ||
      (match.landlordId ? String(match.landlordId) : undefined);
    if (landlordIdForReply && Types.ObjectId.isValid(landlordIdForReply)) {
      const landlordReplyCount = await MessageModel.countDocuments({
        matchId,
        senderId: new Types.ObjectId(landlordIdForReply),
      }).exec();
      patch.landlordReplied = landlordReplyCount > 0;
    }

    await MatchModel.updateOne({ _id: matchId }, { $set: patch }).exec();
    updated += 1;
    if (scanned % 200 === 0) {
      console.log(`Progress: scanned=${scanned} updated=${updated} skipped=${skipped}`);
    }
  }

  console.log(`Backfill complete. scanned=${scanned} updated=${updated} skipped=${skipped}`);
}

run()
  .catch((error) => {
    console.error("backfill-chat-metadata failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
