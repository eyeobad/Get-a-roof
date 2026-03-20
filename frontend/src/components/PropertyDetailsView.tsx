"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "@/lib/listings";
import { useAppStore } from "@/store/useAppStore";

const fallbackGallery = ["/p2.png", "/p3.png", "/propertydetails.png"];

const socialLinks = [
  {
    name: "Twitter",
    href: "https://twitter.com/intent/tweet?text=Check%20out%20this%20listing%20",
    icon: "share", // keep material icons only
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/sharer/sharer.php?u=",
    icon: "public",
  },
  { name: "WhatsApp", href: "https://wa.me/?text=Check%20out%20this%20listing%20", icon: "chat" },
];

const amenityIconMap: Record<string, string> = {
  "local laundry service": "local_laundry_service",
  laundry: "local_laundry_service",
  washer: "local_laundry_service",
  dryer: "local_laundry_service",
  "ac unit": "ac_unit",
  "air conditioning": "ac_unit",
  parking: "directions_car",
  garage: "directions_car",
  elevator: "elevator",
  lift: "elevator",
  security: "security",
  gym: "fitness_center",
  pool: "pool",
  generator: "bolt",
  internet: "wifi",
  wifi: "wifi",
  furnished: "weekend",
  balcony: "balcony",
};

const resolveAmenityIcon = (amenity: string) => {
  const key = amenity.trim().toLowerCase();
  return (
    amenityIconMap[key] ||
    Object.entries(amenityIconMap).find(([needle]) => key.includes(needle))?.[1] ||
    "verified"
  );
};

type PropertyDetailsViewProps = {
  listing: Listing;
  onBack?: () => void;
};

export default function PropertyDetailsView({ listing, onBack }: PropertyDetailsViewProps) {
  const router = useRouter();

  const ensureThreadForListing = useAppStore((s) => s.ensureThreadForListing);
  const authToken = useAppStore((s) => s.authToken);

  const likeListing = useAppStore((s) => s.likeListing);
  const unlikeListing = useAppStore((s) => s.unlikeListing);
  const loadMatches = useAppStore((s) => s.loadMatches);

  const likedIds = useAppStore((s) => s.likedIds);
  const isSaved = useMemo(() => likedIds.includes(listing.id), [likedIds, listing.id]);

  useEffect(() => {
    if (!authToken) return;
    void loadMatches();
  }, [authToken, loadMatches]);

  const gallery = useMemo(() => {
    const rawImages =
      listing.images && listing.images.length
        ? listing.images
        : [listing.image, ...fallbackGallery];
    const unique = Array.from(new Set(rawImages.filter(Boolean)));
    const finalImages = unique.length ? unique : fallbackGallery;
    return finalImages.map((src, index) => ({
      src,
      alt: `Listing image ${index + 1}`,
    }));
  }, [listing]);

  const stats = useMemo(() => {
    if (listing.stats && listing.stats.length) return listing.stats;
    return [
      { icon: "bed", label: `${listing.bedrooms || 0} Beds` },
      { icon: "bathtub", label: `${listing.bathrooms || 0} Baths` },
      { icon: "square_foot", label: `${listing.sqft || "0"} sqft` },
    ];
  }, [listing]);

  const amenities = useMemo(() => listing.amenities ?? [], [listing.amenities]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [shareUrl] = useState(() => (typeof window !== "undefined" ? window.location.href : ""));
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);

  const shareRef = useRef<HTMLDivElement | null>(null);

  // close share menu when clicking outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!shareRef.current) return;
      if (!shareRef.current.contains(e.target as Node)) setShareMenuOpen(false);
    }
    if (shareMenuOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [shareMenuOpen]);

  const prevSlide = () =>
    setCurrentIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % gallery.length);

  const handleBack = () => {
    if (onBack) return onBack();
    if (typeof window !== "undefined") window.history.back();
  };

  const tapSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % gallery.length);

  const handleToggleSave = async () => {
    if (isSavePending) return;
    setIsSavePending(true);
    try {
    if (isSaved) {
      await unlikeListing(listing.id);
      return;
    }
    await likeListing(listing.id);
    } finally {
      setIsSavePending(false);
    }
  };

  const safeIndex = gallery.length ? currentIndex % gallery.length : 0;
  const progressPct =
    gallery.length <= 1 ? 100 : ((safeIndex + 1) / gallery.length) * 100;

  return (
    <div className="min-h-screen text-slate-900 font-display bg-background-light">
      <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto pb-32">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto flex items-center justify-between px-4 pt-6 pb-2 pointer-events-none">
          <button
            aria-label="Back"
            onClick={handleBack}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-slate-900 hover:bg-white transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-3xl">arrow_back</span>
          </button>

          {/* Share */}
          <div className="relative pointer-events-auto" ref={shareRef}>
            <button
              aria-label="Share property"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-slate-900 hover:bg-white transition-transform active:scale-95"
              onClick={() => {
                if (navigator.share && shareUrl) {
                  navigator
                    .share({ title: "Property detail", url: shareUrl })
                    .catch(() => setShareMenuOpen((prev) => !prev));
                } else {
                  setShareMenuOpen((prev) => !prev);
                }
              }}
            >
              <span className="material-symbols-outlined text-2xl">share</span>
            </button>

            {shareMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 text-sm text-slate-700 z-50">
                <p className="font-semibold text-gray-900 mb-2">Share this listing</p>

                <div className="flex flex-col gap-2 mb-3">
                  <button
                    onClick={() => shareUrl && navigator.clipboard?.writeText(shareUrl)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-xs font-medium hover:bg-slate-50"
                  >
                    Copy link
                  </button>
                  {shareUrl && (
                    <input
                      readOnly
                      value={shareUrl}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 bg-gray-50"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={`${social.href}${encodeURIComponent(shareUrl || "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-600 hover:text-primary"
                      aria-label={`Share on ${social.name}`}
                    >
                      <span className="material-symbols-outlined text-2xl">{social.icon}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Gallery */}
        <div className="relative w-full h-[55vh] md:mt-16 overflow-hidden">
          <Image
            src={gallery[safeIndex].src}
            alt={gallery[safeIndex].alt}
            fill
            sizes="100vw"
            className="object-cover"
            onClick={tapSlide}
            priority
          />

          {/* top fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

          {/* arrows */}
          <button
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow-lg active:scale-95 transition"
          >
            <span className="material-symbols-outlined text-3xl text-slate-900">chevron_left</span>
          </button>

          <button
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow-lg active:scale-95 transition"
          >
            <span className="material-symbols-outlined text-3xl text-slate-900">chevron_right</span>
          </button>

          {/* counter */}
          <div className="absolute bottom-10 right-5 bg-black/60 text-white px-4 py-1.5 rounded-full text-base font-semibold backdrop-blur-md shadow-sm border border-white/10">
            {safeIndex + 1}/{gallery.length}
          </div>

          {/* progress bar + dots */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
            <div className="h-1.5 w-full rounded-full bg-white/40 overflow-hidden backdrop-blur-sm">
              <div className="h-full bg-white/90 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-center gap-2">
              {gallery.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === safeIndex ? "w-8 bg-white" : "w-2.5 bg-white/60 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-col gap-8 rounded-t-[2.5rem] px-6 pt-8 -mt-10 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] border-t border-white/30 bg-white">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h1 className="text-primary text-4xl font-bold">{listing.price}</h1>
                <span className="text-xl font-semibold text-slate-600">{listing.period}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleToggleSave}
                  disabled={isSavePending}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition active:scale-95 ${
                    isSaved
                      ? "bg-primary text-white shadow-lg"
                      : "border border-slate-200 bg-white text-slate-800 hover:border-primary hover:text-primary"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isSaved ? "check" : "favorite_border"}
                  </span>
                  {isSaved ? "Saved" : "Save"}
                </button>

                <button
                  onClick={async () => {
                    if (!authToken) {
                      router.push(`/login?next=${encodeURIComponent(`/property-details/${listing.id}`)}`);
                      return;
                    }

                    try {
                      const threadId = await ensureThreadForListing(listing.id);
                      if (threadId) {
                        router.push(`/messages?thread=${threadId}`);
                      } else {
                        router.push(`/messages`);
                      }
                    } catch {
                      router.push(`/messages`);
                    }
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">chat_bubble</span>
                  Contact
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-slate-900 text-[1.6rem] font-bold leading-tight">{listing.address}</h2>
              <p className="text-slate-700 text-lg mt-1 font-medium">{listing.neighborhood}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-blue-100 flex h-12 items-center gap-2 rounded-full px-5 py-3 border border-blue-200"
              >
                <span className="material-symbols-outlined text-primary text-2xl">{stat.icon}</span>
                <p className="font-bold text-lg text-blue-900">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-primary text-2xl font-bold">About this home</h3>
            <p className="text-slate-900 text-lg leading-relaxed">{listing.description}</p>
            <button className="inline-flex items-center gap-1 text-primary font-bold text-lg hover:underline decoration-2 underline-offset-4">
              Read more <span className="material-symbols-outlined text-2xl">expand_more</span>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-primary text-2xl font-bold">Amenities</h3>
            {amenities.length ? (
              <div className="flex flex-col gap-5 pl-1">
                {amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <span className="material-symbols-outlined text-primary text-3xl">
                        {resolveAmenityIcon(amenity)}
                      </span>
                    </div>
                    <span className="text-slate-900 text-lg font-medium">
                      {amenity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-base">No amenities listed yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col">
              <h3 className="text-primary text-2xl font-bold">Location</h3>
              <span className="text-slate-700 text-lg font-medium mt-1">{listing.neighborhood}</span>
            </div>

            <div className="w-full h-64 rounded-3xl overflow-hidden bg-slate-200 relative group cursor-pointer border border-slate-200">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${listing.image}')` }}
              />
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                <Link
                  href={`/map-view?propertyId=${listing.id}`}
                  className="bg-white text-primary px-7 py-3.5 rounded-full flex items-center gap-2.5 shadow-xl transform transition-transform active:scale-95 group-hover:scale-105"
                >
                  <span className="material-symbols-outlined text-primary">map</span>
                  <span className="font-bold text-lg">View on Map</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
