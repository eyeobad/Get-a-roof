"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";

import BottomNav from "@/components/BottomNav";
import { useAppStore } from "@/store/useAppStore";
import type { Listing } from "@/lib/listings";
import { PROPERTY_TYPE_OPTIONS } from "@/lib/propertyTypes";

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
  propertyType: string;
  listingIntent: "" | "Rent" | "Shortlet";
  toggles: Record<string, boolean>;
};

const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

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

  const defaultFilters = useMemo<ExploreFilterState>(
    () => ({
      budget: 100000,
      distance: 15,
      propertyType: "",
      listingIntent: "",
      toggles: toggleOptions.reduce<Record<string, boolean>>(
        (acc, option) => ({ ...acc, [option.key]: false }),
        {}
      ),
    }),
    [toggleOptions]
  );

  const [filters, setFilters] = useState<ExploreFilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<ExploreFilterState>(defaultFilters);
  const [cardImageIndexes, setCardImageIndexes] = useState<Record<string, number>>({});

  const hasActiveFilters = useMemo(() => {
    if (
      filters.budget !== defaultFilters.budget ||
      filters.distance !== defaultFilters.distance ||
      filters.propertyType !== defaultFilters.propertyType ||
      filters.listingIntent !== defaultFilters.listingIntent
    ) {
      return true;
    }
    return Object.values(filters.toggles).some(Boolean);
  }, [filters, defaultFilters]);

  const exploreQueue = useAppStore((state) => state.exploreQueue);
  const listingsById = useAppStore((state) => state.listingsById);
  const likeListing = useAppStore((state) => state.likeListing);
  const passListing = useAppStore((state) => state.passListing);
  const advanceQueue = useAppStore((state) => state.advanceQueue);
  const resetExploreQueue = useAppStore((state) => state.resetExploreQueue);
  const setSelectedListingId = useAppStore((state) => state.setSelectedListingId);
  const loadExploreListings = useAppStore((state) => state.loadExploreListings);
  const captureUserLocation = useAppStore((state) => state.captureUserLocation);

  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);

  const controls = useAnimation();

  const visibleCards = useMemo(() => {
    return exploreQueue
      .slice(0, 3)
      .map((id) => listingsById[id])
      .filter((listing): listing is Listing => Boolean(listing));
  }, [exploreQueue, listingsById]);

  const resetDeck = () => {
    const next = {
      ...defaultFilters,
      toggles: { ...defaultFilters.toggles },
    };
    setDraftFilters(next);
    setFilters(next);
    setCardImageIndexes({});
    resetExploreQueue();
    controls.set({ x: 0, rotate: 0, opacity: 1 });
    setIsSwipeAnimating(false);
    void loadExploreListings(next);
  };

  const applyFilters = () => {
    const nextFilters = {
      ...draftFilters,
      toggles: { ...draftFilters.toggles },
    };
    setFilters(nextFilters);
    resetExploreQueue();
    void loadExploreListings(nextFilters);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    const next = {
      ...defaultFilters,
      toggles: { ...defaultFilters.toggles },
    };
    setDraftFilters(next);
    setFilters(next);
    resetExploreQueue();
    void loadExploreListings(next);
    setFiltersOpen(false);
  };

  useEffect(() => {
    void captureUserLocation();
  }, [captureUserLocation]);

  useEffect(() => {
    void loadExploreListings({
      budget: filters.budget,
      distance: filters.distance,
      propertyType: filters.propertyType,
      listingIntent: filters.listingIntent,
      toggles: filters.toggles,
    });
  }, [loadExploreListings, filters]);

  const handleSwipe = async (direction: "left" | "right") => {
    if (isSwipeAnimating || visibleCards.length === 0) return;

    const topListing = visibleCards[0];
    if (!topListing) return;

    setIsSwipeAnimating(true);

    await controls.start({
      x: direction === "left" ? -420 : 420,
      rotate: direction === "left" ? -18 : 18,
      opacity: 0,
      transition: { duration: 0.35 },
    });

    if (direction === "right") {
      likeListing(topListing.id);
      setSelectedListingId(topListing.id);
      router.push(`/property-details/${topListing.id}`);
    } else {
      passListing(topListing.id);
    }

    advanceQueue();

    controls.set({ x: 0, rotate: 0, opacity: 1 });
    setIsSwipeAnimating(false);
  };

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

  const cardBody = (card: Listing) => {
    const intentLabel = card.listingIntent === "Shortlet" ? "SHORTLET" : "FOR RENT";
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
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeImageIndex ? "w-6 bg-white" : "w-2 bg-white/50"
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

      <div className="flex-1 bg-primary text-white px-4 py-3 md:px-6 md:py-5 flex flex-col justify-between gap-2.5 md:gap-4 pointer-events-none">
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

        <div className="flex items-start gap-2 md:gap-3">
          <span className="material-symbols-outlined text-xl md:text-3xl mt-0.5 text-terracotta shrink-0">
            location_on
          </span>

          <div className="flex flex-col gap-1">
            <p className="text-[13px] md:text-base font-semibold leading-snug opacity-95">{card.address}</p>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1 w-fit border border-white/10 backdrop-blur-sm">
              <span className="material-symbols-outlined text-sm">villa</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-90">
                {intentLabel}
              </span>
            </div>
          </div>
        </div>
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
            onClick={() => {
              setDraftFilters(filters);
              setFiltersOpen(true);
            }}
            className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
              hasActiveFilters ? "bg-primary/10 text-primary" : "hover:bg-black/5"
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

        <div className="relative w-full h-[min(68dvh,680px)] min-h-[500px] md:h-[650px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence>
              {visibleCards.map((card, index) => (
                <CardItem
                  key={card.id}
                  index={index}
                  isFront={index === 0}
                  controls={controls}
                  onSwipe={handleSwipe}
                >
                  {cardBody(card)}
                </CardItem>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {exploreQueue.length === 0 && (
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
      </main>

      {/* Action Buttons */}
      <div className="flex-none w-full max-w-md mx-auto px-6 pt-5 pb-5 md:pt-4 md:pb-8 grid grid-cols-2 gap-4 md:gap-6 z-30">
        <button
          onClick={() => handleSwipe("left")}
          disabled={isSwipeAnimating || visibleCards.length === 0}
          className="flex items-center justify-center gap-2 h-16 md:h-20 rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors shadow-sm active:scale-95 duration-150 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-3xl">close</span>
          <span className="text-lg font-bold tracking-wide">PASS</span>
        </button>

        <button
          onClick={() => handleSwipe("right")}
          disabled={isSwipeAnimating || visibleCards.length === 0}
          className="flex items-center justify-center h-16 md:h-20 bg-[#D87C5A] rounded-full text-white hover:brightness-110 transition-all shadow-md active:scale-95 duration-150 ring-4 ring-terracotta/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-[18px] font-bold tracking-wide">INTERESTED</span>
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
  onSwipe: (direction: "left" | "right") => Promise<void>;
  children: ReactNode;
};

function CardItem({ index, isFront, controls, onSwipe, children }: CardItemProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-18, 18]);

  // NEW: premium swipe overlays
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const power = swipePower(offset, velocity);

    const distanceThreshold = 120;
    const powerThreshold = 900;

    if (offset > distanceThreshold || power > powerThreshold) {
      await onSwipe("right");
      x.set(0);
      return;
    }

    if (offset < -distanceThreshold || power > powerThreshold) {
      await onSwipe("left");
      x.set(0);
      return;
    }

    // snap back
    x.set(0);
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-2"
      style={{
        zIndex: isFront ? 50 : 40 - index,
        x,
        rotate,
        scale: isFront ? 1 : 1 - index * 0.04,
        y: isFront ? 0 : index * 24,
        willChange: "transform",
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
      <div className="w-full h-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-card border border-slate-100 flex flex-col cursor-grab active:cursor-grabbing select-none relative touch-pan-y">
        {/* NEW: Like / Nope overlays */}
        {isFront && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="absolute top-6 left-6 z-20">
              <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-extrabold tracking-widest shadow-lg">
                LIKE
              </div>
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="absolute top-6 right-6 z-20">
              <div className="px-4 py-2 rounded-xl bg-rose-500 text-white font-extrabold tracking-widest shadow-lg">
                NOPE
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
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition duration-200 ease-in-out ${
                        isActive ? "bg-primary border-transparent" : "bg-gray-200 border-transparent"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          isActive ? "translate-x-5" : "translate-x-0"
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
