import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import mongoose, { Model, PipelineStage, Schema, Types } from "mongoose";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { Message, MessageSchema } from "../chat/schemas/message.schema";

type DuplicateGroup = {
  _id: { tenantId: string; propertyId: string };
  ids: Types.ObjectId[];
  count: number;
};

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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

const getModel = <T>(name: string, schema: Schema): Model<T> =>
  (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

async function run() {
  loadEnv();
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/get-a-roof";
  await mongoose.connect(uri);

  const MatchModel = getModel<Match>("Match", MatchSchema);
  const MessageModel = getModel<Message>("Message", MessageSchema);

  const pipeline: PipelineStage[] = [
    {
      $group: {
        _id: {
          tenantId: { $toString: "$tenantId" },
          propertyId: { $toString: "$propertyId" },
        },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ];

  let totalDeletedMatches = 0;
  let totalDeletedMessages = 0;
  let groupsProcessed = 0;

  const cursor = MatchModel.aggregate(pipeline)
    .allowDiskUse(true)
    .cursor({ batchSize: 100 }) as AsyncIterable<DuplicateGroup>;

  for await (const group of cursor) {
    groupsProcessed += 1;
    const docs = await MatchModel.find({ _id: { $in: group.ids } })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .select("_id")
      .lean()
      .exec();

    const keepId = docs[0]?._id;
    const deleteIds = docs
      .map((item) => item._id)
      .filter((id) => keepId && id.toString() !== keepId.toString());

    if (!keepId || deleteIds.length === 0) {
      continue;
    }

    const [deleteMessagesResult, deleteMatchesResult] = await Promise.all([
      MessageModel.deleteMany({ matchId: { $in: deleteIds } }).exec(),
      MatchModel.deleteMany({ _id: { $in: deleteIds } }).exec(),
    ]);

    totalDeletedMatches += deleteMatchesResult.deletedCount ?? 0;
    totalDeletedMessages += deleteMessagesResult.deletedCount ?? 0;
    console.log(
      `Deduped tenant=${group._id.tenantId} property=${group._id.propertyId} kept=${keepId.toString()} deleted=${deleteIds.length}`
    );
    if (groupsProcessed % 100 === 0) {
      console.log(
        `Progress: groups=${groupsProcessed} deletedMatches=${totalDeletedMatches} deletedMessages=${totalDeletedMessages}`
      );
    }
  }

  try {
    await MatchModel.syncIndexes();
    console.log("Match indexes synced.");
  } catch (error) {
    console.error("Failed to sync Match indexes:", error);
    throw error;
  }

  console.log(
    `Done. groups=${groupsProcessed} deletedMatches=${totalDeletedMatches}, deletedMessages=${totalDeletedMessages}`
  );
}

run()
  .catch((error) => {
    console.error("dedupe-matches failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
