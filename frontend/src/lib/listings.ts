"use client";

export type ListingStat = { icon: string; label: string };

export type Listing = {
  id: string;
  image: string;
  images?: string[];
  price: string;
  period: string;
  stats: ListingStat[];
  address: string;
  highlight: string;
  tag: string;
  alt: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  sqft: string;
  lat: number;
  lng: number;
  description: string;
};

export const listingSeed: Listing[] = [
  {
    id: "listing-1",
    image: "/hero.png",
    images: ["/hero.png", "/p5.png", "/p6.png"],
    price: "$3,500",
    period: "/mo",
    stats: [
      { icon: "bed", label: "3 Beds" },
      { icon: "bathtub", label: "2 Baths" },
      { icon: "square_foot", label: "1,850 sqft" },
    ],
    address: "4528 Evergreen Terrace, Springfield, IL",
    highlight: "Shared Apartment",
    tag: "New Listing",
    alt: "Modern suburban home",
    neighborhood: "Evergreen Terrace",
    bedrooms: 3,
    bathrooms: 2,
    sqft: "1,850",
    lat: 39.7817,
    lng: -89.6501,
    description: "Shared compound with smart home controls and fast fiber.",
  },
  {
    id: "listing-2",
    image: "/p2.png",
    images: ["/p2.png", "/p7.png", "/p8.png"],
    price: "$2,750",
    period: "/mo",
    stats: [
      { icon: "bed", label: "2 Beds" },
      { icon: "bathtub", label: "2 Baths" },
      { icon: "square_foot", label: "1,300 sqft" },
    ],
    address: "21 Johnson Street, Victoria Island, Lagos",
    highlight: "Self Compound",
    tag: "Curated Pick",
    alt: "Contemporary apartment facade",
    neighborhood: "Victoria Island",
    bedrooms: 2,
    bathrooms: 2,
    sqft: "1,300",
    lat: 6.4358,
    lng: 3.4251,
    description: "Short walk to the lagoon with shared rooftop deck and gym.",
  },
  {
    id: "listing-3",
    image: "/p3.png",
    images: ["/p3.png", "/propertydetails.png", "/p6.png"],
    price: "$4,100",
    period: "/mo",
    stats: [
      { icon: "bed", label: "4 Beds" },
      { icon: "bathtub", label: "3 Baths" },
      { icon: "square_foot", label: "2,200 sqft" },
    ],
    address: "8 Palm Drive, Lekki, NG",
    highlight: "Shortlets",
    tag: "Beachside",
    alt: "Luxury villa with pool",
    neighborhood: "Lekki Phase 1",
    bedrooms: 4,
    bathrooms: 3,
    sqft: "2,200",
    lat: 6.4281,
    lng: 3.4287,
    description: "Private pool and shortlet-friendly host experience.",
  },
  {
    id: "listing-4",
    image: "/p4.png",
    images: ["/p4.png", "/p5.png", "/p7.png"],
    price: "$3,100",
    period: "/mo",
    stats: [
      { icon: "bed", label: "3 Beds" },
      { icon: "bathtub", label: "2 Baths" },
      { icon: "square_foot", label: "1,600 sqft" },
    ],
    address: "120 Harmon Road, Abuja",
    highlight: "Self Compound",
    tag: "Newly Renovated",
    alt: "Modern penthouse during golden hour",
    neighborhood: "Gwarinpa",
    bedrooms: 3,
    bathrooms: 2,
    sqft: "1,600",
    lat: 9.0732,
    lng: 7.4911,
    description: "Renovated penthouse with tons of natural light.",
  },
];

export const listingIds = listingSeed.map((listing) => listing.id);
