import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import * as bcrypt from "bcrypt";
import mongoose from "mongoose";
import { JwtService } from "@nestjs/jwt";
import { User, UserSchema } from "../users/schemas/user.schema";
import {
  PropertyType,
  UserRole,
  VehiclePreference,
  VerificationStatus,
} from "../common/enums";

type EnvMap = Record<string, string>;

function loadEnvFile(envPath: string): EnvMap {
  const content = readFileSync(envPath, "utf8");
  const env: EnvMap = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value.replace(/\\n/g, "\n");
  }

  return env;
}

function getConfig() {
  const backendRoot = resolve(__dirname, "../..");
  const envPath = join(backendRoot, ".env");
  const env = loadEnvFile(envPath);

  const mongoUri = process.env.MONGODB_URI || env.MONGODB_URI;
  const jwtSecret = process.env.JWT_SECRET || env.JWT_SECRET;
  const count = Number(process.env.LOAD_TEST_TENANT_COUNT || "1000");
  const password =
    process.env.LOAD_TEST_TENANT_PASSWORD ||
    process.env.SEED_PASSWORD ||
    "Victor1@seun";
  const emailPrefix =
    process.env.LOAD_TEST_TENANT_PREFIX || "loadtest-tenant";
  const emailDomain =
    process.env.LOAD_TEST_TENANT_DOMAIN || "getaroof.dev";
  const outputDir = resolve(
    backendRoot,
    process.env.LOAD_TEST_OUTPUT_DIR || "loadtests/generated"
  );

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return {
    count,
    emailDomain,
    emailPrefix,
    jwtSecret,
    mongoUri,
    outputDir,
    password,
  };
}

function buildEmail(index: number, prefix: string, domain: string) {
  return `${prefix}-${String(index).padStart(4, "0")}@${domain}`.toLowerCase();
}

function buildPhone(index: number) {
  return `+1556${String(index).padStart(7, "0")}`;
}

async function main() {
  const config = getConfig();
  mkdirSync(config.outputDir, { recursive: true });

  await mongoose.connect(config.mongoUri);
  const UserModel =
    mongoose.models.User || mongoose.model(User.name, UserSchema);
  const jwtService = new JwtService({
    secret: config.jwtSecret,
    signOptions: { expiresIn: "7d" },
  });

  const passwordHash = await bcrypt.hash(config.password, 10);
  const emails = Array.from({ length: config.count }, (_unused, index) =>
    buildEmail(index + 1, config.emailPrefix, config.emailDomain)
  );

  const existingUsers = await UserModel.find({ email: { $in: emails } })
    .select("_id email tokenVersion role")
    .lean();
  const existingByEmail = new Set(
    existingUsers.map((user) => String(user.email).toLowerCase())
  );

  const usersToInsert = emails
    .filter((email) => !existingByEmail.has(email))
    .map((email, index) => ({
      email,
      firstName: "Load",
      lastName: `Tenant ${index + 1}`,
      role: UserRole.Tenant,
      phoneNumber: buildPhone(index + 1),
      verificationStatus: VerificationStatus.None,
      isVerified: false,
      emailVerified: true,
      phoneVerified: true,
      isSuspended: false,
      tokenVersion: 0,
      loginCredentials: { passwordHash },
      preferences: {
        tenant: {
          lookingFor: [
            PropertyType.NonOwnerOccupied,
            PropertyType.SharedApartment,
            PropertyType.Shortlet,
          ],
          employmentStatus: "Employed",
          annualEarnings: 120000,
          maritalStatus: "Single",
          vehicles: VehiclePreference.Yes,
          hasPets: false,
          petFriendlyRequired: false,
          smokingHabits: "No",
          drinkingHabits: "Occasionally",
          religionPreference: "No Preference",
          educationLevel: "Bachelors",
          socialHabits: "Moderate",
          hasChildren: false,
          maxCommuteRadius: 10,
          preferredDistance: 10,
          hasSeenExploreTutorial: true,
          hasSeenMatchesTutorial: true,
          hasSeenMessagesTutorial: true,
          hasSeenProfileTutorial: true,
        },
      },
    }));

  if (usersToInsert.length > 0) {
    await UserModel.insertMany(usersToInsert, { ordered: false });
  }

  const users = await UserModel.find({ email: { $in: emails } })
    .select("_id email tokenVersion role")
    .sort({ email: 1 })
    .lean();

  const tokenLines = users.map((user) =>
    jwtService.sign({
      sub: String(user._id),
      email: String(user.email).toLowerCase(),
      role: user.role,
      tv: user.tokenVersion ?? 0,
    })
  );
  const emailLines = users.map((user) => String(user.email).toLowerCase());

  const tokenPath = join(config.outputDir, "tenant-tokens.txt");
  const emailPath = join(config.outputDir, "tenant-emails.txt");
  const metadataPath = join(config.outputDir, "tenant-credentials.json");

  writeFileSync(tokenPath, `${tokenLines.join("\n")}\n`, "utf8");
  writeFileSync(emailPath, `${emailLines.join("\n")}\n`, "utf8");
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        count: users.length,
        password: config.password,
        generatedAt: new Date().toISOString(),
        emailFile: emailPath,
        tokenFile: tokenPath,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Prepared ${users.length} tenant users.`);
  console.log(`Token file: ${tokenPath}`);
  console.log(`Email file: ${emailPath}`);
  console.log(`Password: ${config.password}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});
