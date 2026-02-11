"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import BottomNav from "@/components/BottomNav";
import { useAppStore } from "@/store/useAppStore";

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
  price: string;
  lat: number;
  lng: number;
  displayLat: number;
  displayLng: number;
  isExact: boolean;
};

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiZXllb2JhZCIsImEiOiJjbWw2eTFpcGowZzQ1M2NzY2cycjJweHZkIn0.xlR97W8pEWAFRkDEBlxf9g";

mapboxgl.accessToken = MAPBOX_TOKEN;

const MAPBOX_RASTER_STYLE: mapboxgl.Style = {
  version: 8,
  sources: {
    "mapbox-raster": {
      type: "raster",
      tiles: [
        `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: "mapbox-raster-layer",
      type: "raster",
      source: "mapbox-raster",
    },
  ],
};

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
          className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-white transition"
          aria-label={item.isSaved ? "Remove saved listing" : "Save listing"}
        >
          <span className="material-symbols-outlined text-xl text-gray-400">
            {item.isSaved ? "favorite" : "favorite_border"}
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
  onSelect,
  onMapReady,
  routeGeojson,
  onMapError,
  onMapStatus,
}: {
  points: MapPoint[];
  activeIndex: number;
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

    const map = new mapboxgl.Map({
      container: mapElementRef.current,
      style: MAPBOX_RASTER_STYLE,
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
          "Map style failed to load. Check Mapbox token restrictions for localhost."
        );
      }
    }, 5000);

    map.on("error", (event) => {
      const message =
        typeof event.error?.message === "string"
          ? event.error.message
          : "Map error (check Network for 401/403 tile requests).";
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
          type: "circle",
          source: "approx-areas",
          paint: {
            "circle-color": "#0a44b8",
            "circle-opacity": 0.22,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              24,
              14,
              48,
            ],
            "circle-stroke-color": "#0a44b8",
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.6,
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
      const style = map.getStyle();
      onMapStatus({
        supported: true,
        loaded: map.loaded(),
        styleLoaded: map.isStyleLoaded(),
        tilesLoaded: map.areTilesLoaded(),
        layerCount: style.layers?.length ?? 0,
        sourceCount: Object.keys(style.sources ?? {}).length,
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
      const style = map.getStyle();
      onMapStatus({
        supported: true,
        loaded: map.loaded(),
        styleLoaded: map.isStyleLoaded(),
        tilesLoaded: map.areTilesLoaded(),
        layerCount: style.layers?.length ?? 0,
        sourceCount: Object.keys(style.sources ?? {}).length,
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
    if (!map || !mapLoadedRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    points.forEach((point) => {
      const markerEl = document.createElement("div");
      markerEl.className = [
        "map-price-marker",
        point.index === activeIndex ? "is-active" : "",
        point.isExact ? "is-exact" : "is-approx",
      ]
        .filter(Boolean)
        .join(" ");
      markerEl.innerHTML = point.isExact ? `<span>${point.price}</span>` : "";
      if (!point.isExact) {
        markerEl.setAttribute("aria-label", point.price);
      }
      markerEl.addEventListener("click", () => onSelect(point.index));
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([point.displayLng, point.displayLat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    const approxFeatures = points
      .filter((point) => !point.isExact)
      .map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.displayLng, point.displayLat],
        },
        properties: {},
      }));

    const areaSource = map.getSource("approx-areas") as mapboxgl.GeoJSONSource | undefined;
    if (areaSource) {
      areaSource.setData({
        type: "FeatureCollection",
        features: approxFeatures,
      });
    }
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
      coords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 80, duration: 600 });
    }
  }, [routeGeojson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points.length) return;
    const bounds = new mapboxgl.LngLatBounds();
    points.forEach((point) => {
      bounds.extend([point.displayLng, point.displayLat]);
    });
    map.fitBounds(bounds, { padding: 60, duration: 0 });
  }, [points]);

  return (
    <div
      ref={mapElementRef}
      className="h-full w-full pointer-events-auto"
      style={{ pointerEvents: "auto", touchAction: "none" }}
    />
  );
}

export default function MapView() {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const mapMatches = useAppStore((state) => state.mapMatches);
  const loadMapMatches = useAppStore((state) => state.loadMapMatches);
  const matchSummaries = useAppStore((state) => state.matchSummaries);
  const loadMatches = useAppStore((state) => state.loadMatches);
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
  const [isRouting, setIsRouting] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (authToken) {
      void loadMapMatches();
      void loadMatches();
    }
  }, [authToken, loadMapMatches, loadMatches]);

  const sourceListings = mapMatches;
  const showEmptyState = mapMatches.length === 0;

  const acceptedIds = useMemo(() => {
    return new Set(
      matchSummaries
        .filter((match) => match.landlordReplied)
        .map((match) => match.listingId)
    );
  }, [matchSummaries]);

  const listItems = useMemo<ListingCard[]>(() => {
    return sourceListings.map((listing) => {
      const isExact = !authToken || acceptedIds.has(listing.id);
      return {
        id: listing.id,
        price: listing.price,
        address: listing.address,
        displayAddress: isExact
          ? listing.address
          : buildDisplayAddress(listing.address, listing.neighborhood),
        beds: listing.bedrooms,
        baths: listing.bathrooms,
        sqft: listing.sqft,
        tag: listing.tag,
        image: listing.image,
        isExact,
        isSaved: likedIds.includes(listing.id),
      };
    });
  }, [sourceListings, acceptedIds, authToken, likedIds]);

  const mapPoints = useMemo<MapPoint[]>(() => {
    return sourceListings
      .map((listing, index) => {
        const isExact = !authToken || acceptedIds.has(listing.id);
        const lat = listing.lat;
        const lng = listing.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }
        const display = isExact ? { lat, lng } : jitterPoint(lat, lng, listing.id);
        return {
          id: listing.id,
          index,
          price: listing.price,
          lat,
          lng,
          displayLat: display.lat,
          displayLng: display.lng,
          isExact,
        };
      })
      .filter((point): point is MapPoint => Boolean(point));
  }, [sourceListings, acceptedIds, authToken]);

  const activeIndex =
    listItems.length > 0
      ? Math.min(selectedIndex, listItems.length - 1)
      : 0;
  const activeListing = listItems[activeIndex] ?? listItems[0];

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

  const handleMapStatus = useCallback(() => {}, []);

  const handleZoomIn = (mapRef: { current: mapboxgl.Map | null }) => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = (mapRef: { current: mapboxgl.Map | null }) => {
    mapRef.current?.zoomOut();
  };

  const handleLocate = (mapRef: { current: mapboxgl.Map | null }) => {
    const target = mapPoints.find((point) => point.index === activeIndex);
    if (!target || !mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.flyTo({
      center: [target.displayLng, target.displayLat],
      zoom: Math.max(currentZoom, 14),
      duration: 600,
    });
  };

  useEffect(() => {
    const maps = [mobileMapRef.current, desktopMapRef.current];
    const resizeMaps = () => {
      maps.forEach((map) => map?.resize());
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
    if (!navigator.geolocation) {
      setRoutingError("Geolocation is not supported in this browser.");
      return;
    }
    setRoutingError(null);
    setIsRouting(true);
    setRouteGeojson(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        });
      });
      const originLng = position.coords.longitude;
      const originLat = position.coords.latitude;
      const target = mapPoints.find((point) => point.index === activeIndex);
      if (!target) {
        setRoutingError("Unable to find destination.");
        return;
      }
      const url = `https://api.mapbox.com/directions/v5/mapbox/${routingProfile}/${originLng},${originLat};${target.lng},${target.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch route.");
      }
      const data = (await response.json()) as {
        routes?: Array<{ geometry?: GeoJSON.LineString }>;
      };
      const route = data.routes?.[0]?.geometry;
      if (!route) {
        throw new Error("No route found.");
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
      router.push(`/messages?thread=${threadId}&from=/map-view`);
    } else {
      router.push("/messages");
    }
  };

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden h-screen bg-background-light text-[#0c141d] font-display antialiased flex flex-col">
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
          <main className="relative w-full flex-1 min-h-0 overflow-hidden bg-[#e8e4dc]">
            <MapCanvas
              points={mapPoints}
              activeIndex={activeIndex}
              onSelect={setSelectedIndex}
              onMapReady={handleMobileMapReady}
              routeGeojson={routeGeojson}
              onMapError={setMapError}
              onMapStatus={handleMapStatus}
            />
            {mapError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center px-6 pointer-events-none">
                <div className="pointer-events-auto rounded-2xl bg-white/95 border border-slate-200 p-4 text-center text-sm text-slate-700 shadow-xl">
                  <p className="font-semibold text-slate-900">Map failed to load</p>
                  <p className="mt-1">{mapError}</p>
                </div>
              </div>
            )}

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
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="bg-white rounded-lg shadow-2xl p-4 border border-gray-100 relative">
                  <div className="flex gap-4 items-start">
                    <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-200 relative">
                      {activeListing ? (
                        <Image
                          src={activeListing.image}
                          alt={activeListing.displayAddress}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex-1 flex flex-col justify-between h-24 py-0.5">
                      <div>
                        <div className="flex justify-between items-start">
                          <h2 className="text-xl font-bold text-primary leading-none">
                            {activeListing?.price ?? "₦0"}
                          </h2>
                          <button className="text-gray-400 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">
                              favorite
                            </span>
                          </button>
                        </div>

                        <p className="text-gray-600 text-sm mt-1 truncate">
                          {activeListing?.displayAddress ?? "No matched properties yet"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-gray-500 mt-1">
                        {[
                          { icon: "bed", value: activeListing?.beds ?? 0, label: "bd" },
                          { icon: "bathtub", value: activeListing?.baths ?? 0, label: "ba" },
                          { icon: "square_foot", value: activeListing?.sqft ?? "0", label: "sqft" },
                        ].map((item) => (
                          <div
                            key={`${item.icon}-${item.label}`}
                            className="flex items-center gap-1 text-sm font-medium"
                          >
                            {item.icon && (
                              <span className="material-symbols-outlined text-[18px]">
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

                  {activeListing?.isExact ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          near_me
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          Directions
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={routingProfile}
                          onChange={(event) =>
                            setRoutingProfile(
                              event.target.value as "driving" | "walking" | "cycling"
                            )
                          }
                          className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          <option value="driving">Driving</option>
                          <option value="walking">Walking</option>
                          <option value="cycling">Cycling</option>
                        </select>
                        <button
                          type="button"
                          onClick={requestDirections}
                          disabled={isRouting}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {isRouting ? "Routing..." : "Get Route"}
                        </button>
                      </div>
                      {routingError && (
                        <p className="mt-2 text-xs text-red-600">{routingError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      <p>Directions unlock after the landlord accepts your request.</p>
                      <button
                        type="button"
                        onClick={requestRouteAccess}
                        className="mt-2 w-full rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white"
                      >
                        Message landlord to request directions
                      </button>
                    </div>
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
            activeIndex={activeIndex}
            onSelect={setSelectedIndex}
            onMapReady={handleDesktopMapReady}
            routeGeojson={routeGeojson}
            onMapError={setMapError}
            onMapStatus={handleMapStatus}
          />
          {mapError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-6 pointer-events-none">
              <div className="pointer-events-auto rounded-2xl bg-white/95 border border-slate-200 p-4 text-center text-sm text-slate-700 shadow-xl">
                <p className="font-semibold text-slate-900">Map failed to load</p>
                <p className="mt-1">{mapError}</p>
              </div>
            </div>
          )}

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
                  className="mt-3 w-full rounded-full border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary"
                >
                  Message landlord to request directions
                </button>
              )}
              {routingError && (
                <p className="mt-2 text-xs text-red-600">{routingError}</p>
              )}
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        .mapboxgl-map {
          font-family: var(--font-sans);
          background: #e2e8f0;
        }
        .mapboxgl-canvas-container,
        .mapboxgl-canvas,
        .mapboxgl-map {
          pointer-events: auto !important;
        }
        .mapboxgl-canvas {
          outline: none;
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
        .map-price-marker.is-approx {
          width: 14px;
          height: 14px;
          padding: 0;
          border-radius: 999px;
          background: #0a44b8;
          border: 2px solid #0a44b8;
          box-shadow: 0 8px 18px rgba(10, 68, 184, 0.35);
          font-size: 0;
        }
        .map-price-marker.is-approx::after {
          display: none;
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
