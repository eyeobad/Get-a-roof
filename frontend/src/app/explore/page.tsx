"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "framer-motion";

import BottomNav from "@/components/BottomNav";
import ExploreTutorial from "@/components/ExploreTutorial";
import { useAppStore } from "@/store/useAppStore";
import type { Listing } from "@/lib/listings";
import { PROPERTY_TYPE_OPTIONS } from "@/lib/propertyTypes";
import { getCitiesForState, NIGERIA_STATES } from "@/lib/nigeriaLocations";
import { useExploreDeckController } from "@/app/explore/useExploreDeckController";
import { showToast } from "@/lib/alerts";

type FilterModalProps = {
  isOpen: boolean;
  close: () => void;
  onApply: () => void;
  filters: ExploreFilterState;
  setFilters: Dispatch<SetStateAction<ExploreFilterState>>;
  onReset: () => void;
  toggleOptions: { label: string; key: string }[];
};

type ExploreFilterState = {
  budget: number;
  distance: number;
  state: string;
  city: string;
  propertyType: string;
  listingIntent: "" | "Rent" | "Shortlet";
  toggles: Record<string, boolean>;
};

type LastSwipe = {
  listing: Listing;
  direction: "left" | "right";
};

const BASE_BUDGET = 100000;
const BASE_DISTANCE = 15;
const PRELOAD_LOOKAHEAD = 8;
const MAX_PRELOADED_IMAGES = 260;

const preloadImage = async (src: string) => {
  if (!src || typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
  try {
    await img.decode();
  } catch {
    // Ignore decode errors; browser cache warm-up is still useful.
  }
};

export default function ExploreCards() {
  const router = useRouter();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleOptions = useMemo(
    () => [
      { label: "Self Compound", key: "selfCompound" },
      { label: "Shortlets", key: "shortlets" },
      { label: "Shared Compound", key: "sharedCompound" },
      { label: "Non-owner-occupied", key: "nonOwner" },
    ],
    []
  );

  const initialPreferredDistance = useMemo(() => {
    const tenantPrefs = (useAppStore.getState().user?.preferences?.tenant ?? {}) as {
      preferredDistance?: number;
      maxCommuteRadius?: number;
      preferredState?: string;
    };
    if (
      typeof tenantPrefs.preferredDistance === "number" &&
      Number.isFinite(tenantPrefs.preferredDistance)
    ) {
      return Math.round(tenantPrefs.preferredDistance);
    }
    if (
      typeof tenantPrefs.maxCommuteRadius === "number" &&
      Number.isFinite(tenantPrefs.maxCommuteRadius)
    ) {
      return Math.round(tenantPrefs.maxCommuteRadius);
    }
    return BASE_DISTANCE;
  }, []);

  const defaultFilters = useMemo<ExploreFilterState>(
    () => ({
      budget: BASE_BUDGET,
      distance: initialPreferredDistance,
      state:
        (((useAppStore.getState().user?.preferences?.tenant ?? {}) as {
          preferredState?: string;
        }).preferredState || "").trim(),
      city: "",
      propertyType: "",
      listingIntent: "",
      toggles: toggleOptions.reduce<Record<string, boolean>>(
        (acc, option) => ({ ...acc, [option.key]: false }),
        {}
      ),
    }),
    [toggleOptions, initialPreferredDistance]
  );

  const [filters, setFilters] = useState<ExploreFilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<ExploreFilterState>(defaultFilters);
  const [cardImageIndexes, setCardImageIndexes] = useState<Record<string, number>>({});
  const [deckResetKey, setDeckResetKey] = useState(0);

  const hasActiveFilters = useMemo(() => {
    if (
      filters.budget !== defaultFilters.budget ||
      filters.distance !== defaultFilters.distance ||
      filters.state !== defaultFilters.state ||
      filters.city !== defaultFilters.city ||
      filters.propertyType !== defaultFilters.propertyType ||
      filters.listingIntent !== defaultFilters.listingIntent
    ) {
      return true;
    }
    return Object.values(filters.toggles).some(Boolean);
  }, [filters, defaultFilters]);

  const likeListing = useAppStore((state) => state.likeListing);
  const unlikeListing = useAppStore((state) => state.unlikeListing);
  const passListing = useAppStore((state) => state.passListing);
  const setSelectedListingId = useAppStore((state) => state.setSelectedListingId);
  const captureUserLocation = useAppStore((state) => state.captureUserLocation);
  const authToken = useAppStore((state) => state.authToken);
  const userLocation = useAppStore((state) => state.userLocation);
  const tenantPrefs = useAppStore((state) => state.user?.preferences?.tenant);

  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const swipeLockRef = useRef(false);
  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null);
  const preloadedImageUrlsRef = useRef(new Set<string>());
  const preloadedImageQueueRef = useRef<string[]>([]);
  const hasMountedRef = useRef(false);
  const frontCardControlsAttachedRef = useRef(false);

  const controls = useAnimation();
  const frontCardX = useMotionValue(0);
  const resetControls = useCallback(() => {
    if (!hasMountedRef.current || !frontCardControlsAttachedRef.current) return;
    controls.set({ x: 0, rotate: 0, opacity: 1 });
  }, [controls]);

  const activeExploreFilters = useMemo(
    () => ({
      budget: filters.budget,
      distance: filters.distance,
      state: filters.state,
      city: filters.city,
      propertyType: filters.propertyType,
      listingIntent: filters.listingIntent,
      toggles: filters.toggles,
    }),
    [
      filters.budget,
      filters.distance,
      filters.state,
      filters.city,
      filters.propertyType,
      filters.listingIntent,
      filters.toggles,
    ]
  );

  const normalizedTenantPrefs = useMemo(
    () =>
      tenantPrefs && typeof tenantPrefs === "object"
        ? {
          preferredDistance:
            typeof tenantPrefs.preferredDistance === "number"
              ? tenantPrefs.preferredDistance
              : undefined,
          maxCommuteRadius:
            typeof tenantPrefs.maxCommuteRadius === "number"
              ? tenantPrefs.maxCommuteRadius
              : undefined,
          preferredState:
            typeof tenantPrefs.preferredState === "string"
              ? tenantPrefs.preferredState
              : undefined,
        }
        : null,
    [tenantPrefs]
  );

  const {
    cardsToRender,
    topCardId,
    phase: deckPhase,
    hasRenderedCards,
    errorMessage,
    commitSwipe,
    rollbackSwipe,
  } = useExploreDeckController({
    authToken,
    filters: activeExploreFilters,
    resetKey: deckResetKey,
    tenantPrefs: normalizedTenantPrefs,
    userLocation,
  });
  const missingStackCards = Math.max(0, 3 - cardsToRender.length);
  const showDeckSkeleton =
    cardsToRender.length === 0 &&
    deckPhase === "boot_loading" &&
    !hasRenderedCards;

  useEffect(() => {
    hasMountedRef.current = true;
    return () => {
      hasMountedRef.current = false;
      frontCardControlsAttachedRef.current = false;
    };
  }, []);

  useEffect(() => {
    resetControls();
    swipeLockRef.current = false;
    setIsSwipeAnimating(false);
  }, [topCardId, resetControls]);

  useEffect(() => {
    if (useAppStore.getState().selectedListingId !== topCardId) {
      setSelectedListingId(topCardId);
    }
  }, [setSelectedListingId, topCardId]);

  const resetDeck = () => {
    const next = {
      ...defaultFilters,
      toggles: { ...defaultFilters.toggles },
    };
    setDraftFilters(next);
    setFilters(next);
    setCardImageIndexes({});
    swipeLockRef.current = false;
    setLastSwipe(null);
    resetControls();
    setIsSwipeAnimating(false);
    setDeckResetKey((value) => value + 1);
  };

  const applyFilters = () => {
    const nextFilters = {
      ...draftFilters,
      toggles: { ...draftFilters.toggles },
    };
    setFilters(nextFilters);
    setCardImageIndexes({});
    setLastSwipe(null);
    setDeckResetKey((value) => value + 1);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    const next = {
      ...defaultFilters,
      toggles: { ...defaultFilters.toggles },
    };
    setDraftFilters(next);
    setFilters(next);
    setCardImageIndexes({});
    setLastSwipe(null);
    setDeckResetKey((value) => value + 1);
    setFiltersOpen(false);
  };

  useEffect(() => {
    void captureUserLocation();
  }, [captureUserLocation]);

  useEffect(() => {
    const upcomingCards = cardsToRender.slice(1, 1 + PRELOAD_LOOKAHEAD);

    const trackPreloadedImage = (src: string) => {
      const cache = preloadedImageUrlsRef.current;
      if (cache.has(src)) return false;
      cache.add(src);
      preloadedImageQueueRef.current.push(src);
      if (cache.size > MAX_PRELOADED_IMAGES) {
        const oldest = preloadedImageQueueRef.current.shift();
        if (oldest) cache.delete(oldest);
      }
      return true;
    };

    upcomingCards.forEach((card) => {
      const candidates = (card.images?.length ? card.images : [card.image]).filter(Boolean);
      candidates.forEach((src) => {
        if (!src || !trackPreloadedImage(src)) return;
        void preloadImage(src);
      });
    });
  }, [cardsToRender]);

  const handleSwipe = async (direction: "left" | "right") => {
    if (swipeLockRef.current || isSwipeAnimating || cardsToRender.length === 0) return;

    const topListing = cardsToRender[0];
    if (!topListing) return;

    swipeLockRef.current = true;
    setIsSwipeAnimating(true);

    try {
      const swipeAnimation = controls.start({
        x: direction === "left" ? -420 : 420,
        rotate: direction === "left" ? -18 : 18,
        opacity: 0,
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
      });
      await Promise.race([
        swipeAnimation,
        new Promise((resolve) => window.setTimeout(resolve, 180)),
      ]);

      // Optimistic deck advancement; rollback if backend write fails.
      commitSwipe(topListing.id);

      if (direction === "right") {
        await likeListing(topListing.id);
        setSelectedListingId(topListing.id);
      } else {
        await passListing(topListing.id);
      }
      setLastSwipe({ listing: topListing, direction });
      resetControls();
      await swipeAnimation.catch(() => undefined);
    } catch {
      rollbackSwipe(topListing);
      showToast({
        title: "Swipe failed",
        text: "Could not save your action. Please try again.",
        variant: "error",
      });
      resetControls();
    } finally {
      swipeLockRef.current = false;
      setIsSwipeAnimating(false);
    }
  };

  const handleUndoLastSwipe = useCallback(async () => {
    if (swipeLockRef.current || isSwipeAnimating) return;
    if (!lastSwipe) return;

    swipeLockRef.current = true;
    setIsSwipeAnimating(true);

    try {
      // For right swipes, best-effort revert persisted saved/match state first.
      if (lastSwipe.direction === "right") {
        await unlikeListing(lastSwipe.listing.id);
      }
      rollbackSwipe(lastSwipe.listing);
      setSelectedListingId(lastSwipe.listing.id);
      setLastSwipe(null);
    } catch {
      showToast({
        title: "Undo failed",
        text: "Could not undo last swipe. Please try again.",
        variant: "error",
      });
    } finally {
      resetControls();
      swipeLockRef.current = false;
      setIsSwipeAnimating(false);
    }
  }, [
    isSwipeAnimating,
    lastSwipe,
    resetControls,
    rollbackSwipe,
    setSelectedListingId,
    unlikeListing,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isUndoCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z";
      if (!isUndoCombo) return;
      event.preventDefault();
      void handleUndoLastSwipe();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndoLastSwipe]);

  const resolveCardImages = (card: Listing) => {
    const fromCollection = (card.images ?? []).filter(Boolean);
    const allImages = fromCollection.length ? fromCollection : [card.image];
    return allImages;
  };

  const setCardImageIndex = (cardId: string, nextIndex: number, total: number) => {
    if (total <= 0) return;
    const normalized = ((nextIndex % total) + total) % total;
    setCardImageIndexes((prev) => ({
      ...prev,
      [cardId]: normalized,
    }));
  };

  const cardBody = (card: Listing, isFront: boolean) => {
    const images = resolveCardImages(card);
    const activeImageIndex =
      cardImageIndexes[card.id] !== undefined
        ? Math.min(cardImageIndexes[card.id]!, images.length - 1)
        : 0;
    const activeImage = images[activeImageIndex] ?? card.image;
    return (
      <>
        <div className="relative h-[86%] md:h-[72%] w-full">
          <div className="absolute inset-0">
            <Image
              src={activeImage}
              alt={card.alt}
              fill
              sizes="(max-width:768px) 90vw, 640px"
              className="object-cover"
              priority={isFront}
            />
          </div>

          {images.length > 1 && (
            <>
              <div className="absolute inset-x-0 top-4 z-20 flex items-center justify-center gap-1.5 px-8">
                {images.map((_, index) => (
                  <button
                    key={`${card.id}-dot-${index}`}
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setCardImageIndex(card.id, index, images.length);
                    }}
                    className={`h-1.5 rounded-full transition-all ${index === activeImageIndex ? "w-6 bg-white" : "w-2 bg-white/50 md:w-6"
                      }`}
                    aria-label={`Show photo ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold tracking-wide shadow-sm">
            {card.tag}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-primary to-transparent" />
        </div>

        <div className="flex-1 bg-primary text-white px-4 py-3 md:px-6 md:py-5 flex flex-col justify-between gap-2.5 md:gap-4">
          <div className="flex flex-col gap-1 md:gap-2 border-b border-white/10 pb-2 md:pb-3">
            <div className="flex items-end gap-2">
              <h2 className="text-[2rem] md:text-4xl leading-none font-bold tracking-tight">{card.price}</h2>
              <span className="text-base md:text-xl font-medium opacity-80 mb-0.5 md:mb-1.5">{card.period}</span>
            </div>
            <p className="text-[11px] md:text-xs uppercase tracking-[0.28em] md:tracking-[0.35em] text-white/70">{card.highlight}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 py-1 md:py-2">
            {card.stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center bg-white/10 rounded-xl py-2 px-1 md:py-3 backdrop-blur-sm"
              >
                <span className="material-symbols-outlined text-lg md:text-2xl mb-0.5 md:mb-1">{stat.icon}</span>
                <span className="text-sm md:text-lg font-bold">{stat.label}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (!isFront) return;
              setSelectedListingId(card.id);
              router.push(`/property-details/${card.id}`);
            }}
            className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left backdrop-blur-sm transition hover:bg-white/10 active:bg-white/15"
            aria-label={`Open details for ${card.highlight}`}
          >
            <div className="flex items-start gap-2 md:gap-3 min-w-0">
              <span className="material-symbols-outlined text-xl md:text-3xl mt-0.5 text-terracotta shrink-0">
                location_on
              </span>

              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[13px] md:text-base font-semibold leading-snug opacity-95">
                  {card.publicLocationLabel || card.neighborhood || card.address}
                </p>
              </div>
            </div>
            <span className="mt-1 shrink-0 text-sm font-bold uppercase tracking-[0.22em] text-white/80">
              View
            </span>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background-light text-[#0c141d] font-display transition-colors duration-200 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-6 py-4 bg-background-light z-20">
        <div className="relative w-12 h-12">
          <Image
            src="/logo2.svg"
            alt="logo"
            fill
            priority
            className="object-contain scale-[1.8]"
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-primary">Explore</h1>

        <div className="w-12 flex justify-end">
          <button
            data-tour="explore-filters"
            onClick={() => {
              setDraftFilters(filters);
              setFiltersOpen(true);
            }}
            className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-colors ${hasActiveFilters ? "bg-primary/10 text-primary" : "hover:bg-black/5"
              }`}
          >
            <span className="material-symbols-outlined text-primary text-3xl">tune</span>
            {hasActiveFilters && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" />
            )}
          </button>
        </div>
      </header>

      {/* Card Stack */}
      <main className="flex-1 min-h-0 flex flex-col justify-center items-center relative w-full max-w-md mx-auto px-4 pb-2">
        <div className="absolute w-[90%] h-[80%] bg-white/50 rounded-[2.5rem] -z-10 translate-y-4 scale-95 shadow-sm border border-slate-200" />

        <div className="relative w-full h-[min(62dvh,620px)] min-h-[440px] md:h-[590px]">
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: missingStackCards }).map((_, placeholderIndex) => {
                const stackIndex = cardsToRender.length + placeholderIndex;
                return (
                  <div
                    key={`deck-placeholder-${stackIndex}`}
                    className="absolute inset-0 flex items-center justify-center px-2"
                    style={{
                      zIndex: 20 - stackIndex,
                      transform: `translateY(${stackIndex * 24}px) scale(${1 - stackIndex * 0.04})`,
                    }}
                  >
                    <div className="h-full w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white/70 shadow-md" />
                  </div>
                );
              })}
            {cardsToRender.map((card, index) => (
              <CardItem
                key={`${card.id}-${index}`}
                index={index}
                isFront={index === 0}
                controls={controls}
                sharedFrontX={frontCardX}
                onFrontControlsMountChange={(mounted) => {
                  frontCardControlsAttachedRef.current = mounted;
                }}
                onSwipe={handleSwipe}
              >
                {cardBody(card, index === 0)}
              </CardItem>
            ))}
          </div>
        </div>

        {showDeckSkeleton && (
          <div className="absolute inset-0 flex items-center justify-center px-4 pb-6">
            <div className="relative h-[min(62dvh,620px)] min-h-[440px] w-full max-w-md">
              <div className="absolute inset-0 flex items-center justify-center px-2">
                <div className="h-full w-full max-w-md rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center px-2" style={{ transform: "translateY(24px) scale(0.96)", zIndex: -1 }}>
                <div className="h-full w-full max-w-md rounded-[2rem] border border-slate-200 bg-white shadow-md" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center px-2" style={{ transform: "translateY(48px) scale(0.92)", zIndex: -2 }}>
                <div className="h-full w-full max-w-md rounded-[2rem] border border-slate-200 bg-white shadow-sm" />
              </div>
              <div className="w-full max-w-md animate-pulse overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-card">
                <div className="relative h-[86%] md:h-[72%] w-full bg-slate-200">
                  <div className="absolute left-4 top-4 h-9 w-24 rounded-full bg-slate-300" />
                  <div className="absolute inset-x-0 top-4 flex justify-center gap-1.5 px-8">
                    <div className="h-1.5 w-6 rounded-full bg-white/80" />
                    <div className="h-1.5 w-2 rounded-full bg-white/60" />
                    <div className="h-1.5 w-2 rounded-full bg-white/60" />
                  </div>
                </div>
                <div className="flex-1 space-y-3 bg-primary px-4 py-3 md:px-6 md:py-5">
                  <div className="space-y-2 border-b border-white/10 pb-3">
                    <div className="h-8 w-40 rounded-full bg-white/20" />
                    <div className="h-3 w-24 rounded-full bg-white/15" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <div className="h-14 rounded-xl bg-white/10" />
                    <div className="h-14 rounded-xl bg-white/10" />
                    <div className="h-14 rounded-xl bg-white/10" />
                  </div>
                  <div className="h-14 rounded-2xl border border-white/10 bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        )}

        {cardsToRender.length === 0 && deckPhase === "terminal_empty" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
            <span className="material-symbols-outlined text-6xl text-gray-300">maps_home_work</span>
            <h3 className="text-xl font-bold text-gray-700">No more listings</h3>
            <p className="text-gray-500">Check back later for new properties.</p>
            <button
              onClick={resetDeck}
              className="mt-4 px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg"
            >
              Reset Deck
            </button>
          </div>
        )}

        {cardsToRender.length === 0 && deckPhase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="material-symbols-outlined text-6xl text-rose-300">wifi_off</span>
            <h3 className="text-xl font-bold text-gray-700">Unable to load listings</h3>
            <p className="text-gray-500">{errorMessage || "Please try again."}</p>
            <button
              onClick={resetDeck}
              className="mt-2 px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg"
            >
              Retry
            </button>
          </div>
        )}
      </main>

      <ExploreTutorial ready={cardsToRender.length > 0 && deckPhase === "ready"} />

      {/* Action Buttons */}
      <div className="flex-none w-full max-w-md mx-auto px-6 pt-3 pb-5 md:pt-6 md:pb-8 grid grid-cols-3 gap-3 md:gap-4 z-30">
        <button
          type="button"
          data-tour="explore-rewind"
          onClick={() => {
            void handleUndoLastSwipe();
          }}
          disabled={!lastSwipe || isSwipeAnimating || deckPhase === "swapping"}
          className="flex h-14 md:h-16 flex-col items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Rewind last swipe"
        >
          <span className="material-symbols-outlined text-[22px] leading-none">undo</span>
          <span className="mt-1 text-[11px] font-semibold tracking-wide">REWIND</span>
        </button>

        <button
          data-tour="explore-pass"
          onClick={() => handleSwipe("left")}
          disabled={isSwipeAnimating || cardsToRender.length === 0 || deckPhase === "swapping"}
          className="flex h-14 md:h-16 flex-col items-center justify-center rounded-2xl border border-slate-300 bg-[#f4f5f7] text-slate-700 shadow-sm transition hover:bg-[#eceff3] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[24px] leading-none">close</span>
          <span className="mt-1 text-[11px] font-semibold tracking-wide">PASS</span>
        </button>

        <button
          data-tour="explore-like"
          onClick={() => handleSwipe("right")}
          disabled={isSwipeAnimating || cardsToRender.length === 0 || deckPhase === "swapping"}
          className="flex h-14 md:h-16 flex-col items-center justify-center rounded-2xl border border-[#bd6448] bg-gradient-to-b from-[#df8968] to-[#c76546] text-white shadow-[0_10px_24px_rgba(176,83,54,0.35)] transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="material-symbols-outlined text-[24px] leading-none">thumb_up</span>
          <span className="mt-1 text-[11px] font-semibold tracking-wide">INTERESTED</span>
        </button>
      </div>

      <BottomNav />

      {/* Filters Drawer */}
      <FilterModal
        isOpen={filtersOpen}
        close={() => setFiltersOpen(false)}
        onApply={applyFilters}
        filters={draftFilters}
        setFilters={setDraftFilters}
        onReset={resetFilters}
        toggleOptions={toggleOptions}
      />

      <style>{`
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </div>
  );
}

type CardItemProps = {
  index: number;
  isFront: boolean;
  controls: ReturnType<typeof useAnimation>;
  sharedFrontX: MotionValue<number>;
  onFrontControlsMountChange?: (mounted: boolean) => void;
  onSwipe: (direction: "left" | "right") => Promise<void>;
  children: ReactNode;
};

function CardItem({
  index,
  isFront,
  controls,
  sharedFrontX,
  onFrontControlsMountChange,
  onSwipe,
  children,
}: CardItemProps) {
  const localX = useMotionValue(0);
  const x = isFront ? sharedFrontX : localX;
  const rotate = useTransform(x, [-220, 220], [-18, 18]);

  // Real-estate decision overlays
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);
  const swipeDepth = useTransform(sharedFrontX, (value) => Math.min(Math.abs(value), 180));
  const promotedScale = useTransform(swipeDepth, [0, 180], [1 - index * 0.04, Math.max(0.92, 1 - Math.max(0, index - 1) * 0.04)]);
  const promotedY = useTransform(swipeDepth, [0, 180], [index * 24, Math.max(0, index - 1) * 24]);

  useEffect(() => {
    if (!isFront) return;
    onFrontControlsMountChange?.(true);
    return () => onFrontControlsMountChange?.(false);
  }, [isFront, onFrontControlsMountChange]);

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    if (!isFront) return;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const directionalSwipe = offset * Math.abs(velocity);

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 390;
    const distanceThreshold = Math.max(100, Math.round(viewportWidth * 0.22));
    const powerThreshold = Math.max(9000, viewportWidth * 34);

    if (offset > distanceThreshold || directionalSwipe > powerThreshold) {
      await onSwipe("right");
      x.set(0);
      return;
    }

    if (offset < -distanceThreshold || directionalSwipe < -powerThreshold) {
      await onSwipe("left");
      x.set(0);
      return;
    }

    // snap back
    x.set(0);
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-2 transform-gpu"
      style={{
        zIndex: isFront ? 50 : 40 - index,
        x,
        rotate,
        scale: isFront ? 1 : promotedScale,
        y: isFront ? 0 : promotedY,
        willChange: isFront ? "transform" : "auto",
      }}
      animate={isFront ? controls : undefined}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragSnapToOrigin
      dragElastic={0.2}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      transition={{ type: "spring", stiffness: 220, damping: 28, mass: 1.05 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
    >
      <div
        className="w-full h-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-card border border-slate-100 flex flex-col cursor-grab active:cursor-grabbing select-none relative touch-pan-y"
      >
        {/* Pass / Interested overlays */}
        {isFront && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="absolute top-6 left-6 z-20">
              <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-extrabold tracking-widest shadow-lg">
                INTERESTED
              </div>
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="absolute top-6 right-6 z-20">
              <div className="px-4 py-2 rounded-xl bg-rose-500 text-white font-extrabold tracking-widest shadow-lg">
                PASS
              </div>
            </motion.div>
          </>
        )}

        {children}
      </div>
    </motion.div>
  );
}

function FilterModal({
  isOpen,
  close,
  onApply,
  filters,
  setFilters,
  onReset,
  toggleOptions,
}: FilterModalProps) {
  if (!isOpen) return null;
  const cityOptions = filters.state ? getCitiesForState(filters.state) : [];

  return (
    <div className="fixed inset-0 z-70 flex">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={close} />

      <div className="relative ml-auto h-[100dvh] w-full max-w-none sm:max-w-[80vw] md:max-w-xs">
        <div className="h-full bg-white shadow-2xl rounded-none sm:rounded-l-3xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
            <button
              onClick={close}
              className="rounded-full p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-active-blue"
            >
              <span className="sr-only">Close panel</span>
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-900 block">State</label>
              <div className="relative">
                <select
                  value={filters.state}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      state: event.target.value,
                      city: "",
                    }))
                  }
                  className="w-full py-3.5 pl-4 pr-10 text-sm font-medium bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-active-blue focus:border-active-blue appearance-none transition-shadow"
                >
                  <option value="">All states</option>
                  {NIGERIA_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="material-symbols-outlined text-gray-500">expand_more</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-900 block">City</label>
              <div className="relative">
                <select
                  value={filters.city}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      city: event.target.value,
                    }))
                  }
                  disabled={!filters.state}
                  className="w-full py-3.5 pl-4 pr-10 text-sm font-medium bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-active-blue focus:border-active-blue appearance-none transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">{filters.state ? "All cities" : "Select a state first"}</option>
                  {cityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="material-symbols-outlined text-gray-500">expand_more</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-gray-900">Budget</label>
                <span className="text-xs font-semibold text-active-blue">
                  ₦{new Intl.NumberFormat("en-NG").format(filters.budget)} /yr
                </span>
              </div>
              <input
                className="w-full h-1.5 bg-gray-200 rounded-lg accent-active-blue focus:ring-0 border-0"
                type="range"
                min={100000}
                max={20000000}
                step={50000}
                value={filters.budget}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    budget: Number(event.target.value),
                  }))
                }
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>₦100k</span>
                <span>₦20m</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-gray-900">Distance</label>
                <span className="text-xs font-semibold text-active-blue">{filters.distance}km</span>
              </div>
              <input
                className="w-full h-1.5 bg-gray-200 rounded-lg accent-active-blue focus:ring-0 border-0"
                type="range"
                min={1}
                max={50}
                value={filters.distance}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    distance: Number(event.target.value),
                  }))
                }
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>1km</span>
                <span>50km</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-900 block">Type of Property</label>
              <div className="relative">
                <select
                  value={filters.propertyType}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      propertyType: event.target.value,
                    }))
                  }
                  className="w-full py-3.5 pl-4 pr-10 text-sm font-medium bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-active-blue focus:border-active-blue appearance-none transition-shadow"
                >
                  <option value="" disabled>
                    Select property type
                  </option>
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="material-symbols-outlined text-gray-500">expand_more</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-900 block">Listing Intent</label>
              <div className="relative">
                <select
                  value={filters.listingIntent}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      listingIntent: event.target.value as "" | "Rent" | "Shortlet",
                    }))
                  }
                  className="w-full py-3.5 pl-4 pr-10 text-sm font-medium bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-active-blue focus:border-active-blue appearance-none transition-shadow"
                >
                  <option value="">All intents</option>
                  <option value="Rent">For Rent</option>
                  <option value="Shortlet">Shortlet</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="material-symbols-outlined text-gray-500">expand_more</span>
                </div>
              </div>
            </div>

            <div className="space-y-5 pt-2 border-t border-gray-50 mt-4">
              {toggleOptions.map((option) => {
                const isActive = filters.toggles[option.key];
                return (
                  <div key={option.key} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          toggles: {
                            ...prev.toggles,
                            [option.key]: !prev.toggles[option.key],
                          },
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition duration-200 ease-in-out ${isActive ? "bg-primary border-transparent" : "bg-gray-200 border-transparent"
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-6 bg-gray-50/50 mt-6 -mx-6">
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl bg-gray-100 px-3 py-3.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-200"
                onClick={onReset}
              >
                Reset
              </button>

              <button
                onClick={onApply}
                className="flex-[2] rounded-xl bg-primary px-3 py-3.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
