import { PropertyType, VehiclePreference } from "../enums";
import { normalizePropertyType } from "./property.utils";
import { computePercentage, isInRange, toLower, valuesMatch } from "./match.helpers";

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
};

export type MatchResult = {
  preferencesMatchPercentage: number;
  apartmentPreferenceMatchPercentage: number;
  matchScore: number;
};

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

export function computeMatchScore(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
): MatchResult {
  const apartmentPreferenceMatchPercentage = computeApartmentPreferenceMatch(
    tenant,
    property
  );

  const preferencesMatchPercentage = computePreferencesMatch(tenant, property);
  const matchScore = Math.round(
    preferencesMatchPercentage * 0.6 + apartmentPreferenceMatchPercentage * 0.4
  );

  return {
    preferencesMatchPercentage,
    apartmentPreferenceMatchPercentage,
    matchScore,
  };
}

function computeApartmentPreferenceMatch(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
) {
  const lookingFor = tenant?.lookingFor
    ?.map((value) => normalizePropertyType(value)?.toString() ?? value.toString())
    .filter(Boolean);
  if (!lookingFor || !lookingFor.length) {
    return 100;
  }

  const matches = new Set<string>();
  const normalizedType = normalizePropertyType(property.propertyType);
  if (normalizedType) {
    matches.add(normalizedType.toString());
  }

  if (property.landlordRequirements?.nonOwnerOccupied) {
    matches.add(PropertyType.NonOwnerOccupied);
  }
  if (property.landlordRequirements?.sharedApartment) {
    matches.add(PropertyType.SharedApartment);
  }
  if (property.landlordRequirements?.shortlet) {
    matches.add(PropertyType.Shortlet);
  }
  if (property.landlordRequirements?.selfCompound) {
    matches.add(PropertyType.SelfCompound);
  }
  if (property.landlordRequirements?.sharedCompound) {
    matches.add(PropertyType.SharedCompound);
  }

  return lookingFor.some((type) => matches.has(type)) ? 100 : 0;
}

function computePreferencesMatch(
  tenant: TenantPreferences | undefined,
  property: PropertyMatchInput
) {
  const requirements = property.landlordRequirements;
  let matched = 0;
  let considered = 0;

  if (requirements?.annualIncome) {
    const tenantIncome = tenant?.annualEarnings;
    if (tenantIncome !== undefined) {
      considered += 1;
      if (isInRange(tenantIncome, requirements.annualIncome.min, requirements.annualIncome.max)) {
        matched += 1;
      }
    }
  }

  if (tenant?.annualEarnings !== undefined && property.monthlyPrice !== undefined) {
    considered += 1;
    const monthlyAffordable = tenant.annualEarnings / 12 / 3;
    if (property.monthlyPrice <= monthlyAffordable) {
      matched += 1;
    }
  }

  if (requirements?.petsAllowed !== undefined && tenant?.hasPets !== undefined) {
    considered += 1;
    if (!tenant.hasPets || requirements.petsAllowed) {
      matched += 1;
    }
  }

  if (tenant?.petFriendlyRequired !== undefined && property.petFriendly !== undefined) {
    considered += 1;
    if (!tenant.petFriendlyRequired || property.petFriendly) {
      matched += 1;
    }
  }

  const reqTenantPrefs =
    requirements?.idealTenantPreferences || requirements?.tenantPreferences || {};
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
