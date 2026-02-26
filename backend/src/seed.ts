import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import mongoose, { Model } from "mongoose";
import * as bcrypt from "bcrypt";
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
  console.log("Loading environment variables...");
  loadEnv();
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/get-a-roof";

  console.log(`Connecting to database at ${uri.substring(0, 20)}...`);
  try {
    await mongoose.connect(uri);
    console.log("Successfully connected to the database.");
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    return;
  }

  console.log("Initializing models...");
  const UserModel = getModel<User>("User", UserSchema);
  const PropertyModel = getModel<Property>("Property", PropertySchema);
  const MatchModel = getModel<Match>("Match", MatchSchema);
  const MessageModel = getModel<Message>("Message", MessageSchema);

  console.log("Hashing password...");
  const password = process.env.SEED_PASSWORD || "Victor1@seun";
  const passwordHash = await bcrypt.hash(password, 10);

  const landlordEmail = "seunv0619@gmail.com";
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
        firstName: "Victor",
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

  // Helper arrays for generation
  const AI_IMAGES = [
    "/ai_house_1.png",
    "/ai_house_2.png",
    "/ai_house_3.png",
    "/ai_house_4.png",
    "/ai_house_5.png",
  ];

  const SUBURBS = [
    { city: "Victoria Island", state: "Lagos", zip: "101241", lat: 6.4358, lng: 3.4251, neighborhood: "Victoria Island" },
    { city: "Lekki", state: "Lagos", zip: "105102", lat: 6.4281, lng: 3.4287, neighborhood: "Lekki Phase 1" },
    { city: "Abuja", state: "FCT", zip: "900108", lat: 9.0732, lng: 7.4911, neighborhood: "Gwarinpa" },
    { city: "Ikeja", state: "Lagos", zip: "100281", lat: 6.6018, lng: 3.3515, neighborhood: "GRA" },
    { city: "Yaba", state: "Lagos", zip: "101212", lat: 6.5095, lng: 3.3711, neighborhood: "Alagomeji" }
  ];

  const ADJECTIVES = ["Bright", "Premium", "Renovated", "Cozy", "Spacious", "Luxurious", "Modern", "Classic"];
  const TYPES = [PropertyType.SelfCompound, PropertyType.Shortlet, PropertyType.SharedApartment, PropertyType.SharedCompound];
  const AMENITIES_POOL = ["Laundry", "Security", "Elevator", "Pool", "Gym", "Parking", "Generator", "Fast WiFi"];

  const generateRandomProperty = (index: number) => {
    const suburb = SUBURBS[index % SUBURBS.length];
    const propertyType = TYPES[Math.floor(Math.random() * TYPES.length)];
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];

    // Pick 3 random images setup
    const shuffledImages = [...AI_IMAGES].sort(() => 0.5 - Math.random());
    const selectedImages = shuffledImages.slice(0, 3);

    const shuffledAmenities = [...AMENITIES_POOL].sort(() => 0.5 - Math.random());
    const selectedAmenities = shuffledAmenities.slice(0, Math.floor(Math.random() * 4) + 2); // 2 to 5 amenities

    const isPetFriendly = Math.random() > 0.5;
    const basePrice = Math.floor(Math.random() * 3000) + 1000; // 1000 to 4000

    return {
      landlordId,
      images: selectedImages,
      monthlyPrice: basePrice,
      address: {
        street: `${Math.floor(Math.random() * 999) + 1} Example Street ${index}`,
        city: suburb.city,
        state: suburb.state,
        zip: suburb.zip,
        lat: suburb.lat + (Math.random() - 0.5) * 0.05,
        lng: suburb.lng + (Math.random() - 0.5) * 0.05,
      },
      neighborhood: suburb.neighborhood,
      bedCount: Math.floor(Math.random() * 4) + 1, // 1 to 4
      bathCount: Math.floor(Math.random() * 3) + 1, // 1 to 3
      sqFt: Math.floor(Math.random() * 1500) + 500, // 500 to 2000
      petFriendly: isPetFriendly,
      propertyType,
      description: `${seedTag} ${adjective} ${propertyType.toLowerCase().replace('_', ' ')} located in ${suburb.neighborhood}.`,
      amenities: selectedAmenities,
      status: PropertyStatus.Listed,
      landlordRequirements: {
        budgetRange: { min: Math.floor(basePrice * 0.8), max: Math.floor(basePrice * 1.5) },
        annualIncome: { min: basePrice * 30 },
        petsAllowed: isPetFriendly,
        [propertyType === PropertyType.SelfCompound ? 'selfCompound' :
          propertyType === PropertyType.Shortlet ? 'shortlet' :
            propertyType === PropertyType.SharedApartment ? 'sharedApartment' : 'sharedCompound']: true,
      },
    };
  };

  const propertiesData = Array.from({ length: 50 }, (_, i) => generateRandomProperty(i));
  const properties = [];

  console.log("Starting to insert 50 properties in batches of 10...");
  // Insert in batches of 10 to avoid OOM
  for (let i = 0; i < propertiesData.length; i += 10) {
    const batch = propertiesData.slice(i, i + 10);
    console.log(`Inserting batch ${i / 10 + 1}...`);
    const insertedBatch = await PropertyModel.insertMany(batch);
    properties.push(...insertedBatch);
  }
  console.log("Successfully inserted all 50 properties.");

  // Take first 3 properties for dummy matches
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
