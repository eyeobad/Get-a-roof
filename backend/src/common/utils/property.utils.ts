import { PropertyType, VehiclePreference } from "../enums";

const propertyTypeMap: Record<string, PropertyType> = {
  apartment: PropertyType.Apartment,
  house: PropertyType.House,
  condo: PropertyType.Condo,
  townhouse: PropertyType.Townhouse,
  duplex: PropertyType.Duplex,
  bungalow: PropertyType.Bungalow,
  penthouse: PropertyType.Penthouse,
  villa: PropertyType.Villa,
  studio: PropertyType.Studio,
  loft: PropertyType.Loft,
  other: PropertyType.Other,
  selfcompound: PropertyType.SelfCompound,
  sharedapartment: PropertyType.SharedApartment,
  sharedcompound: PropertyType.SharedCompound,
  shortlet: PropertyType.Shortlet,
  nonowneroccupied: PropertyType.NonOwnerOccupied,
};

const vehiclePreferenceMap: Record<string, VehiclePreference> = {
  yes: VehiclePreference.Yes,
  no: VehiclePreference.No,
  any: VehiclePreference.Any,
};

export function normalizePropertyType(value: unknown): PropertyType | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value as PropertyType;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const exact = Object.values(PropertyType).find((type) => type === trimmed);
  if (exact) {
    return exact as PropertyType;
  }

  const normalizedKey = trimmed.toLowerCase().replace(/[\s_-]/g, "");
  return propertyTypeMap[normalizedKey];
}

export function normalizeVehiclePreference(
  value: unknown
): VehiclePreference | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value as VehiclePreference;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const exact = Object.values(VehiclePreference).find((pref) => pref === trimmed);
  if (exact) {
    return exact as VehiclePreference;
  }

  const normalizedKey = trimmed.toLowerCase();
  return vehiclePreferenceMap[normalizedKey];
}
