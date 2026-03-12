"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { useMotionScheme } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";

type Match = {
  id: string;
  listingId: string;
  title: string;
  location: string;
  price: string;
  priceValue: number;
  image: string;
  tags: string[];
  primaryTag: string;
  badge: string | undefined;
  score: number;
};
type TagFacet = {
  label: string;
  count: number;
};

const SKELETON_DELAY_MS = 150;

function MatchesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`match-skeleton-${index}`}
          className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm"
        >
          <div className="aspect-[4/3] animate-pulse bg-slate-200" />
          <div className="space-y-3 p-5">
            <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
            <div className="space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
              <div className="h-8 w-16 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const matchSummaries = useAppStore((state) => state.matchSummaries);
  const listingsById = useAppStore((state) => state.listingsById);
  const loadMatches = useAppStore((state) => state.loadMatches);

  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"latest" | "score" | "priceLow" | "priceHigh">(
    "latest"
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftTagFilter, setDraftTagFilter] = useState("All");
  const [draftSortBy, setDraftSortBy] =
    useState<"latest" | "score" | "priceLow" | "priceHigh">("latest");
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setIsLoadingMatches(true);
    }, SKELETON_DELAY_MS);
    void loadMatches().finally(() => {
      window.clearTimeout(timer);
      if (active) setIsLoadingMatches(false);
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadMatches]);

  useEffect(() => {
    if (!authToken) return;
    const refresh = () => {
      void loadMatches();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [authToken, loadMatches]);

  const matches = useMemo(() => {
    return matchSummaries
      .map((summary) => {
        const listing = listingsById[summary.listingId];
        if (!listing) return null;
        const listingMode = listing.listingIntent === "Shortlet" ? "Shortlet" : "Rent";
        return {
          id: summary.id,
          listingId: summary.listingId,
          title: `${listing.bedrooms} Bed ${listing.highlight || "Home"}`,
          location: listing.address,
          price: listing.price,
          priceValue: Number(listing.price.replace(/[^\d]/g, "")) || 0,
          image: listing.image,
          tags: [listingMode],
          primaryTag: listingMode,
          badge: summary.matchScore ? `${summary.matchScore}%` : undefined,
          score: summary.matchScore ?? 0,
        };
      })
      .filter((match): match is Match => Boolean(match));
  }, [matchSummaries, listingsById]);

  const tagFacets = useMemo<TagFacet[]>(() => {
    const counts = new Map<string, number>();
    matches.forEach((m) => {
      const uniqueTags = Array.from(new Set(m.tags));
      uniqueTags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    const sorted = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
    return [{ label: "All", count: matches.length }, ...sorted];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = matches.filter((m) => {
      const textHit =
        !query ||
        m.title.toLowerCase().includes(query) ||
        m.location.toLowerCase().includes(query) ||
        m.tags.some((tag) => tag.toLowerCase().includes(query));
      const tagHit = tagFilter === "All" || m.tags.includes(tagFilter);
      return textHit && tagHit;
    });
    if (sortBy === "score") return [...next].sort((a, b) => b.score - a.score);
    if (sortBy === "priceLow") return [...next].sort((a, b) => a.priceValue - b.priceValue);
    if (sortBy === "priceHigh") return [...next].sort((a, b) => b.priceValue - a.priceValue);
    return next;
  }, [matches, searchQuery, tagFilter, sortBy]);

  const { effects } = useMotionScheme();
  const tapToken = effects.tap;
  const hasActiveFilters = tagFilter !== "All" || sortBy !== "latest";

  const openFilterPanel = () => {
    setDraftTagFilter(tagFilter);
    setDraftSortBy(sortBy);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setTagFilter(draftTagFilter);
    setSortBy(draftSortBy);
    setIsFilterOpen(false);
  };

  const openMatch = (id: string) => {
    const match = matches.find((item) => item.id === id);
    if (match?.listingId) {
      router.push(`/property-details/${match.listingId}`);
    }
  };

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden min-h-screen bg-background-light text-[#0c141d] font-display antialiased flex flex-col">
        <div className="flex-1 pb-[110px] overflow-x-hidden">
          <header className="sticky top-0 z-[70] bg-background-light/95 backdrop-blur-md px-5 pt-12 pb-4 border-b border-black/5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">
                Matches
              </h1>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Search"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    isSearchOpen
                      ? "bg-primary/10 text-primary"
                      : "text-primary hover:bg-black/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">search</span>
                </button>
                <button
                  aria-label="Filter"
                  onClick={openFilterPanel}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    hasActiveFilters
                      ? "bg-primary/10 text-primary"
                      : "text-primary hover:bg-black/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">tune</span>
                  {hasActiveFilters && (
                    <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" />
                  )}
                </button>
              </div>
            </div>
            {isSearchOpen && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 shadow-sm">
                <span className="material-symbols-outlined text-[20px] text-gray-400">search</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search matches..."
                  className="h-8 flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchOpen(false);
                  }}
                  className="rounded-full p-1 text-gray-500 hover:bg-black/5"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
            {hasActiveFilters && (
              <p className="mt-2 text-xs font-medium text-primary">
                Active: {tagFilter !== "All" ? `Tag: ${tagFilter}` : "All tags"} •{" "}
                {sortBy === "latest"
                  ? "Latest"
                  : sortBy === "score"
                    ? "Top Score"
                    : sortBy === "priceLow"
                      ? "Price Low"
                      : "Price High"}
              </p>
            )}
          </header>

          <main className="relative z-0 flex-1 px-5 pt-6 space-y-5">
            {isLoadingMatches ? (
              <MatchesSkeleton />
            ) : filteredMatches.length === 0 ? (
              <div className="rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {matches.length === 0 ? "No matches yet" : "No results"}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {matches.length === 0
                    ? "Like listings in Explore to see them here."
                    : "Try a different search or filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredMatches.map((m) => (
                  <motion.button
                    key={m.id}
                    onClick={() => openMatch(m.id)}
                    whileTap={{ scale: tapToken.scale }}
                    transition={tapToken.transition}
                    className="text-left bg-white rounded-[24px] overflow-hidden shadow-sm border border-black/5 flex flex-col active:scale-[0.98] transition-transform duration-200"
                  >
                    <div className="relative aspect-[4/3] bg-gray-200">
                      <Image
                        src={m.image}
                        alt={m.title}
                        fill
                        sizes="(max-width: 1024px) 90vw, 420px"
                        className="object-cover"
                      />

                      {m.badge && (
                        <div className="absolute right-3 top-3 bg-primary/90 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-white text-sm font-semibold">
                            {m.badge}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-3">
                      <p className="text-primary font-extrabold text-xl">{m.price}</p>
                      <div>
                        <h3 className="text-[#1A1A1A] font-bold text-xl leading-tight mb-1">
                          {m.title}
                        </h3>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="material-symbols-outlined text-[20px]">
                            location_on
                          </span>
                          <span className="text-lg font-medium truncate">
                            {m.location}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {m.tags.length ? (
                          m.tags.slice(0, 2).map((tag) => (
                            <span
                              key={`${m.id}-${tag}`}
                              className="inline-flex items-center rounded-full bg-[#eaf1ff] px-3 py-1.5 text-sm font-semibold text-primary"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[#eaf1ff] px-3 py-1.5 text-sm font-semibold text-primary">
                            {m.primaryTag}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="h-6 w-full" />
          </main>
        </div>

        <BottomNav className="fixed bottom-0 left-0 right-0 z-[70]" />
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:flex min-h-screen bg-background-light text-[#0c141d] font-display">
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md px-8 pt-10 pb-5 border-b border-black/5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">Matches</h1>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Search"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    isSearchOpen
                      ? "bg-primary/10 text-primary"
                      : "text-primary hover:bg-black/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">search</span>
                </button>
                <button
                  aria-label="Filter"
                  onClick={openFilterPanel}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    hasActiveFilters
                      ? "bg-primary/10 text-primary"
                      : "text-primary hover:bg-black/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">tune</span>
                  {hasActiveFilters && (
                    <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" />
                  )}
                </button>
              </div>
            </div>
            {isSearchOpen && (
              <div className="mt-3 flex max-w-xl items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 shadow-sm">
                <span className="material-symbols-outlined text-[20px] text-gray-400">search</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search matches..."
                  className="h-8 flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchOpen(false);
                  }}
                  className="rounded-full p-1 text-gray-500 hover:bg-black/5"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Tap a match to view the listing details.
            </p>
            {hasActiveFilters && (
              <p className="mt-1 text-xs font-medium text-primary">
                Active: {tagFilter !== "All" ? `Tag: ${tagFilter}` : "All tags"} •{" "}
                {sortBy === "latest"
                  ? "Latest"
                  : sortBy === "score"
                    ? "Top Score"
                    : sortBy === "priceLow"
                      ? "Price Low"
                      : "Price High"}
              </p>
            )}
          </header>

          <main className="flex-1 overflow-y-auto px-8 py-6">
            {isLoadingMatches ? (
              <MatchesSkeleton />
            ) : filteredMatches.length === 0 ? (
              <div className="rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
                <p className="text-xl font-bold text-[#1A1A1A]">
                  {matches.length === 0 ? "No matches yet" : "No results"}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {matches.length === 0
                    ? "Like listings in Explore to see them here."
                    : "Try a different search or filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredMatches.map((m) => (
                  <motion.button
                    key={m.id}
                    onClick={() => openMatch(m.id)}
                    whileTap={{ scale: tapToken.scale }}
                    transition={tapToken.transition}
                    className="text-left bg-white rounded-[24px] overflow-hidden shadow-sm border border-black/5 flex flex-col active:scale-[0.98] transition-transform duration-200"
                  >
                    <div className="relative aspect-[4/3] bg-gray-200">
                      <Image
                        src={m.image}
                        alt={m.title}
                        fill
                        sizes="(max-width: 1280px) 45vw, 420px"
                        className="object-cover"
                      />

                      {m.badge && (
                        <div className="absolute right-3 top-3 bg-primary/90 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-white text-sm font-semibold">
                            {m.badge}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-3">
                      <p className="text-primary font-extrabold text-xl">{m.price}</p>
                      <div>
                        <h3 className="text-[#1A1A1A] font-bold text-xl leading-tight mb-1">
                          {m.title}
                        </h3>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="material-symbols-outlined text-[20px]">
                            location_on
                          </span>
                          <span className="text-lg font-medium truncate">
                            {m.location}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {m.tags.length ? (
                          m.tags.slice(0, 2).map((tag) => (
                            <span
                              key={`${m.id}-${tag}`}
                              className="inline-flex items-center rounded-full bg-[#eaf1ff] px-3 py-1.5 text-sm font-semibold text-primary"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[#eaf1ff] px-3 py-1.5 text-sm font-semibold text-primary">
                            {m.primaryTag}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="h-10 w-full" />
          </main>

          <BottomNav className="hidden lg:block" />
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-4 lg:items-center">
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Filter Matches</h2>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-black/5"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Tag
              </label>
              <p className="text-xs text-gray-500">
                Filter by listing type/highlight tag.
              </p>
              <div className="flex flex-wrap gap-2">
                {tagFacets.map((tag) => {
                  const selected = draftTagFilter === tag.label;
                  return (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => setDraftTagFilter(tag.label)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-black/10 bg-white text-gray-600 hover:bg-black/5"
                      }`}
                    >
                      <span>{tag.label}</span>
                      <span className="text-[11px] opacity-70">({tag.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Sort</label>
              <div className="relative">
                <select
                  value={draftSortBy}
                  onChange={(event) =>
                    setDraftSortBy(
                      event.target.value as "latest" | "score" | "priceLow" | "priceHigh"
                    )
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-12 text-sm outline-none focus:border-primary"
                >
                  <option value="latest">Latest</option>
                  <option value="score">Top Score</option>
                  <option value="priceLow">Price Low</option>
                  <option value="priceHigh">Price High</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[18px] text-gray-500">
                  expand_more
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftTagFilter("All");
                  setDraftSortBy("latest");
                  setTagFilter("All");
                  setSortBy("latest");
                  setIsFilterOpen(false);
                }}
                className="h-11 flex-1 rounded-xl border border-black/10 bg-white text-sm font-semibold"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
