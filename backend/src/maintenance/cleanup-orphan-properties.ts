import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import mongoose, { Model, Types } from "mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { Property, PropertySchema } from "../properties/schemas/property.schema";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import { Message, MessageSchema } from "../chat/schemas/message.schema";

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

const getModel = <T>(name: string, schema: mongoose.Schema): Model<T> =>
  (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

async function cleanup() {
  loadEnv();
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/get-a-roof";
  await mongoose.connect(uri);

  const UserModel = getModel<User>("User", UserSchema);
  const PropertyModel = getModel<Property>("Property", PropertySchema);
  const MatchModel = getModel<Match>("Match", MatchSchema);
  const MessageModel = getModel<Message>("Message", MessageSchema);

  const existingUserIds = await UserModel.find().distinct("_id");
  const userIdStrings = new Set(existingUserIds.map((id) => id.toString()));

  const orphanProperties = await PropertyModel.aggregate<{ _id: Types.ObjectId }>([
    {
      $lookup: {
        from: "users",
        let: { landlordId: "$landlordId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $toString: "$_id" }, { $toString: "$$landlordId" }],
              },
            },
          },
        ],
        as: "landlord",
      },
    },
    { $match: { landlord: { $eq: [] } } },
    { $project: { _id: 1 } },
  ]);

  const orphanPropertyIds = orphanProperties.map((p) => p._id);
  if (orphanPropertyIds.length) {
    const matchIds = await MatchModel.find({
      propertyId: { $in: orphanPropertyIds },
    }).distinct("_id");

    if (matchIds.length) {
      await MessageModel.deleteMany({
        matchId: { $in: matchIds.map((id) => new Types.ObjectId(id)) },
      });
      await MatchModel.deleteMany({ _id: { $in: matchIds } });
    }

    await PropertyModel.deleteMany({ _id: { $in: orphanPropertyIds } });
  }

  const tenantMatchIds = await MatchModel.find().distinct("_id");
  if (tenantMatchIds.length) {
    const matchesWithTenant = await MatchModel.find({
      tenantId: { $exists: true },
    }).select("_id tenantId");
    const orphanMatchIds = matchesWithTenant
      .filter((match) => !userIdStrings.has(match.tenantId.toString()))
      .map((match) => match._id);

    if (orphanMatchIds.length) {
      await MessageModel.deleteMany({
        matchId: { $in: orphanMatchIds.map((id) => new Types.ObjectId(id)) },
      });
      await MatchModel.deleteMany({ _id: { $in: orphanMatchIds } });
    }
  }

  console.log(
    `Cleanup complete. Removed ${orphanPropertyIds.length} orphan properties.`
  );
}

cleanup()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
