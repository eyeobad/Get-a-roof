"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import L from "leaflet";
import BottomNav from "@/components/BottomNav";
import { useAppStore } from "@/store/useAppStore";

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

type MapPoint = {
  id: string;
  index: number;
  price: string;
  lat: number;
  lng: number;
};

function EmptyState({
  title,
  message,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 p-6">
      <span className="material-symbols-outlined text-4xl text-slate-300">
        map
      </span>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 max-w-xs">{message}</p>
      <Link
        href={ctaHref}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

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

function MapCanvas({
  points,
  activeIndex,
  onSelect,
  onMapReady,
}: {
  points: MapPoint[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onMapReady: (map: L.Map) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;
    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
    }).setView([6.4358, 3.4251], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    onMapReady(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!points.length) return;

    points.forEach((point) => {
      const html = `<div class="map-price-marker ${
        point.index === activeIndex ? "is-active" : ""
      }"><span>${point.price}</span></div>`;
      const icon = L.divIcon({
        html,
        className: "map-price-marker-wrapper",
      });
      const marker = L.marker([point.lat, point.lng], { icon });
      marker.on("click", () => onSelect(point.index));
      marker.addTo(layer);
    });
  }, [points, activeIndex, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points.length) return;
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points]);

  return <div ref={mapElementRef} className="absolute inset-0" />;
}

export default function MapView() {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const mapMatches = useAppStore((state) => state.mapMatches);
  const loadMapMatches = useAppStore((state) => state.loadMapMatches);
  const authToken = useAppStore((state) => state.authToken);
  const listingsById = useAppStore((state) => state.listingsById);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (authToken) {
      void loadMapMatches();
    }
  }, [authToken, loadMapMatches]);

  const demoListings = useMemo(() => Object.values(listingsById), [listingsById]);
  const sourceListings = authToken ? mapMatches : demoListings;
  const showEmptyState = authToken && mapMatches.length === 0;

  const listItems = useMemo<ListingCard[]>(() => {
    return sourceListings.map((listing) => ({
      id: listing.id,
      price: listing.price,
      address: listing.address,
      beds: listing.bedrooms,
      baths: listing.bathrooms,
      sqft: listing.sqft,
      tag: listing.tag,
      image: listing.image,
    }));
  }, [sourceListings]);

  const mapPoints = useMemo<MapPoint[]>(() => {
    return sourceListings
      .map((listing, index) => ({
        id: listing.id,
        index,
        price: listing.price,
        lat: listing.lat,
        lng: listing.lng,
      }))
      .filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
      );
  }, [sourceListings]);

  const activeIndex =
    listItems.length > 0
      ? Math.min(selectedIndex, listItems.length - 1)
      : 0;
  const activeListing = listItems[activeIndex] ?? listItems[0];

  const mobileMapRef = useRef<L.Map | null>(null);
  const desktopMapRef = useRef<L.Map | null>(null);

  const handleMobileMapReady = useCallback((map: L.Map) => {
    mobileMapRef.current = map;
  }, []);

  const handleDesktopMapReady = useCallback((map: L.Map) => {
    desktopMapRef.current = map;
  }, []);

  const handleZoomIn = (mapRef: { current: L.Map | null }) => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = (mapRef: { current: L.Map | null }) => {
    mapRef.current?.zoomOut();
  };

  const handleLocate = (mapRef: { current: L.Map | null }) => {
    const target = mapPoints.find((point) => point.index === activeIndex);
    if (!target || !mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.flyTo([target.lat, target.lng], Math.max(currentZoom, 14), {
      duration: 0.6,
    });
  };

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
            <MapCanvas
              points={mapPoints}
              activeIndex={activeIndex}
              onSelect={setSelectedIndex}
              onMapReady={handleMobileMapReady}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/10 via-transparent to-white/40" />

            <div className="absolute right-4 top-4 flex flex-col gap-3">
              <div className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
                <button
                  type="button"
                  onClick={() => handleZoomIn(mobileMapRef)}
                  className="p-3 hover:bg-gray-100 border-b border-gray-200 text-gray-600"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleZoomOut(mobileMapRef)}
                  className="p-3 hover:bg-gray-100 text-gray-600"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleLocate(mobileMapRef)}
                className="bg-white p-3 rounded-full shadow-lg border border-gray-100 text-primary"
              >
                <span className="material-symbols-outlined">near_me</span>
              </button>
            </div>

            {showEmptyState && (
              <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
                <div className="w-full max-w-sm rounded-2xl bg-white/95 shadow-xl border border-slate-200">
                  <EmptyState
                    title="No matches yet"
                    message="Like a few listings in Explore to see your matches on the map."
                    ctaLabel="Browse listings"
                    ctaHref="/explore"
                  />
                </div>
              </div>
            )}

            {listItems.length > 0 && (
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
            )}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-background-light px-4 py-5 space-y-5">
            {showEmptyState ? (
              <EmptyState
                title="No matches yet"
                message="Like a few listings in Explore to see them here."
                ctaLabel="Go to Explore"
                ctaHref="/explore"
              />
            ) : (
              listItems.map((item) => <PropertyCard key={item.id} item={item} />)
            )}
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
            {showEmptyState ? (
              <EmptyState
                title="No matches yet"
                message="Like a few listings in Explore to see your matches here."
                ctaLabel="Browse listings"
                ctaHref="/explore"
              />
            ) : (
              listItems.map((item) => <PropertyCard key={item.id} item={item} />)
            )}
            {!showEmptyState && <div className="h-10" />}
          </div>
        </aside>

        <section className="relative flex-1 h-full overflow-hidden bg-gray-200">
          <MapCanvas
            points={mapPoints}
            activeIndex={activeIndex}
            onSelect={setSelectedIndex}
            onMapReady={handleDesktopMapReady}
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-blue-50/20 to-slate-100/30" />

          <div className="absolute top-6 right-6 flex flex-col space-y-2 z-10">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => handleZoomIn(desktopMapRef)}
                className="p-3 hover:bg-gray-100 border-b border-gray-200 text-gray-600"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
              <button
                type="button"
                onClick={() => handleZoomOut(desktopMapRef)}
                className="p-3 hover:bg-gray-100 text-gray-600"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleLocate(desktopMapRef)}
              className="bg-white p-3 rounded-full shadow-lg border border-gray-200"
            >
              <span className="material-symbols-outlined text-primary">
                near_me
              </span>
            </button>
          </div>

          {showEmptyState && (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
              <div className="w-full max-w-sm rounded-2xl bg-white/95 shadow-xl border border-slate-200">
                <EmptyState
                  title="No matches yet"
                  message="Like a few listings in Explore to see your matches on the map."
                  ctaLabel="Browse listings"
                  ctaHref="/explore"
                />
              </div>
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        .leaflet-container {
          font-family: var(--font-sans);
          background: #e2e8f0;
        }
        .map-price-marker-wrapper {
          background: transparent;
          border: none;
          width: auto;
          height: auto;
          overflow: visible;
        }
        .map-price-marker {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 999px;
          background: #ffffff;
          color: #0c141d;
          font-weight: 700;
          font-size: 12px;
          box-shadow: 0 12px 30px rgba(12, 20, 29, 0.2);
          border: 1px solid rgba(15, 23, 42, 0.12);
          transform: translate(-50%, -100%);
          transition: transform 0.2s ease, background 0.2s ease,
            color 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
        }
        .map-price-marker::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translate(-50%, 0);
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 8px solid #ffffff;
        }
        .map-price-marker.is-active {
          background: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 14px 32px rgba(10, 68, 184, 0.35);
          transform: translate(-50%, -110%) scale(1.05);
        }
        .map-price-marker.is-active::after {
          border-top-color: var(--color-primary);
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
