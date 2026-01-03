"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listingIds, listingSeed, type Listing } from "@/lib/listings";

type MatchStatus = "TenantLiked" | "LandlordQualified" | "ChatInitiated" | "Dismissed";

export type Match = {
  id: string;
  listingId: string;
  status: MatchStatus;
  matchScore: number;
  timestamp: string;
};

type ThreadMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
};

type Thread = {
  id: string;
  listingId: string;
  participantIds: string[];
  messages: ThreadMessage[];
};

type AppState = {
  listingsById: Record<string, Listing>;
  exploreQueue: string[];
  likedIds: string[];
  passedIds: string[];
  matches: Match[];
  selectedListingId: string | null;
  threadsById: Record<string, Thread>;
  selectedThreadId: string | null;
  setSelectedListingId: (id: string | null) => void;
  likeListing: (listingId: string) => void;
  passListing: (listingId: string) => void;
  advanceQueue: () => void;
  resetExploreQueue: () => void;
  ensureMatchForListing: (listingId: string) => Match;
  ensureThreadForListing: (listingId: string) => string;
};

const listingMap = listingSeed.reduce<Record<string, Listing>>((acc, listing) => {
  acc[listing.id] = listing;
  return acc;
}, {});

const createMatchObject = (listingId: string): Match => ({
  id: `match-${listingId}-${Date.now()}`,
  listingId,
  status: "TenantLiked",
  matchScore: 92,
  timestamp: new Date().toISOString(),
});

const createThreadObject = (listingId: string): Thread => ({
  id: `thread-${listingId}-${Date.now()}`,
  listingId,
  participantIds: [],
  messages: [],
});

const initialQueue = listingIds;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      listingsById: listingMap,
      exploreQueue: initialQueue,
      likedIds: [],
      passedIds: [],
      matches: [],
      selectedListingId: initialQueue[0] ?? null,
      threadsById: {},
      selectedThreadId: null,
      setSelectedListingId: (id) => set({ selectedListingId: id }),
      likeListing: (listingId) =>
        set((state) => {
          if (state.likedIds.includes(listingId)) {
            return {};
          }

          const hasMatch = state.matches.some((match) => match.listingId === listingId);
          const matches = hasMatch
            ? state.matches
            : [...state.matches, createMatchObject(listingId)];

          return {
            likedIds: [...state.likedIds, listingId],
            matches,
            selectedListingId: listingId,
          };
        }),
      passListing: (listingId) =>
        set((state) => {
          if (state.passedIds.includes(listingId)) {
            return {};
          }
          return {
            passedIds: [...state.passedIds, listingId],
            selectedListingId:
              state.exploreQueue.find((id) => id !== listingId) ?? state.selectedListingId,
          };
        }),
      advanceQueue: () =>
        set((state) => {
          const [, ...rest] = state.exploreQueue;
          return {
            exploreQueue: rest,
            selectedListingId: rest[0] ?? state.selectedListingId,
          };
        }),
      resetExploreQueue: () =>
        set(() => ({
          exploreQueue: initialQueue,
          likedIds: [],
          passedIds: [],
          matches: [],
          selectedListingId: initialQueue[0] ?? null,
          threadsById: {},
          selectedThreadId: null,
        })),
      ensureMatchForListing: (listingId) => {
        const state = get();
        const existing = state.matches.find((match) => match.listingId === listingId);
        if (existing) return existing;
        const nextMatch = createMatchObject(listingId);
        set({ matches: [...state.matches, nextMatch] });
        return nextMatch;
      },
      ensureThreadForListing: (listingId) => {
        const state = get();
        const existing = Object.values(state.threadsById).find(
          (thread) => thread.listingId === listingId
        );
        if (existing) {
          set({ selectedThreadId: existing.id });
          return existing.id;
        }

        const nextThread = createThreadObject(listingId);
        set(({ threadsById }) => ({
          threadsById: { ...threadsById, [nextThread.id]: nextThread },
          selectedThreadId: nextThread.id,
        }));
        return nextThread.id;
      },
    }),
    {
      name: "get-a-roof-store",
      partialize: (state) => ({
        listingsById: state.listingsById,
        exploreQueue: state.exploreQueue,
        likedIds: state.likedIds,
        passedIds: state.passedIds,
        matches: state.matches,
        selectedListingId: state.selectedListingId,
        threadsById: state.threadsById,
        selectedThreadId: state.selectedThreadId,
      }),
    }
  )
);
