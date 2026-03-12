"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import BottomNav from "@/components/BottomNav";
import { useAppStore } from "@/store/useAppStore";
import { useToastError } from "@/hooks/useToastError";

type ListingCard = {
  id: string;
  price: string;
  address: string;
  displayAddress: string;
  beds: number;
  baths: number;
  sqft: string;
  tag?: string;
  image: string;
  isExact: boolean;
  isSaved?: boolean;
};

type MapPoint = {
  id: string;
  index: number;
  lat: number;
  lng: number;
  displayLat: number;
  displayLng: number;
  isExact: boolean;
};

const APPROX_RADIUS_METERS = 280;

const createGeoCirclePolygon = (
  lng: number,
  lat: number,
  radiusMeters: number,
  steps = 48
): GeoJSON.Feature<GeoJSON.Polygon> => {
  const coordinates: number[][] = [];
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = Math.max(1, 111_320 * Math.cos(latRad));

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = Math.cos(angle) * radiusMeters;
    const dy = Math.sin(angle) * radiusMeters;
    const pointLng = lng + dx / metersPerDegLng;
    const pointLat = lat + dy / metersPerDegLat;
    coordinates.push([pointLng, pointLat]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {},
  };
};

const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "").trim();
const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/streets-v11";

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const jitterPoint = (lat: number, lng: number, seed: string) => {
  const hash = hashString(seed);
  const angle = (hash % 360) * (Math.PI / 180);
  const distance = 0.002 + ((hash % 100) / 100) * 0.0015;
  return {
    lat: lat + Math.sin(angle) * distance,
    lng: lng + Math.cos(angle) * distance,
  };
};

const extractCityState = (address: string) => {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }
  return parts[0] ?? "";
};

const buildDisplayAddress = (address: string, neighborhood?: string) => {
  const cityState = extractCityState(address);
  if (cityState) return cityState;
  if (neighborhood) return `Area near ${neighborhood}`;
  return "Area in this neighborhood";
};

const randomizedSimilaritySort = <
  T extends {
    id?: string;
    matchScore?: number;
    preferencesMatchPercentage?: number;
    apartmentPreferenceMatchPercentage?: number;
  }
>(
  items: T[],
  target: T
) => {
  const targetScore =
    target.matchScore ??
    target.preferencesMatchPercentage ??
    target.apartmentPreferenceMatchPercentage ??
    0;

  return [...items]
    .map((item, index) => {
      const score =
        item.matchScore ??
        item.preferencesMatchPercentage ??
        item.apartmentPreferenceMatchPercentage ??
        0;
      const diff = Math.abs(score - targetScore);
      const stableId = item.id ?? `idx-${index}`;
      return {
        item,
        bucket: Math.floor(diff / 5),
        tieBreaker: hashString(`${stableId}:${score}`),
      };
    })
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket - b.bucket;
      return a.tieBreaker - b.tieBreaker;
    })
    .map((entry) => entry.item);
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

function LoadingState({ label = "Loading properties..." }: { label?: string }) {
  return (
    <div className="w-full p-4">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-xl">
        <div className="animate-pulse">
          <div className="relative h-48 w-full overflow-hidden bg-slate-200">
            <div className="absolute left-4 top-4 h-8 w-24 rounded-full bg-white/70" />
            <div className="absolute right-4 top-4 flex flex-col gap-2">
              <div className="h-10 w-10 rounded-full bg-white/70" />
              <div className="h-10 w-10 rounded-full bg-white/60" />
            </div>
            <div className="absolute bottom-4 left-4 h-24 w-24 rounded-full bg-[#0a44b8]/10 blur-xl" />
          </div>
          <div className="space-y-4 p-4">
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-6 w-32 rounded-full bg-slate-200" />
                <div className="h-4 w-40 rounded-full bg-slate-100" />
                <div className="flex gap-2 pt-1">
                  <div className="h-6 w-14 rounded-full bg-slate-100" />
                  <div className="h-6 w-14 rounded-full bg-slate-100" />
                  <div className="h-6 w-16 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 rounded-full bg-slate-200" />
              <div className="h-11 rounded-full bg-slate-100" />
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-slate-400">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <span>{label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapSkeleton({ isMobile }: { isMobile?: boolean }) {
  const fakeMarkers = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      top: `${20 + (hashString(`map-skeleton-top-${i}`) % 50)}%`,
      left: `${15 + (hashString(`map-skeleton-left-${i}`) % 70)}%`,
      delay: `${(hashString(`map-skeleton-delay-${i}`) % 150) / 100}s`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-20 h-full w-full bg-[#E8EAED] overflow-hidden flex flex-col justify-between pointer-events-none">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#0a44b8]/[0.02] animate-pulse" />
        
        {fakeMarkers.map((marker) => (
          <div
            key={marker.id}
            className="absolute z-10 size-[18px] rounded-full bg-[#0a44b8]/30 border-[3px] border-white shadow-md animate-pulse"
            style={{ 
              top: marker.top, 
              left: marker.left,
              animationDelay: marker.delay 
            }}
          />
        ))}

        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm flex items-center gap-2 border border-black/5">
          <div className="size-2 rounded-full bg-[#0a44b8] animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-[#1A1A1A]/70 uppercase">Loading Map...</span>
        </div>
      </div>

      <div className="flex-1" />

      {isMobile && (
        <div className="absolute bottom-4 left-3 z-20 w-[78%] max-w-[340px]">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-sm">
            <div className="space-y-2">
              <div className="flex gap-3 items-start">
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[#F5F5F5] animate-pulse" />
                <div className="flex-1 flex flex-col justify-between h-16 py-0.5 min-w-0">
                  <div>
                    <div className="h-4 w-20 bg-[#F5F5F5] rounded animate-pulse" />
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-3 w-8 bg-[#F5F5F5] rounded animate-pulse" />
                      <div className="h-3 w-8 bg-[#F5F5F5] rounded animate-pulse" />
                      <div className="h-3 w-10 bg-[#F5F5F5] rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-8 bg-[#F5F5F5] rounded-full animate-pulse" />
                <div className="flex-1 h-8 bg-[#F5F5F5] rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyCard({
  item,
  onToggleSave,
}: {
  item: ListingCard;
  onToggleSave?: (id: string) => void;
}) {
  return (
    <article className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden group cursor-pointer transform transition active:scale-[0.99]">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={item.image}
          alt={item.displayAddress}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSave?.(item.id);
          }}
          className="absolute top-3 right-3 h-9 w-9 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-white/50 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 z-10"
          aria-label={item.isSaved ? "Remove saved listing" : "Save listing"}
        >
          <span className={`material-symbols-outlined text-[20px] transition-colors duration-200 ${item.isSaved ? "text-red-500 fill-current" : "text-gray-600"}`}>
            {item.isSaved ? "favorite" : "favorite"}
          </span>
        </button>
        <div className="absolute bottom-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
          {item.tag ?? "Listing"}
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-2xl font-bold text-[#0c141d]">{item.price}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.displayAddress}</p>
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
  focusPointId,
  onSelect,
  onMapReady,
  routeGeojson,
  onMapError,
  onMapStatus,
}: {
  points: MapPoint[];
  activeIndex: number;
  focusPointId?: string;
  onSelect: (index: number) => void;
  onMapReady: (map: mapboxgl.Map) => void;
  routeGeojson: GeoJSON.Feature<GeoJSON.LineString> | null;
  onMapError: (message: string) => void;
  onMapStatus: (status: {
    supported: boolean;
    loaded: boolean;
    styleLoaded: boolean;
    tilesLoaded: boolean;
    layerCount: number;
    sourceCount: number;
    zoom: number | null;
    center: { lat: number; lng: number } | null;
  }) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapLoadedRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;
    const supported = mapboxgl.supported();
    onMapStatus({
      supported,
      loaded: false,
      styleLoaded: false,
      tilesLoaded: false,
      layerCount: 0,
      sourceCount: 0,
      zoom: null,
      center: null,
    });
    if (!supported) {
      onMapError("Mapbox is not supported in this browser.");
      return;
    }
    if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith("pk.")) {
      onMapError(
        "Mapbox token is missing or invalid. Set NEXT_PUBLIC_MAPBOX_TOKEN and redeploy."
      );
      return;
    }

    const map = new mapboxgl.Map({
      container: mapElementRef.current,
      style: MAPBOX_STYLE_URL,
      center: [3.4251, 6.4358],
      zoom: 12,
      attributionControl: false,
      interactive: true,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapRef.current = map;

    const loadTimeout = window.setTimeout(() => {
      if (!mapLoadedRef.current) {
        onMapError(
          "Map style failed to load. Check Mapbox token restrictions for this domain."
        );
      }
    }, 5000);

    map.on("error", (event) => {
      const message =
        typeof event.error?.message === "string"
          ? event.error.message
          : "Map error (check Network for 401/403 tile requests).";
      const normalized = message.toLowerCase();
      if (
        normalized.includes("403") ||
        normalized.includes("401") ||
        normalized.includes("forbidden") ||
        normalized.includes("unauthorized")
      ) {
        onMapError(
          "Mapbox denied this token on this domain. Update token URL restrictions and enable Styles:Read + Tilesets:Read."
        );
        return;
      }
      onMapError(message);
    });

    map.on("load", () => {
      mapLoadedRef.current = true;
      window.clearTimeout(loadTimeout);
      if (!map.getSource("approx-areas")) {
        map.addSource("approx-areas", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "approx-area-fill",
          type: "fill",
          source: "approx-areas",
          paint: {
            "fill-color": "#0a44b8",
            "fill-opacity": 0.14,
          },
        });
        map.addLayer({
          id: "approx-area-outline",
          type: "line",
          source: "approx-areas",
          paint: {
            "line-color": "#0a44b8",
            "line-width": 2,
            "line-opacity": 0.45,
          },
        });
      }
      if (!map.getSource("route")) {
        map.addSource("route", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#0a44b8",
            "line-width": 5,
            "line-opacity": 0.85,
          },
        });
      }
      map.resize();
      if (mapElementRef.current && !resizeObserverRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserverRef.current.observe(mapElementRef.current);
      }
      const styleLoaded = map.isStyleLoaded();
      let layerCount = 0;
      let sourceCount = 0;
      if (styleLoaded) {
        try {
          const style = map.getStyle();
          layerCount = style.layers?.length ?? 0;
          sourceCount = Object.keys(style.sources ?? {}).length;
        } catch {
          // Mapbox can briefly throw "Style is not done loading" during transitions.
        }
      }
      onMapStatus({
        supported: true,
        loaded: map.loaded(),
        styleLoaded,
        tilesLoaded: map.areTilesLoaded(),
        layerCount,
        sourceCount,
        zoom: map.getZoom(),
        center: { lat: map.getCenter().lat, lng: map.getCenter().lng },
      });
      onMapReady(map);
    });

    return () => {
      window.clearTimeout(loadTimeout);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [onMapReady, onMapError, onMapStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateStatus = () => {
      const styleLoaded = map.isStyleLoaded();
      let layerCount = 0;
      let sourceCount = 0;
      if (styleLoaded) {
        try {
          const style = map.getStyle();
          layerCount = style.layers?.length ?? 0;
          sourceCount = Object.keys(style.sources ?? {}).length;
        } catch {
          // Ignore transient style-loading race during render ticks.
        }
      }
      onMapStatus({
        supported: true,
        loaded: map.loaded(),
        styleLoaded,
        tilesLoaded: map.areTilesLoaded(),
        layerCount,
        sourceCount,
        zoom: map.getZoom(),
        center: { lat: map.getCenter().lat, lng: map.getCenter().lng },
      });
    };
    map.on("render", updateStatus);
    map.on("error", updateStatus);
    map.on("idle", updateStatus);
    return () => {
      map.off("render", updateStatus);
      map.off("error", updateStatus);
      map.off("idle", updateStatus);
    };
  }, [onMapStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderMapPoints = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      points.forEach((point) => {
        if (!point.isExact) return;
        const markerEl = document.createElement("div");
        markerEl.className = "map-price-marker map-dot-marker";
        markerEl.textContent = "";
        markerEl.setAttribute("aria-label", "Property marker");
        markerEl.style.width = "18px";
        markerEl.style.height = "18px";
        markerEl.style.borderRadius = "999px";
        markerEl.style.background = "#0a44b8";
        markerEl.style.border = "3px solid #fff";
        markerEl.style.boxShadow = point.index === activeIndex
          ? "0 12px 28px rgba(10,68,184,0.45)"
          : "0 8px 18px rgba(10,68,184,0.35)";
        markerEl.style.transform = point.index === activeIndex
          ? "translate(-50%, -50%) scale(1.15)"
          : "translate(-50%, -50%)";
        markerEl.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
        markerEl.addEventListener("click", () => onSelect(point.index));
        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([point.displayLng, point.displayLat])
          .addTo(map);
        markersRef.current.push(marker);
      });

      const approxFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = points
        .filter((point) => !point.isExact)
        .map((point) =>
          createGeoCirclePolygon(point.lng, point.lat, APPROX_RADIUS_METERS)
        );

      const areaSource = map.getSource("approx-areas") as mapboxgl.GeoJSONSource | undefined;
      if (areaSource) {
        areaSource.setData({
          type: "FeatureCollection",
          features: approxFeatures,
        });
      }
    };

    renderMapPoints();
    map.on("load", renderMapPoints);
    return () => {
      map.off("load", renderMapPoints);
    };
  }, [points, activeIndex, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const routeSource = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (!routeSource) return;
    if (!routeGeojson) {
      routeSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    routeSource.setData(routeGeojson);
    const coords = routeGeojson.geometry.coordinates;
    if (coords.length) {
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((coord) => {
        bounds.extend([coord[0], coord[1]]);
      });
      map.fitBounds(bounds, { padding: 80, duration: 600 });
    }
  }, [routeGeojson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points.length) return;
    if (routeGeojson) return;

    if (focusPointId) {
      const anchor = points.find((point) => point.id === focusPointId);
      if (anchor) {
        if (anchor.isExact) {
          map.flyTo({
            center: [anchor.displayLng, anchor.displayLat],
            zoom: Math.max(map.getZoom(), 14),
            duration: 0,
          });
          return;
        }

        const latRad = (anchor.lat * Math.PI) / 180;
        const metersPerDegLat = 111_320;
        const metersPerDegLng = Math.max(1, 111_320 * Math.cos(latRad));
        const latOffset = APPROX_RADIUS_METERS / metersPerDegLat;
        const lngOffset = APPROX_RADIUS_METERS / metersPerDegLng;
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([anchor.lng - lngOffset, anchor.lat - latOffset]);
        bounds.extend([anchor.lng + lngOffset, anchor.lat + latOffset]);
        map.fitBounds(bounds, { padding: 60, duration: 0 });
        return;
      }
    }

    const bounds = new mapboxgl.LngLatBounds();
    points.forEach((point) => {
      if (point.isExact) {
        bounds.extend([point.displayLng, point.displayLat]);
        return;
      }

      // Include the full hidden-area radius so the whole circle is visible on first fit.
      const latRad = (point.lat * Math.PI) / 180;
      const metersPerDegLat = 111_320;
      const metersPerDegLng = Math.max(1, 111_320 * Math.cos(latRad));
      const latOffset = APPROX_RADIUS_METERS / metersPerDegLat;
      const lngOffset = APPROX_RADIUS_METERS / metersPerDegLng;

      bounds.extend([point.lng - lngOffset, point.lat - latOffset]);
      bounds.extend([point.lng + lngOffset, point.lat + latOffset]);
    });
    map.fitBounds(bounds, { padding: 60, duration: 0 });
  }, [points, routeGeojson, focusPointId]);

  return (
    <div
      ref={mapElementRef}
      className="h-full w-full pointer-events-auto"
      style={{ pointerEvents: "auto", touchAction: "none" }}
    />
  );
}

function MapViewContent() {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const searchParams = useSearchParams();
  const requestedPropertyId = searchParams?.get("propertyId") ?? "";
  const mapMatches = useAppStore((state) => state.mapMatches);
  const listingsById = useAppStore((state) => state.listingsById);
  const loadMapMatches = useAppStore((state) => state.loadMapMatches);
  const loadExploreListings = useAppStore((state) => state.loadExploreListings);
  const fetchPropertyById = useAppStore((state) => state.fetchPropertyById);
  const captureUserLocation = useAppStore((state) => state.captureUserLocation);
  const userLocation = useAppStore((state) => state.userLocation);
  const likedIds = useAppStore((state) => state.likedIds);
  const toggleLikeListing = useAppStore((state) => state.toggleLikeListing);
  const ensureThreadForListing = useAppStore(
    (state) => state.ensureThreadForListing
  );
  const authToken = useAppStore((state) => state.authToken);
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [routeGeojson, setRouteGeojson] =
    useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [routingProfile, setRoutingProfile] = useState<"driving" | "walking" | "cycling">("driving");
  const [routingError, setRoutingError] = useState<string | null>(null);
  useToastError(routingError);
  const [isRouting, setIsRouting] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  useToastError(mapError);
  const [isBootstrappingPropertyView, setIsBootstrappingPropertyView] =
    useState(false);

  useEffect(() => {
    if (authToken) {
      void captureUserLocation();
      void loadMapMatches();
    }
  }, [authToken, loadMapMatches, captureUserLocation]);

  useEffect(() => {
    if (!authToken || !requestedPropertyId) {
      setIsBootstrappingPropertyView(false);
      return;
    }
    let cancelled = false;
    setIsBootstrappingPropertyView(true);
    (async () => {
      await Promise.allSettled([
        fetchPropertyById(requestedPropertyId, { force: true }),
        loadMapMatches(),
        // Pull a broader pool so "similar properties" is not limited to current matched subset.
        loadExploreListings({ distance: 200 }),
      ]);
      if (!cancelled) {
        setIsBootstrappingPropertyView(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    authToken,
    requestedPropertyId,
    fetchPropertyById,
    loadMapMatches,
    loadExploreListings,
  ]);

  useEffect(() => {
    if (!authToken || !requestedPropertyId) return;
    const refresh = () => {
      void loadMapMatches();
      void fetchPropertyById(requestedPropertyId, { force: true });
    };
    const timer = window.setInterval(refresh, 15000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [authToken, requestedPropertyId, loadMapMatches, fetchPropertyById]);

  const sourceListings = useMemo(() => {
    const cachedListings = Object.values(listingsById);
    const requestedAnchor =
      (requestedPropertyId ? listingsById[requestedPropertyId] : undefined) ??
      mapMatches.find((listing) => listing.id === requestedPropertyId) ??
      cachedListings.find((listing) => listing.id === requestedPropertyId);

    if (!requestedAnchor) {
      return mapMatches;
    }

    const mapPool = mapMatches.filter((listing) => listing.id !== requestedAnchor.id);
    const cachedPool = cachedListings.filter(
      (listing) =>
        listing.id !== requestedAnchor.id &&
        Number.isFinite(listing.lat) &&
        Number.isFinite(listing.lng)
    );

    const merged = new Map<string, (typeof cachedPool)[number]>();
    mapPool.forEach((listing) => merged.set(listing.id, listing));
    cachedPool.forEach((listing) => {
      if (!merged.has(listing.id)) {
        merged.set(listing.id, listing);
      }
    });

    const others = Array.from(merged.values());
    if (!others.length) return [requestedAnchor];
    const sorted = randomizedSimilaritySort(others, requestedAnchor).slice(0, 24);
    return [requestedAnchor, ...sorted];
  }, [mapMatches, listingsById, requestedPropertyId]);
  const requestedAnchor =
    (requestedPropertyId ? listingsById[requestedPropertyId] : undefined) ??
    mapMatches.find((listing) => listing.id === requestedPropertyId);
  const waitingForRequestedProperty = Boolean(
    requestedPropertyId && authToken && !requestedAnchor && !mapError
  );
  const showLoadingState =
    waitingForRequestedProperty ||
    isBootstrappingPropertyView ||
    Boolean(requestedPropertyId && sourceListings.length === 0 && !mapError);
  const showEmptyState = !showLoadingState && sourceListings.length === 0;

  const mapSourceListings = useMemo(() => {
    if (!requestedPropertyId) return sourceListings;
    const anchor = sourceListings.find((listing) => listing.id === requestedPropertyId);
    return anchor ? [anchor] : sourceListings;
  }, [requestedPropertyId, sourceListings]);

  const listItems = useMemo<ListingCard[]>(() => {
    return sourceListings.map((listing) => {
      const isExact =
        !authToken ||
        listing.routeAccessStatus === "Approved";
      return {
        id: listing.id,
        price: listing.price,
        address: listing.address,
        displayAddress: buildDisplayAddress(listing.address, listing.neighborhood),
        beds: listing.bedrooms,
        baths: listing.bathrooms,
        sqft: listing.sqft,
        tag: listing.tag,
        image: listing.image,
        isExact,
        isSaved: likedIds.includes(listing.id),
      };
    });
  }, [sourceListings, authToken, likedIds]);

  const mapPoints = useMemo<MapPoint[]>(() => {
    return mapSourceListings
      .map((listing, index) => {
        const isExact =
          !authToken ||
          listing.routeAccessStatus === "Approved";
        const lat = listing.lat;
        const lng = listing.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }
        const display = isExact
          ? jitterPoint(lat, lng, `${listing.id}-exact`)
          : { lat, lng };
        return {
          id: listing.id,
          index,
          lat,
          lng,
          displayLat: display.lat,
          displayLng: display.lng,
          isExact,
        };
      })
      .filter((point): point is MapPoint => Boolean(point));
  }, [mapSourceListings, authToken]);
  const hasApproxArea = useMemo(
    () => mapPoints.some((point) => !point.isExact),
    [mapPoints]
  );

  const activeIndex =
    listItems.length > 0
      ? Math.min(selectedIndex, listItems.length - 1)
      : 0;
  const activeListing = listItems[activeIndex] ?? listItems[0];
  const activeMapIndex =
    (activeListing
      ? mapPoints.find((point) => point.id === activeListing.id)?.index
      : undefined) ?? 0;

  const mobileMapRef = useRef<mapboxgl.Map | null>(null);
  const desktopMapRef = useRef<mapboxgl.Map | null>(null);

  const handleMobileMapReady = useCallback((map: mapboxgl.Map) => {
    mobileMapRef.current = map;
    setMapError(null);
  }, []);

  const handleDesktopMapReady = useCallback((map: mapboxgl.Map) => {
    desktopMapRef.current = map;
    setMapError(null);
  }, []);

  const handleMapStatus = useCallback(() => { }, []);

  const handleZoomIn = (mapRef: { current: mapboxgl.Map | null }) => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = (mapRef: { current: mapboxgl.Map | null }) => {
    mapRef.current?.zoomOut();
  };

  const handleLocate = (mapRef: { current: mapboxgl.Map | null }) => {
    const target = activeListing
      ? mapPoints.find((point) => point.id === activeListing.id)
      : mapPoints[0];
    if (!target || !mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.flyTo({
      center: [target.displayLng, target.displayLat],
      zoom: Math.max(currentZoom, 14),
      duration: 600,
    });
  };

  useEffect(() => {
    if (!requestedPropertyId || routeGeojson) return;
    const anchor = mapPoints.find((point) => point.id === requestedPropertyId);
    if (!anchor) return;
    setSelectedIndex(anchor.index);

    const focusMap = (map: mapboxgl.Map | null) => {
      if (!map) return;
      if (anchor.isExact) {
        map.flyTo({
          center: [anchor.displayLng, anchor.displayLat],
          zoom: Math.max(map.getZoom(), 14),
          duration: 0,
        });
        return;
      }
      const latRad = (anchor.lat * Math.PI) / 180;
      const metersPerDegLat = 111_320;
      const metersPerDegLng = Math.max(1, 111_320 * Math.cos(latRad));
      const latOffset = APPROX_RADIUS_METERS / metersPerDegLat;
      const lngOffset = APPROX_RADIUS_METERS / metersPerDegLng;
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([anchor.lng - lngOffset, anchor.lat - latOffset]);
      bounds.extend([anchor.lng + lngOffset, anchor.lat + latOffset]);
      map.fitBounds(bounds, { padding: 60, duration: 0 });
    };

    focusMap(mobileMapRef.current);
    focusMap(desktopMapRef.current);
  }, [requestedPropertyId, mapPoints, routeGeojson]);

  useEffect(() => {
    const safeResize = (map: mapboxgl.Map | null) => {
      if (!map) return;
      try {
        const container = map.getContainer?.();
        const canvas = map.getCanvas?.();
        if (!container || !canvas || !container.isConnected) return;
        map.resize();
      } catch {
        // Map may have been removed between renders/timeouts.
      }
    };

    const resizeMaps = () => {
      safeResize(mobileMapRef.current);
      safeResize(desktopMapRef.current);
    };

    resizeMaps();
    const timerShort = window.setTimeout(resizeMaps, 100);
    const timerLong = window.setTimeout(resizeMaps, 400);
    return () => {
      window.clearTimeout(timerShort);
      window.clearTimeout(timerLong);
    };
  }, [viewMode, listItems.length]);

  const requestDirections = async () => {
    if (!activeListing || !activeListing.isExact) {
      setRoutingError("Directions unlock after the landlord accepts your request.");
      return;
    }
    if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith("pk.")) {
      setRoutingError("Directions unavailable: missing valid Mapbox token.");
      return;
    }
    setRoutingError(null);
    setIsRouting(true);
    setRouteGeojson(null);
    try {
      const target = activeListing
        ? mapPoints.find((point) => point.id === activeListing.id)
        : mapPoints[0];
      if (!target) {
        setRoutingError("Unable to find destination.");
        return;
      }
      const sourceListing = sourceListings.find((listing) => listing.id === activeListing.id);
      let originLng: number | undefined;
      let originLat: number | undefined;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
            });
          });
          originLng = position.coords.longitude;
          originLat = position.coords.latitude;
        } catch {
          // Fall back to stored values.
        }
      }
      if (!Number.isFinite(originLng) || !Number.isFinite(originLat)) {
        if (userLocation) {
          originLng = userLocation.lng;
          originLat = userLocation.lat;
        }
      }
      if (!Number.isFinite(originLng) || !Number.isFinite(originLat)) {
        originLng = sourceListing?.routeOriginLng;
        originLat = sourceListing?.routeOriginLat;
      }
      if (!Number.isFinite(originLng) || !Number.isFinite(originLat)) {
        setRoutingError("Allow location access to get directions.");
        return;
      }
      const url = `https://api.mapbox.com/directions/v5/mapbox/${routingProfile}/${originLng},${originLat};${target.lng},${target.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Directions blocked by Mapbox token restrictions for this domain."
          );
        }
        throw new Error("Failed to fetch route.");
      }
      const data = (await response.json()) as {
        routes?: Array<{ geometry?: GeoJSON.LineString }>;
      };
      const route = data.routes?.[0]?.geometry;
      if (!route) {
        throw new Error(
          "No route found from your current location. Try a different profile or move closer."
        );
      }
      setRouteGeojson({
        type: "Feature",
        geometry: route,
        properties: {},
      });
    } catch (err) {
      setRoutingError(err instanceof Error ? err.message : "Unable to load directions.");
    } finally {
      setIsRouting(false);
    }
  };

  const requestRouteAccess = async () => {
    if (!activeListing) return;
    const threadId = await ensureThreadForListing(activeListing.id);
    if (threadId) {
      router.push(`/messages?thread=${threadId}&from=/map-view&intent=route-access`);
    } else {
      router.push("/messages");
    }
  };

  return (
    <div>
      {/* Mobile */}
      <div className="lg:hidden h-screen bg-background-light text-[#0c141d] font-display antialiased flex flex-col">
        <header className="bg-primary text-white pt-10 pb-4 px-4 shadow-lg shrink-0 rounded-b-lg z-10 w-full">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-xl font-bold tracking-tight">
              Matched Properties
            </h1>
          </div>

          {/* Controlled toggle */}
          <div className="flex justify-center">
            <div className="bg-white/10 p-1 rounded-full flex w-full max-w-[320px] backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${viewMode === "map"
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all duration-200 ${viewMode === "list"
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
          <main className="relative w-full flex-1 min-h-0 overflow-hidden bg-[#e8e4dc]">
                <MapCanvas
                  points={mapPoints}
                  activeIndex={activeMapIndex}
                  focusPointId={requestedPropertyId || undefined}
                  onSelect={setSelectedIndex}
                  onMapReady={handleMobileMapReady}
                  routeGeojson={routeGeojson}
              onMapError={setMapError}
              onMapStatus={handleMapStatus}
            />

            <div className="absolute right-4 top-4 z-30 flex flex-col gap-3">
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

            {hasApproxArea && (
              <div className="absolute left-3 top-4 z-30">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-primary shadow-sm backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[14px]">
                    location_on
                  </span>
                  <span>Approximate area shown</span>
                </div>
              </div>
            )}

            {showLoadingState && <MapSkeleton isMobile />}

            {showEmptyState && (
              <div className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white/95 shadow-xl border border-slate-200">
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
              <div className="absolute bottom-4 left-3 z-20 w-[78%] max-w-[340px]">
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-sm">
                  <div className="space-y-2">
                    <div className="flex gap-3 items-start">
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-200 relative">
                        {activeListing ? (
                          <Image
                            src={activeListing.image}
                            alt={activeListing.displayAddress}
                            fill
                            className="object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="flex-1 flex flex-col justify-between h-16 py-0.5 min-w-0">
                        <div>
                          <div className="flex justify-between items-start">
                            <h2 className="truncate text-base font-bold text-primary leading-none">
                              {activeListing?.price ?? "₦0"}
                            </h2>
                          </div>

                          <div className="flex items-center gap-2 text-gray-500 mt-1">
                            {[
                              { icon: "bed", value: activeListing?.beds ?? 0, label: "bd" },
                              { icon: "bathtub", value: activeListing?.baths ?? 0, label: "ba" },
                              { icon: "square_foot", value: activeListing?.sqft ?? "0", label: "sqft" },
                            ].map((item) => (
                              <div
                                key={`${item.icon}-${item.label}`}
                                className="flex items-center gap-1 text-[11px] font-medium"
                              >
                                {item.icon && (
                                  <span className="material-symbols-outlined text-[14px]">
                                    {item.icon}
                                  </span>
                                )}
                                <span>{item.value}</span>
                                <span>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      {activeListing && (
                        <Link
                          href={`/property-details/${activeListing.id}`}
                          className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
                        >
                          View details
                        </Link>
                      )}
                      {activeListing?.isExact ? (
                        <button
                          type="button"
                          onClick={requestDirections}
                          disabled={isRouting}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-primary bg-white px-3 py-2 text-xs font-semibold text-primary disabled:opacity-60"
                        >
                          {isRouting ? "Routing..." : "Get route"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={requestRouteAccess}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-primary bg-white px-3 py-2 text-xs font-semibold text-primary"
                        >
                          Request route
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-background-light px-4 py-5 space-y-5">
            {showLoadingState ? (
              <LoadingState label="Loading similar properties..." />
            ) : showEmptyState ? (
              <EmptyState
                title="No matches yet"
                message="Like a few listings in Explore to see them here."
                ctaLabel="Go to Explore"
                ctaHref="/explore"
              />
            ) : (
              listItems.map((item) => (
                <PropertyCard
                  key={item.id}
                  item={item}
                  onToggleSave={toggleLikeListing}
                />
              ))
            )}
            <div className="h-8" />
          </main>
        )}

        <BottomNav />
      </div>

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
            {showLoadingState ? (
              <LoadingState label="Loading similar properties..." />
            ) : showEmptyState ? (
              <EmptyState
                title="No matches yet"
                message="Like a few listings in Explore to see your matches here."
                ctaLabel="Browse listings"
                ctaHref="/explore"
              />
            ) : (
              listItems.map((item) => (
                <PropertyCard
                  key={item.id}
                  item={item}
                  onToggleSave={toggleLikeListing}
                />
              ))
            )}
            {!showEmptyState && <div className="h-10" />}
          </div>
        </aside>

        <section className="relative flex-1 h-full min-h-0 overflow-hidden bg-gray-200">
          <MapCanvas
            points={mapPoints}
            activeIndex={activeMapIndex}
            focusPointId={requestedPropertyId || undefined}
            onSelect={setSelectedIndex}
            onMapReady={handleDesktopMapReady}
            routeGeojson={routeGeojson}
            onMapError={setMapError}
            onMapStatus={handleMapStatus}
          />
          <div className="absolute top-6 right-6 flex flex-col space-y-2 z-30">
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

          {showLoadingState && <MapSkeleton isMobile={false} />}

          {showEmptyState && (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white/95 shadow-xl border border-slate-200">
                <EmptyState
                  title="No matches yet"
                  message="Like a few listings in Explore to see your matches on the map."
                  ctaLabel="Browse listings"
                  ctaHref="/explore"
                />
              </div>
            </div>
          )}

          {activeListing && (
            <div className="absolute bottom-6 left-6 z-20 w-80 rounded-2xl border border-slate-200 bg-white/95 shadow-xl p-4">
              <p className="text-sm font-semibold text-slate-700">Directions</p>
              <p className="text-xs text-slate-500 mt-1">
                {activeListing.isExact
                  ? "Get a route to this property."
                  : "Directions unlock after the landlord accepts your request."}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <select
                  value={routingProfile}
                  onChange={(event) =>
                    setRoutingProfile(
                      event.target.value as "driving" | "walking" | "cycling"
                    )
                  }
                  className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  disabled={!activeListing.isExact}
                >
                  <option value="driving">Driving</option>
                  <option value="walking">Walking</option>
                  <option value="cycling">Cycling</option>
                </select>
                <button
                  type="button"
                  onClick={requestDirections}
                  disabled={isRouting || !activeListing.isExact}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isRouting ? "Routing..." : "Get Route"}
                </button>
              </div>
              {!activeListing.isExact && (
                <button
                  type="button"
                  onClick={requestRouteAccess}
                  className="mt-3 w-full rounded-full border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary cursor-pointer"
                >
                  Message landlord to request directions
                </button>
              )}
            </div>
          )}
        </section>
      </div>

    </div>
  );
}

export default function MapView() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-light" />}>
      <MapViewContent />
    </Suspense>
  );
}
