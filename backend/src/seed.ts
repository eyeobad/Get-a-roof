import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import mongoose, { Model } from "mongoose";
import bcrypt from "bcrypt";
import { User, UserSchema } from "./users/schemas/user.schema";
import { Property, PropertySchema } from "./properties/schemas/property.schema";
import { Match, MatchSchema } from "./matches/schemas/match.schema";
import { Message, MessageSchema } from "./chat/schemas/message.schema";
import { MatchStatus, PropertyStatus, PropertyType, UserRole } from "./common/enums";

const seedTag = "seed:get-a-roof";

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

async function seed() {
  loadEnv();
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/get-a-roof";
  await mongoose.connect(uri);

  const UserModel = getModel<User>("User", UserSchema);
  const PropertyModel = getModel<Property>("Property", PropertySchema);
  const MatchModel = getModel<Match>("Match", MatchSchema);
  const MessageModel = getModel<Message>("Message", MessageSchema);

  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const landlordEmail = "landlord@getaroof.dev";
  const tenantEmail = "tenant@getaroof.dev";
  const tenantTwoEmail = "tenant2@getaroof.dev";
  const seedEmails = [landlordEmail, tenantEmail, tenantTwoEmail];

  if (process.env.CLEAR_SEED === "true") {
    const seedUsers = await UserModel.find({ email: { $in: seedEmails } })
      .select("_id")
      .exec();
    const seedUserIds = seedUsers.map((user) => user._id);
    const seedProperties = await PropertyModel.find({
      description: { $regex: seedTag, $options: "i" },
    })
      .select("_id")
      .exec();
    const seedPropertyIds = seedProperties.map((property) => property._id);
    const matchIds = await MatchModel.find({
      $or: [
        { propertyId: { $in: seedPropertyIds } },
        { tenantId: { $in: seedUserIds } },
      ],
    })
      .distinct("_id")
      .exec();
    if (matchIds.length) {
      await MessageModel.deleteMany({ matchId: { $in: matchIds } });
      await MatchModel.deleteMany({ _id: { $in: matchIds } });
    }
    if (seedPropertyIds.length) {
      await PropertyModel.deleteMany({ _id: { $in: seedPropertyIds } });
    }
    if (seedUserIds.length) {
      await UserModel.deleteMany({ _id: { $in: seedUserIds } });
    }
    console.log("Seed data cleared.");
    return;
  }

  const landlord = await UserModel.findOneAndUpdate(
    { email: landlordEmail },
    {
      $set: {
        email: landlordEmail,
        firstName: "Lana",
        lastName: "Landlord",
        role: UserRole.Landlord,
        phoneNumber: "+15550001",
        loginCredentials: { passwordHash },
        emailVerified: true,
        phoneVerified: true,
      },
    },
    { new: true, upsert: true }
  );

  const tenant = await UserModel.findOneAndUpdate(
    { email: tenantEmail },
    {
      $set: {
        email: tenantEmail,
        firstName: "Terry",
        lastName: "Tenant",
        role: UserRole.Tenant,
        phoneNumber: "+15550002",
        loginCredentials: { passwordHash },
        emailVerified: true,
        phoneVerified: true,
        preferences: {
          tenant: {
            lookingFor: [PropertyType.SelfCompound, PropertyType.SharedApartment],
            employmentStatus: "Employed",
            annualEarnings: 90000,
            maritalStatus: "Single",
            vehicles: "Yes",
            hasPets: false,
            petFriendlyRequired: true,
            smokingHabits: "No",
            drinkingHabits: "Occasionally",
            religionPreference: "No Preference",
            educationLevel: "Bachelors",
            socialHabits: "Often",
            hasChildren: false,
            maxCommuteRadius: 20,
          },
        },
      },
    },
    { new: true, upsert: true }
  );

  const tenantTwo = await UserModel.findOneAndUpdate(
    { email: tenantTwoEmail },
    {
      $set: {
        email: tenantTwoEmail,
        firstName: "Tina",
        lastName: "Tenant",
        role: UserRole.Tenant,
        phoneNumber: "+15550003",
        loginCredentials: { passwordHash },
        emailVerified: true,
        phoneVerified: true,
        preferences: {
          tenant: {
            lookingFor: [PropertyType.Shortlet, PropertyType.SharedCompound],
            employmentStatus: "Self-Employed",
            annualEarnings: 120000,
            maritalStatus: "Married",
            vehicles: "No",
            hasPets: true,
            petFriendlyRequired: false,
            smokingHabits: "No",
            drinkingHabits: "Socially",
            religionPreference: "Christian",
            educationLevel: "Masters",
            socialHabits: "Occasionally",
            hasChildren: true,
            maxCommuteRadius: 30,
          },
        },
      },
    },
    { new: true, upsert: true }
  );

  const landlordId = landlord._id;
  const tenantIds = [tenant._id, tenantTwo._id];

  const existingPropertyIds = await PropertyModel.find({
    landlordId,
  }).distinct("_id");

  const existingMatchIds = await MatchModel.find({
    $or: [{ propertyId: { $in: existingPropertyIds } }, { tenantId: { $in: tenantIds } }],
  }).distinct("_id");

  if (existingMatchIds.length) {
    await MessageModel.deleteMany({ matchId: { $in: existingMatchIds } });
    await MatchModel.deleteMany({ _id: { $in: existingMatchIds } });
  }

  if (existingPropertyIds.length) {
    await PropertyModel.deleteMany({ _id: { $in: existingPropertyIds } });
  }

  const properties = await PropertyModel.insertMany([
    {
      landlordId,
      images: ["/p2.png", "/p5.png", "/p6.png"],
      monthlyPrice: 2200,
      address: {
        street: "21 Johnson Street",
        city: "Victoria Island",
        state: "Lagos",
        zip: "101241",
        lat: 6.4358,
        lng: 3.4251,
      },
      neighborhood: "Victoria Island",
      bedCount: 2,
      bathCount: 2,
      sqFt: 1300,
      petFriendly: true,
      propertyType: PropertyType.SelfCompound,
      description: `${seedTag} Bright self compound close to the lagoon.`,
      amenities: ["Laundry", "Security", "Elevator"],
      status: PropertyStatus.Listed,
      landlordRequirements: {
        budgetRange: { min: 1500, max: 3000 },
        annualIncome: { min: 60000 },
        petsAllowed: true,
        selfCompound: true,
      },
    },
    {
      landlordId,
      images: ["/p3.png", "/p7.png", "/p8.png"],
      monthlyPrice: 3400,
      address: {
        street: "8 Palm Drive",
        city: "Lekki",
        state: "Lagos",
        zip: "105102",
        lat: 6.4281,
        lng: 3.4287,
      },
      neighborhood: "Lekki Phase 1",
      bedCount: 4,
      bathCount: 3,
      sqFt: 2100,
      petFriendly: false,
      propertyType: PropertyType.Shortlet,
      description: `${seedTag} Premium shortlet with private balcony views.`,
      amenities: ["Pool", "Gym", "Parking"],
      status: PropertyStatus.Listed,
      landlordRequirements: {
        budgetRange: { min: 3000, max: 5000 },
        annualIncome: { min: 100000 },
        shortlet: true,
        sharedCompound: false,
      },
    },
    {
      landlordId,
      images: ["/p4.png", "/p6.png", "/p7.png"],
      monthlyPrice: 1800,
      address: {
        street: "120 Harmon Road",
        city: "Abuja",
        state: "FCT",
        zip: "900108",
        lat: 9.0732,
        lng: 7.4911,
      },
      neighborhood: "Gwarinpa",
      bedCount: 3,
      bathCount: 2,
      sqFt: 1600,
      petFriendly: true,
      propertyType: PropertyType.SharedApartment,
      description: `${seedTag} Renovated shared apartment with skylight.`,
      amenities: ["Security", "Generator"],
      status: PropertyStatus.Listed,
      landlordRequirements: {
        budgetRange: { min: 1200, max: 2200 },
        annualIncome: { min: 50000 },
        sharedApartment: true,
      },
    },
  ]);

  const [propertyOne, propertyTwo, propertyThree] = properties;

  const matches = await MatchModel.insertMany([
    {
      tenantId: tenant._id,
      propertyId: propertyOne._id,
      status: MatchStatus.ChatInitiated,
      tenantLiked: true,
      matchScore: 86,
      preferencesMatchPercentage: 80,
      apartmentPreferenceMatchPercentage: 100,
      timestamp: new Date(),
    },
    {
      tenantId: tenant._id,
      propertyId: propertyThree._id,
      status: MatchStatus.LandlordQualified,
      tenantLiked: true,
      matchScore: 78,
      preferencesMatchPercentage: 70,
      apartmentPreferenceMatchPercentage: 90,
      timestamp: new Date(),
    },
    {
      tenantId: tenantTwo._id,
      propertyId: propertyTwo._id,
      status: MatchStatus.TenantLiked,
      tenantLiked: true,
      matchScore: 72,
      preferencesMatchPercentage: 60,
      apartmentPreferenceMatchPercentage: 90,
      timestamp: new Date(),
    },
  ]);

  const chatMatch = matches[0];

  await MessageModel.insertMany([
    {
      matchId: chatMatch._id,
      senderId: tenant._id,
      receiverId: landlordId,
      content: "Hi! I love this place. Is it still available?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      isRead: true,
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
    {
      matchId: chatMatch._id,
      senderId: landlordId,
      receiverId: tenant._id,
      content: "Yes, it is. Would you like to schedule a tour this week?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      isRead: false,
    },
  ]);

  console.log("Seed complete.");
  console.log("Login credentials:");
  console.log(`Landlord: ${landlordEmail} / ${password}`);
  console.log(`Tenant: ${tenantEmail} / ${password}`);
  console.log(`Tenant 2: ${tenantTwoEmail} / ${password}`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
