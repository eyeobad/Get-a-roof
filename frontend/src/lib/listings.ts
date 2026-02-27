"use client";

export type ListingStat = { icon: string; label: string };

export type Listing = {
  id: string;
  image: string;
  images?: string[];
  amenities?: string[];
  price: string;
  period: string;
  stats: ListingStat[];
  address: string;
  highlight: string;
  listingIntent?: "Rent" | "Shortlet";
  tag: string;
  alt: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  sqft: string;
  lat: number;
  lng: number;
  description: string;
  matchScore?: number;
  preferencesMatchPercentage?: number;
  apartmentPreferenceMatchPercentage?: number;
  routeAccessStatus?: "None" | "Pending" | "Approved" | "Denied";
  routeOriginLat?: number;
  routeOriginLng?: number;
  routeAccessExpiresAt?: string;
};

export const listingSeed: Listing[] = [];

export const listingIds = listingSeed.map((listing) => listing.id);
