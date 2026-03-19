import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import mongoose, { Model, Types } from "mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { Property, PropertySchema } from "../properties/schemas/property.schema";
import { Match, MatchSchema } from "../matches/schemas/match.schema";
import {
  computeMatchScore,
  type PropertyMatchInput,
  type TenantPreferences,
} from "../common/utils/match.utils";

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

async function run() {
  loadEnv();
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/get-a-roof";
  await mongoose.connect(uri);
  const limit =
    Number.parseInt(process.env.BACKFILL_LIMIT ?? "", 10) > 0
      ? Number.parseInt(process.env.BACKFILL_LIMIT ?? "", 10)
      : null;

  const UserModel = getModel<User>("User", UserSchema);
  const PropertyModel = getModel<Property>("Property", PropertySchema);
  const MatchModel = getModel<Match>("Match", MatchSchema);

  let updated = 0;
  let skipped = 0;
  let scanned = 0;

  const cursor = MatchModel.find({
    $or: [
      { matchScore: { $exists: false } },
      { preferencesMatchPercentage: { $exists: false } },
      { apartmentPreferenceMatchPercentage: { $exists: false } },
      { locationScore: { $exists: false } },
      { amenityScore: { $exists: false } },
      { affordabilityScore: { $exists: false } },
    ],
  })
    .select("_id tenantId propertyId")
    .lean()
    .cursor({ batchSize: 200 });

  for await (const match of cursor) {
    scanned += 1;
    if (limit && scanned > limit) {
      break;
    }
    const tenantId = String(match.tenantId);
    const propertyId = String(match.propertyId);

    if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(propertyId)) {
      skipped += 1;
      continue;
    }

    const [tenant, property] = await Promise.all([
      UserModel.findById(tenantId).lean().exec(),
      PropertyModel.findById(propertyId).lean().exec(),
    ]);

    if (!tenant || !property) {
      skipped += 1;
      continue;
    }

    const tenantPrefs = ((tenant as unknown as { preferences?: { tenant?: TenantPreferences } })
      .preferences?.tenant ?? {}) as TenantPreferences;
    const tenantAddress = (tenant as unknown as { address?: { lat?: number; lng?: number } })
      .address;
    const propertyAddress = (
      property as unknown as { address?: { lat?: number; lng?: number } }
    ).address;

    const matchInput: PropertyMatchInput = {
      propertyType: property.propertyType,
      monthlyPrice: property.monthlyPrice,
      petFriendly: property.petFriendly,
      landlordRequirements: property.landlordRequirements,
      amenities: property.amenities,
      lat: propertyAddress?.lat,
      lng: propertyAddress?.lng,
    };

    const nextScore = computeMatchScore(
      {
        ...tenantPrefs,
        lat: tenantAddress?.lat,
        lng: tenantAddress?.lng,
      },
      matchInput
    );

    await MatchModel.updateOne(
      { _id: match._id },
      {
        $set: {
          matchScore: nextScore.matchScore,
          preferencesMatchPercentage: nextScore.preferencesMatchPercentage,
          apartmentPreferenceMatchPercentage:
            nextScore.apartmentPreferenceMatchPercentage,
          locationScore: nextScore.locationScore,
          amenityScore: nextScore.amenityScore,
          affordabilityScore: nextScore.affordabilityScore,
        },
      }
    ).exec();
    updated += 1;
    if (scanned % 200 === 0) {
      console.log(`Progress: scanned=${scanned} updated=${updated} skipped=${skipped}`);
    }
  }

  console.log(
    `Backfill complete. scanned=${scanned} updated=${updated} skipped=${skipped}`
  );
}

run()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
