import { PropertyType, VehiclePreference } from "../enums";
import { normalizePropertyType } from "./property.utils";
import { computePercentage, isInRange, toLower, valuesMatch } from "./match.helpers";
import { haversineDistanceKm } from "./geo.utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TenantPreferences = {
  lookingFor?: PropertyType[] | string[];
  employmentStatus?: string;
  annualEarnings?: number;
  maritalStatus?: string;
  vehicles?: VehiclePreference | string;
  hasPets?: boolean;
  petFriendlyRequired?: boolean;
  smokingHabits?: string;
  drinkingHabits?: string;
  religionPreference?: string;
  educationLevel?: string;
  socialHabits?: string;
  hasChildren?: boolean;
  maxCommuteRadius?: number;
  preferredDistance?: number;
  preferredState?: string;
  desiredAmenities?: string[];
  lat?: number;
  lng?: number;
};

export type LandlordRequirements = {
  budgetRange?: { min?: number; max?: number };
  annualIncome?: { min?: number; max?: number };
  petsAllowed?: boolean;
  nonOwnerOccupied?: boolean;
  sharedApartment?: boolean;
  shortlet?: boolean;
  selfCompound?: boolean;
  sharedCompound?: boolean;
  idealTenantPreferences?: Partial<TenantPreferences>;
  tenantPreferences?: Record<string, unknown>;
};

export type PropertyMatchInput = {
  propertyType?: PropertyType | string;
  monthlyPrice?: number;
  petFriendly?: boolean;
  landlordRequirements?: LandlordRequirements;
  amenities?: string[];
  lat?: number;
  lng?: number;
};

export type MatchWeights = {
  preferences: number;
  apartmentType: number;
  location: number;
  amenity: number;
  affordability: number;
};

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  preferences: 0.30,
  apartmentType: 0.20,
  location: 0.25,
  amenity: 0.10,
  affordability: 0.15,
};

export type MatchResult = {
  preferencesMatchPercentage: number;
  apartmentPreferenceMatchPercentage: number;
  locationScore: number;
  amenityScore: number;
  affordabilityScore: number;
  matchScore: number;
};

// ---------------------------------------------------------------------------
// Property-type similarity groups
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_GROUPS: PropertyType[][] = [
  [PropertyType.Apartment, PropertyType.Studio, PropertyType.Loft],
  [PropertyType.House, PropertyType.Bungalow, PropertyType.Villa],
  [PropertyType.Duplex, PropertyType.Townhouse],
  [PropertyType.Condo, PropertyType.Penthouse],
  [PropertyType.SharedApartment, PropertyType.SharedCompound],
  [PropertyType.SelfCompound, PropertyType.NonOwnerOccupied],
];

const typeToGroup = new Map<string, number>();
PROPERTY_TYPE_GROUPS.forEach((group, index) => {
  group.forEach((type) => typeToGroup.set(type, index));
});

// ---------------------------------------------------------------------------
// Tenant-preference keys used for landlord-requirement matching
// ---------------------------------------------------------------------------

const tenantPreferenceKeys: Array<keyof TenantPreferences> = [
  "employmentStatus",
  "maritalStatus",
  "vehicles",
  "smokingHabits",
  "drinkingHabits",
  "religionPreference",
  "educationLevel",
  "socialHabits",
  "hasChildren",
];

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function computeMatchScore(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): MatchResult {
  const apartmentPreferenceMatchPercentage = computeApartmentPreferenceMatch(
    tenant,
    property
  );
  const preferencesMatchPercentage = computePreferencesMatch(tenant, property);
  const locationScore = computeLocationScore(tenant, property);
  const amenityScore = computeAmenityScore(tenant, property);
  const affordabilityScore = computeAffordabilityScore(tenant, property);

  const matchScore = Math.round(
    preferencesMatchPercentage * weights.preferences +
    apartmentPreferenceMatchPercentage * weights.apartmentType +
    locationScore * weights.location +
    amenityScore * weights.amenity +
    affordabilityScore * weights.affordability
  );

  return {
    preferencesMatchPercentage,
    apartmentPreferenceMatchPercentage,
    locationScore,
    amenityScore,
    affordabilityScore,
    matchScore,
  };
}

// ---------------------------------------------------------------------------
// Apartment type — gradient similarity instead of binary
// ---------------------------------------------------------------------------

function computeApartmentPreferenceMatch(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
): number {
  const lookingFor = tenant?.lookingFor
    ?.map((value) =>
      normalizePropertyType(value)?.toString() ?? value.toString()
    )
    .filter(Boolean);

  if (!lookingFor || !lookingFor.length) {
    return 100; // no preference = everything matches
  }

  const normalizedType = normalizePropertyType(property.propertyType);
  if (!normalizedType) {
    return 50; // unknown property type gets neutral score
  }

  // Build the full set of types the property qualifies as
  const propertyTypes = new Set<string>();
  propertyTypes.add(normalizedType.toString());

  const requirements = property.landlordRequirements;
  if (requirements?.nonOwnerOccupied) propertyTypes.add(PropertyType.NonOwnerOccupied);
  if (requirements?.sharedApartment) propertyTypes.add(PropertyType.SharedApartment);
  if (requirements?.shortlet) propertyTypes.add(PropertyType.Shortlet);
  if (requirements?.selfCompound) propertyTypes.add(PropertyType.SelfCompound);
  if (requirements?.sharedCompound) propertyTypes.add(PropertyType.SharedCompound);

  // Exact match — any tenant-desired type matches a property type
  if (lookingFor.some((type) => propertyTypes.has(type))) {
    return 100;
  }

  // Gradient — check if property type is in the same similarity group
  const propertyGroup = typeToGroup.get(normalizedType.toString());
  if (propertyGroup !== undefined) {
    for (const desired of lookingFor) {
      const desiredGroup = typeToGroup.get(desired);
      if (desiredGroup === propertyGroup) {
        return 70; // same group = similar type
      }
    }
  }

  return 20; // completely different type category
}

// ---------------------------------------------------------------------------
// Location scoring — haversine distance with gradient
// ---------------------------------------------------------------------------

function computeLocationScore(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
): number {
  const tenantLat = tenant?.lat;
  const tenantLng = tenant?.lng;
  const propertyLat = property.lat;
  const propertyLng = property.lng;

  // If either side has no coordinates, neutral score
  if (
    tenantLat === undefined ||
    tenantLng === undefined ||
    propertyLat === undefined ||
    propertyLng === undefined
  ) {
    return 50; // no data = neutral, don't penalise
  }

  const distanceKm = haversineDistanceKm(
    { lat: tenantLat, lng: tenantLng },
    { lat: propertyLat, lng: propertyLng }
  );

  // Use preferred distance first, then fallback to maxCommuteRadius, default 20km
  const maxRadiusKm =
    tenant?.preferredDistance ??
    tenant?.maxCommuteRadius ??
    20;
  if (!Number.isFinite(maxRadiusKm) || maxRadiusKm <= 0) {
    return 50;
  }

  const ratio = distanceKm / maxRadiusKm;

  if (ratio <= 0.25) return 100; // very close
  if (ratio <= 0.50) return 85;
  if (ratio <= 0.75) return 65;
  if (ratio <= 1.00) return 40;  // at the edge of radius
  if (ratio <= 1.50) return 20;  // slightly beyond
  return 10; // far away
}

// ---------------------------------------------------------------------------
// Amenity overlap scoring
// ---------------------------------------------------------------------------

function computeAmenityScore(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
): number {
  const desired = tenant?.desiredAmenities;
  if (!desired || desired.length === 0) {
    return 100; // no preference = full score
  }

  const available = new Set(
    (property.amenities ?? []).map((a) => a.toLowerCase().trim())
  );

  if (available.size === 0) {
    return 30; // property lists no amenities, mild penalty
  }

  let matched = 0;
  for (const item of desired) {
    if (available.has(item.toLowerCase().trim())) {
      matched++;
    }
  }

  return computePercentage(matched, desired.length);
}

// ---------------------------------------------------------------------------
// Affordability — gradient instead of binary pass/fail
// ---------------------------------------------------------------------------

function computeAffordabilityScore(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
): number {
  const annualEarnings = tenant?.annualEarnings;
  const monthlyPrice = property.monthlyPrice;

  if (annualEarnings === undefined || monthlyPrice === undefined) {
    return 50; // no data = neutral
  }

  if (monthlyPrice <= 0) {
    return 100; // free / zero-cost
  }

  // 33% of monthly income is the comfort threshold
  const monthlyAffordable = annualEarnings / 12 / 3;

  if (monthlyAffordable <= 0) {
    return 0;
  }

  const ratio = monthlyPrice / monthlyAffordable;

  if (ratio <= 0.80) return 100; // comfortably affordable
  if (ratio <= 1.00) return 80;  // affordable
  if (ratio <= 1.20) return 50;  // stretch
  if (ratio <= 1.50) return 20;  // difficult
  return 0; // unaffordable
}

// ---------------------------------------------------------------------------
// Landlord tenant-requirement matching (unchanged logic, cleaned up)
// ---------------------------------------------------------------------------

function computePreferencesMatch(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
): number {
  const requirements = property.landlordRequirements;
  let matched = 0;
  let considered = 0;

  if (requirements?.annualIncome) {
    const tenantIncome = tenant?.annualEarnings;
    if (tenantIncome !== undefined) {
      considered += 1;
      if (
        isInRange(
          tenantIncome,
          requirements.annualIncome.min,
          requirements.annualIncome.max
        )
      ) {
        matched += 1;
      }
    }
  }

  if (requirements?.petsAllowed !== undefined && tenant?.hasPets !== undefined) {
    considered += 1;
    if (!tenant.hasPets || requirements.petsAllowed) {
      matched += 1;
    }
  }

  if (
    tenant?.petFriendlyRequired !== undefined &&
    property.petFriendly !== undefined
  ) {
    considered += 1;
    if (!tenant.petFriendlyRequired || property.petFriendly) {
      matched += 1;
    }
  }

  const reqTenantPrefs =
    requirements?.idealTenantPreferences ||
    requirements?.tenantPreferences ||
    {};
  for (const key of tenantPreferenceKeys) {
    const reqValue = reqTenantPrefs[key as string];
    const tenantValue = tenant?.[key];

    if (reqValue === undefined || tenantValue === undefined) {
      continue;
    }

    considered += 1;

    if (typeof tenantValue === "boolean") {
      if (tenantValue === reqValue) {
        matched += 1;
      }
      continue;
    }

    if (
      toLower(String(reqValue)) === "any" ||
      toLower(String(tenantValue)) === "any"
    ) {
      matched += 1;
      continue;
    }

    if (valuesMatch(String(tenantValue), String(reqValue))) {
      matched += 1;
    }
  }

  return computePercentage(matched, considered);
}
