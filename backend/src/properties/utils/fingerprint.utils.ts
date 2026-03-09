import { createHash } from "crypto";

type FingerprintAddress = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
};

type FingerprintInput = {
  address?: FingerprintAddress;
  propertyType?: string;
  listingIntent?: string;
  bedCount?: number;
  bathCount?: number;
  monthlyPrice?: number;
};

const normalizeText = (value?: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
};

const normalizeCoordinate = (value?: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toFixed(4);
};

const normalizeNumber = (value?: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return String(Math.round(value));
};

const toPriceBucket = (price?: unknown) => {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return "";
  const bucketSize = 25000;
  const bucket = Math.floor(price / bucketSize) * bucketSize;
  return String(bucket);
};

export const computePropertyFingerprint = (input: FingerprintInput) => {
  const street = normalizeText(input.address?.street);
  const city = normalizeText(input.address?.city);
  const state = normalizeText(input.address?.state);
  const zip = normalizeText(input.address?.zip);
  const lat = normalizeCoordinate(input.address?.lat);
  const lng = normalizeCoordinate(input.address?.lng);
  const propertyType = normalizeText(input.propertyType);
  const listingIntent = normalizeText(input.listingIntent);
  const bedCount = normalizeNumber(input.bedCount);
  const bathCount = normalizeNumber(input.bathCount);
  const priceBucket = toPriceBucket(input.monthlyPrice);

  const hasAddressSignal = Boolean(street || city || state || zip || lat || lng);
  if (!hasAddressSignal) return "";

  const canonical = [
    `street:${street}`,
    `city:${city}`,
    `state:${state}`,
    `zip:${zip}`,
    `lat:${lat}`,
    `lng:${lng}`,
    `type:${propertyType}`,
    `intent:${listingIntent}`,
    `beds:${bedCount}`,
    `baths:${bathCount}`,
    `priceBucket:${priceBucket}`,
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex");
};
