"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
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
  image: string;
  tags: string[];
  badge: string | undefined;
};

export default function MatchesPage() {
  const router = useRouter();
  const matchSummaries = useAppStore((state) => state.matchSummaries);
  const listingsById = useAppStore((state) => state.listingsById);
  const loadMatches = useAppStore((state) => state.loadMatches);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const matches = useMemo(() => {
    return matchSummaries
      .map((summary) => {
        const listing = listingsById[summary.listingId];
        if (!listing) return null;
        return {
          id: summary.id,
          listingId: summary.listingId,
          title: `${listing.bedrooms} Bed ${listing.highlight || "Home"}`,
          location: listing.address,
          price: listing.price,
          image: listing.image,
          tags: [listing.highlight, listing.tag].filter(Boolean),
          badge: summary.matchScore ? `${summary.matchScore}%` : undefined,
        };
      })
      .filter((match): match is Match => Boolean(match));
  }, [matchSummaries, listingsById]);

  const { effects } = useMotionScheme();
  const tapToken = effects.tap;

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
        <div className="flex-1 pb-[90px] overflow-x-hidden">
          <header className="sticky top-0 z-50 bg-background-light/95 backdrop-blur-md px-5 pt-12 pb-4 border-b border-black/5">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]">
                Matches
              </h1>
              <div className="flex items-center gap-2">
                <motion.button
                  aria-label="Search"
                  className="flex items-center justify-center text-[#1A1A1A] p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl">
                    search
                  </span>
                  </motion.button>
                <button
                  aria-label="Filter"
                  className="flex items-center justify-center text-[#1A1A1A] p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl">
                    filter_list
                  </span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 pt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {matches.map((m) => (
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
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
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
                    <div className="flex flex-wrap gap-2 mt-1">
              {m.tags.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1.5 rounded-full bg-[#e7ebf4] text-primary text-sm font-bold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="h-6 w-full" />
          </main>
        </div>

        <BottomNav />
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:flex min-h-screen bg-background-light text-[#0c141d] font-display">
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md px-8 pt-10 pb-5 border-b border-black/5">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-extrabold tracking-tight">Matches</h1>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Search"
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[26px]">
                    search
                  </span>
                </button>
                <button
                  aria-label="Filter"
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[26px]">
                    filter_list
                  </span>
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Tap a match to view the listing details.
            </p>
          </header>

          <main className="flex-1 overflow-y-auto px-8 py-6">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
              {matches.map((m) => (
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
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
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
                    <div className="flex flex-wrap gap-2 mt-1">
                      {m.tags.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1.5 rounded-full bg-[#e7ebf4] text-primary text-sm font-bold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="h-10 w-full" />
          </main>

          <BottomNav className="hidden lg:block" />
        </div>
      </div>
    </>
  );
}
