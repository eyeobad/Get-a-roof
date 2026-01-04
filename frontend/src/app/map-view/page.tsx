"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useAppStore } from "@/store/useAppStore";

const fallbackMarkers = [
  { price: "$325k", top: "25%", left: "20%" },
  { price: "$450k", top: "40%", left: "50%", spotlight: true },
  { price: "$550k", top: "60%", right: "15%" },
];

type ListingCard = {
  id: string;
  price: string;
  address: string;
  beds: number;
  baths: number;
  sqft: string;
  tag?: string;
  image: string;
};

type Marker = {
  id?: string;
  index?: number;
  price: string;
  top?: string;
  left?: string;
  right?: string;
  spotlight?: boolean;
};

function PropertyCard({ item }: { item: ListingCard }) {
  return (
    <article className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden group cursor-pointer transform transition active:scale-[0.99]">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={item.image}
          alt={item.address}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-full shadow-sm">
          <span className="material-symbols-outlined text-xl text-gray-400">
            favorite_border
          </span>
        </div>
        <div className="absolute bottom-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
          {item.tag ?? "Listing"}
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-2xl font-bold text-[#0c141d]">{item.price}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.address}</p>
          </div>
          <Link href={`/property-details/${item.id}`} className="text-sm text-primary font-semibold">
            View
          </Link>
        </div>

        <div className="flex items-center space-x-4 mt-4 text-gray-500 text-sm border-t border-gray-100 pt-4">
          <div className="flex items-center space-x-1">
            <span className="material-symbols-outlined text-lg">bed</span>
            <span className="font-semibold text-[#0c141d]">{item.beds}</span>
            <span>bd</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="material-symbols-outlined text-lg">bathtub</span>
            <span className="font-semibold text-[#0c141d]">{item.baths}</span>
            <span>ba</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="material-symbols-outlined text-lg">square_foot</span>
            <span className="font-semibold text-[#0c141d]">{item.sqft}</span>
            <span>sqft</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MapView() {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const mapMatches = useAppStore((state) => state.mapMatches);
  const loadMapMatches = useAppStore((state) => state.loadMapMatches);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    void loadMapMatches();
  }, [loadMapMatches]);

  const listItems = useMemo<ListingCard[]>(() => {
    return mapMatches.map((listing) => ({
      id: listing.id,
      price: listing.price,
      address: listing.address,
      beds: listing.bedrooms,
      baths: listing.bathrooms,
      sqft: listing.sqft,
      tag: listing.tag,
      image: listing.image,
    }));
  }, [mapMatches]);

  const markers = useMemo<Marker[]>(() => {
    if (!mapMatches.length) return fallbackMarkers;
    const coords = mapMatches.filter((listing) => listing.lat || listing.lng);
    if (!coords.length) return fallbackMarkers;

    const lats = coords.map((listing) => listing.lat);
    const lngs = coords.map((listing) => listing.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return coords.map((listing, index) => {
      const latRatio = maxLat === minLat ? 0.5 : (listing.lat - minLat) / (maxLat - minLat);
      const lngRatio = maxLng === minLng ? 0.5 : (listing.lng - minLng) / (maxLng - minLng);
      const top = 15 + (1 - latRatio) * 70;
      const left = 15 + lngRatio * 70;
      return {
        id: listing.id,
        index,
        price: listing.price,
        top: `${top}%`,
        left: `${left}%`,
        spotlight: index === selectedIndex,
      };
    });
  }, [mapMatches, selectedIndex]);

  const activeListing = listItems[selectedIndex] ?? listItems[0];

  useEffect(() => {
    if (selectedIndex >= listItems.length && listItems.length > 0) {
      setSelectedIndex(0);
    }
  }, [listItems, selectedIndex]);

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden min-h-screen bg-background-light text-[#0c141d] font-display antialiased flex flex-col">
        <header className="bg-primary text-white pt-10 pb-4 px-4 shadow-lg shrink-0 rounded-b-lg z-10 w-full">
          <div className="flex items-center justify-between mb-4">
            <button className="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[28px]">
                menu
              </span>
            </button>

            <h1 className="text-xl font-bold tracking-tight">
              Matched Properties
            </h1>

            <button className="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[28px]">
                filter_list
              </span>
            </button>
          </div>

          {/* Controlled toggle */}
          <div className="flex justify-center">
            <div className="bg-white/10 p-1 rounded-full flex w-full max-w-[320px] backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${
                  viewMode === "map"
                    ? "bg-white text-primary shadow-sm"
                    : "text-white/70"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  map
                </span>
                <span className="text-sm font-bold">Map</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-white text-primary shadow-sm"
                    : "text-white/70"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  view_list
                </span>
                <span className="text-sm font-bold">List</span>
              </button>
            </div>
          </div>
        </header>

        {/* MOBILE BODY SWITCHES HERE */}
        {viewMode === "map" ? (
          <main className="relative w-full flex-1 overflow-hidden bg-[#e8e4dc]">
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center opacity-80"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBx5jUzPT3xN-xZuHVHuFz51wLzt8OppvkgbfN99hchEVNGKeneenNZLFGY1-jizRRTCotT9wxqoh2f14ifXj9NulWqBY8M0Nx3GO5DxPmM4mLdrGm4pJffmEStbVmqQcaO7fCRCOCya18-uIkGEqccHYfc4nYPOT5MmAY6XxuliCbD7W0Xj-7o2lm3ngaX68xRGnhzAVBXzIE-0bGCBJhG-VVtlqRdw5Rsvn07TEy5pzsMhT7o-f1BDgN6kZeepBJU8vq2Kz8B1wcU')",
              }}
            />

            <div className="absolute right-4 top-4 flex flex-col gap-3">
              <div className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
                <button className="p-3 hover:bg-gray-100 border-b border-gray-200 text-gray-600">
                  <span className="material-symbols-outlined">add</span>
                </button>
                <button className="p-3 hover:bg-gray-100 text-gray-600">
                  <span className="material-symbols-outlined">remove</span>
                </button>
              </div>

              <button className="bg-white p-3 rounded-full shadow-lg border border-gray-100 text-primary">
                <span className="material-symbols-outlined">near_me</span>
              </button>
            </div>

            {markers.map((marker) => (
              <button
                key={marker.id ?? marker.price}
                type="button"
                onClick={() => {
                  if (typeof (marker as any).index === "number") {
                    setSelectedIndex((marker as any).index);
                  }
                }}
                className={`absolute z-10 ${
                  marker.spotlight ? "animate-bounce-short" : "opacity-90"
                }`}
                style={{
                  top: marker.top,
                  left: marker.left,
                  right: marker.right,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-white text-primary px-3 py-1.5 rounded-full shadow-md border border-gray-200 flex items-center gap-1">
                    <span className="font-bold text-sm whitespace-nowrap">
                      {marker.price}
                    </span>
                  </div>
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white -mt-[1px]" />
                </div>
              </button>
            ))}

            <div className="absolute bottom-4 left-4 right-4 z-20">
              <div className="bg-white rounded-lg shadow-2xl p-4 border border-gray-100 relative">
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-200 relative">
                    {activeListing ? (
                      <Image
                        src={activeListing.image}
                        alt={activeListing.address}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="flex-1 flex flex-col justify-between h-24 py-0.5">
                    <div>
                      <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold text-primary leading-none">
                          {activeListing?.price ?? "$0"}
                        </h2>
                        <button className="text-gray-400 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">
                            favorite
                          </span>
                        </button>
                      </div>

                      <p className="text-gray-600 text-sm mt-1 truncate">
                        {activeListing?.address ?? "No matched properties yet"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-gray-500 mt-1">
                      {[
                        { icon: "bed", value: activeListing?.beds ?? 0 },
                        { icon: "bathtub", value: activeListing?.baths ?? 0 },
                        { icon: "", value: `${activeListing?.sqft ?? "0"} sqft` },
                      ].map((item) => (
                        <div
                          key={item.value}
                          className="flex items-center gap-1 text-sm font-medium"
                        >
                          {item.icon && (
                            <span className="material-symbols-outlined text-[18px]">
                              {item.icon}
                            </span>
                          )}
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {activeListing && (
                  <Link
                    href={`/property-details/${activeListing.id}`}
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span>View Home Details</span>
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-background-light px-4 py-5 space-y-5">
            {listItems.map((item) => (
              <PropertyCard key={item.id} item={item} />
            ))}
            <div className="h-8" />
          </main>
        )}

        <BottomNav />
      </div>

      {/* Desktop (same as what you already have) */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-background-light text-text-light font-display">
        <aside className="w-[450px] h-full bg-surface-light shadow-2xl border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-text-light">
                {listItems.length} Properties Found
              </h2>
              <span className="text-xs font-medium text-text-muted-light bg-gray-100 px-2 py-1 rounded">
                Springfield, IL
              </span>
            </div>
            <div className="text-sm text-text-muted-light">
              Sorted by:{" "}
              <span className="font-medium text-primary cursor-pointer">
                Price (Low to High)
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {listItems.map((item) => (
              <PropertyCard key={item.id} item={item} />
            ))}
            <div className="h-10" />
          </div>
        </aside>

        <section className="relative flex-1 h-full overflow-hidden bg-gray-200">
          <div className="absolute inset-0 z-0">
            <Image src="/p4.png" alt="Map" fill priority className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-green-50/20" />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
                backgroundSize: "100px 100px",
                opacity: 0.12,
              }}
            />
          </div>

          <div className="absolute top-6 right-6 flex flex-col space-y-2 z-10">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
              <button className="p-3 hover:bg-gray-100 border-b border-gray-200">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className="p-3 hover:bg-gray-100">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>

            <button className="bg-white p-3 rounded-full shadow-lg border border-gray-200">
              <span className="material-symbols-outlined text-primary">
                near_me
              </span>
            </button>
          </div>

          {markers.map((marker) => (
            <div
              key={marker.id ?? marker.price}
              className="absolute z-10"
              style={{
                top: marker.top,
                left: marker.left,
                right: marker.right,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className={`${
                  marker.spotlight
                    ? "marker-pulse bg-primary text-white"
                    : "marker-pulse-white bg-white text-gray-800"
                } px-3 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-xl font-bold text-sm border border-gray-200`}
              >
                {marker.price}
              </div>
            </div>
          ))}
        </section>
      </div>

      <style jsx global>{`
        @keyframes bounce-short {
          0%,
          100% {
            transform: translate(-50%, -50%);
          }
          50% {
            transform: translate(-50%, -60%);
          }
        }
        .animate-bounce-short {
          animation: bounce-short 2s infinite ease-in-out;
        }
        .marker-pulse::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translate(-50%, 0);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #0f3c6e;
        }
        .marker-pulse-white::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translate(-50%, 0);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid white;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
        body {
          min-height: 100vh;
        }
      `}</style>
    </>
  );
}
