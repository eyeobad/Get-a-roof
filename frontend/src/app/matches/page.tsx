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
  image: string;
  tags: string[];
  online?: boolean;
  badge?: string;
  lastMessage?: string;
  time?: string;
  unread?: boolean;
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
          lastMessage: summary.lastMessage,
          time: formatTime(summary.lastMessageAt),
          unread: (summary.unreadCount ?? 0) > 0,
        };
      })
      .filter((match): match is Match => Boolean(match));
  }, [matchSummaries, listingsById]);

  const [selectedId, setSelectedId] = useState(matches[0]?.id ?? "");

  useEffect(() => {
    if (!selectedId && matches[0]) {
      setSelectedId(matches[0].id);
    }
  }, [matches, selectedId]);

  const selected = matches.find((m) => m.id === selectedId) ?? matches[0];
  const { effects } = useMotionScheme();
  const tapToken = effects.tap;

  const openChat = (id: string) => {
    setSelectedId(id);
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
                  onClick={() => openChat(m.id)}
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

                    {m.online && (
                      <div className="absolute top-3 right-3 bg-green-500 border-2 border-white w-4 h-4 rounded-full" />
                    )}

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
      <div className="hidden lg:flex h-screen overflow-hidden bg-background-light text-[#0c141d] font-display">
        <aside className="w-[420px] h-full border-r border-black/5 bg-background-light flex flex-col">
          <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md px-6 pt-8 pb-4 border-b border-black/5">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold tracking-tight">Matches</h1>
              <div className="flex items-center gap-1">
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
              Select a match to preview the conversation.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
              {matches.map((m) => {
                const active = m.id === selectedId;
                return (
                  <motion.button
                    key={m.id}
                    onClick={() => openChat(m.id)}
                    whileTap={{ scale: tapToken.scale }}
                    transition={tapToken.transition}
                    className={`w-full text-left rounded-2xl border transition-colors overflow-hidden ${
                      active
                        ? "border-primary bg-white shadow-sm"
                        : "border-black/5 bg-white hover:bg-white/80"
                    }`}
                  >
                  <div className="flex gap-4 p-4">
                    <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-gray-200 shrink-0">
                      <Image
                        src={m.image}
                        alt={m.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                      {m.online && (
                        <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-bold truncate">{m.title}</p>
                          <div className="flex items-center gap-1 text-gray-500">
                            <span className="material-symbols-outlined text-[18px]">
                              location_on
                            </span>
                            <span className="text-sm font-medium truncate">
                              {m.location}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-primary">
                            {m.price}
                          </p>
                          {m.time && (
                            <p className="text-xs text-gray-400 mt-1">{m.time}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 truncate">
                          {m.lastMessage ?? "Tap to open conversation"}
                        </p>
                        {m.unread && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}

            <div className="h-24" />
          </div>

          <BottomNav className="hidden lg:block" />
        </aside>

        <section className="flex-1 h-full bg-white relative overflow-hidden">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-black/5 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-gray-200 shrink-0">
                {selected?.image && (
                  <Image
                    src={selected.image}
                    alt={selected.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
                {selected?.online && (
                  <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold truncate">
                  {selected?.title ?? "Select a match"}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {selected?.location ?? ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Call"
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">call</span>
              </button>
              <button
                aria-label="More"
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">
                  more_vert
                </span>
              </button>
            </div>
          </div>

          <div className="h-[calc(100vh-76px-84px)] overflow-y-auto px-8 py-6 space-y-4 no-scrollbar">
            <div className="max-w-[70%] rounded-2xl bg-[#f3f4f6] px-4 py-3">
              <p className="text-sm text-gray-800">
                Hi! When are you available to view the property?
              </p>
              <p className="text-[11px] text-gray-400 mt-2">10:42 AM</p>
            </div>

            <div className="max-w-[70%] ml-auto rounded-2xl bg-primary px-4 py-3 text-white">
              <p className="text-sm">Iâ€™m available tomorrow afternoon. Does 3pm work?</p>
              <p className="text-[11px] text-white/70 mt-2 text-right">10:44 AM</p>
            </div>

            <div className="max-w-[70%] rounded-2xl bg-[#f3f4f6] px-4 py-3">
              <p className="text-sm text-gray-800">
                Perfect. Iâ€™ll send the address and gate code shortly.
              </p>
              <p className="text-[11px] text-gray-400 mt-2">10:45 AM</p>
            </div>

            <div className="h-20" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-black/5 px-8 py-5">
            <div className="flex items-center gap-3">
              <button
                aria-label="Attach"
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[26px]">
                  attach_file
                </span>
              </button>
              <div className="flex-1 rounded-full border border-black/10 bg-[#f8fafc] px-4 py-3">
                <input
                  placeholder="Type a messageâ€¦"
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
              <button
                aria-label="Send"
                className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center active:scale-95 transition-transform"
              >
                <span
                  className="material-symbols-outlined text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  send
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
