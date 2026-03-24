"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useRef } from "react";

import { apiFetch, buildQuery } from "@/lib/api";
import type { Listing } from "@/lib/listings";
import { mapPropertyToListing, type ExploreFilters } from "@/store/useAppStore";
import { useAppStore } from "@/store/useAppStore";

type DeckPhase =
  | "boot_loading"
  | "ready"
  | "prefetching"
  | "swapping"
  | "terminal_empty"
  | "error";

type DeckState = {
  phase: DeckPhase;
  visibleQueue: Listing[];
  bufferQueue: Listing[];
  renderStack: Listing[];
  hasRenderedCards: boolean;
  errorMessage: string | null;
};

type DeckAction =
  | { type: "RESET" }
  | { type: "BOOT_SUCCESS"; visibleQueue: Listing[]; bufferQueue: Listing[] }
  | { type: "BOOT_EMPTY" }
  | { type: "PREFETCH_START" }
  | {
      type: "BUFFER_RESOLVED";
      bufferQueue: Listing[];
    }
  | { type: "SWIPE_COMMITTED"; cardId: string; fallbackQueue?: Listing[] }
  | { type: "ROLLBACK_SWIPE"; listing: Listing }
  | { type: "ERROR"; message: string };

type TenantPrefs = {
  preferredDistance?: number;
  maxCommuteRadius?: number;
  preferredState?: string;
};

type ExploreDeckControllerArgs = {
  authToken: string | null;
  filters: ExploreFilters;
  resetKey: number;
  tenantPrefs?: TenantPrefs | null;
  userLocation: { lat: number; lng: number } | null;
};

type ExploreDeckControllerResult = {
  cardsToRender: Listing[];
  topCardId: string | null;
  phase: DeckPhase;
  hasRenderedCards: boolean;
  errorMessage: string | null;
  commitSwipe: (cardId: string) => void;
  rollbackSwipe: (listing: Listing) => void;
};

type ExploreApiProperty = Parameters<typeof mapPropertyToListing>[0];
type RecycledMatch = {
  id?: string;
  _id?: string;
  property?: ExploreApiProperty | null;
};

const INITIAL_VISIBLE_BATCH_SIZE = 12;
const LOW_WATERMARK = 8;
const initialDeckState: DeckState = {
  phase: "boot_loading",
  visibleQueue: [],
  bufferQueue: [],
  renderStack: [],
  hasRenderedCards: false,
  errorMessage: null,
};

const dedupeListings = (listings: Listing[]) => {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });
};

const mergeUniqueListings = (base: Listing[], incoming: Listing[]) => {
  return dedupeListings([...base, ...incoming]);
};

const splitVisibleAndBuffer = (listings: Listing[]) => ({
  visibleQueue: listings.slice(0, INITIAL_VISIBLE_BATCH_SIZE),
  bufferQueue: listings.slice(INITIAL_VISIBLE_BATCH_SIZE),
});

const buildRenderStack = (visibleQueue: Listing[], bufferQueue: Listing[]) =>
  dedupeListings([...visibleQueue, ...bufferQueue]).slice(0, 3);

const rebuildWithRestoredListing = (state: DeckState, listing: Listing) => {
  const visibleWithout = state.visibleQueue.filter((item) => item.id !== listing.id);
  const bufferWithout = state.bufferQueue.filter((item) => item.id !== listing.id);
  const nextVisibleCombined = [listing, ...visibleWithout];
  const visibleQueue = nextVisibleCombined.slice(0, INITIAL_VISIBLE_BATCH_SIZE);
  const overflow = nextVisibleCombined.slice(INITIAL_VISIBLE_BATCH_SIZE);
  const bufferQueue = dedupeListings([...overflow, ...bufferWithout]);
  return {
    ...state,
    phase: "ready" as const,
    visibleQueue,
    bufferQueue,
    renderStack: buildRenderStack(visibleQueue, bufferQueue),
    hasRenderedCards: true,
    errorMessage: null,
  };
};

function deckReducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case "RESET":
      return initialDeckState;
    case "BOOT_SUCCESS":
      return {
        phase: "ready",
        visibleQueue: action.visibleQueue,
        bufferQueue: action.bufferQueue,
        renderStack: buildRenderStack(action.visibleQueue, action.bufferQueue),
        hasRenderedCards: action.visibleQueue.length > 0,
        errorMessage: null,
      };
    case "BOOT_EMPTY":
      return {
        ...state,
        phase: "terminal_empty",
        visibleQueue: [],
        bufferQueue: [],
        renderStack: [],
        errorMessage: null,
      };
    case "PREFETCH_START":
      if (state.phase === "boot_loading" || state.phase === "terminal_empty") {
        return state;
      }
      return {
        ...state,
        phase: state.visibleQueue.length > 0 ? "prefetching" : "swapping",
      };
    case "BUFFER_RESOLVED": {
      if (action.bufferQueue.length === 0) {
        if (state.visibleQueue.length === 0 && state.bufferQueue.length === 0) {
          return {
            ...state,
            phase: state.hasRenderedCards ? "ready" : "terminal_empty",
          };
        }
        return {
          ...state,
          phase: state.visibleQueue.length > 0 ? "ready" : "swapping",
          renderStack:
            state.visibleQueue.length > 0
              ? buildRenderStack(state.visibleQueue, state.bufferQueue)
              : state.renderStack,
        };
      }

      if (state.visibleQueue.length === 0) {
        const swapped = splitVisibleAndBuffer(action.bufferQueue);
        return {
          ...state,
          phase: "ready",
          visibleQueue: swapped.visibleQueue,
          bufferQueue: swapped.bufferQueue,
          renderStack: buildRenderStack(swapped.visibleQueue, swapped.bufferQueue),
          hasRenderedCards: true,
          errorMessage: null,
        };
      }

      const mergedBufferQueue = mergeUniqueListings(state.bufferQueue, action.bufferQueue);
      return {
        ...state,
        phase: "ready",
        bufferQueue: mergedBufferQueue,
        renderStack: buildRenderStack(state.visibleQueue, mergedBufferQueue),
        errorMessage: null,
      };
    }
    case "SWIPE_COMMITTED": {
      const remainingVisible = state.visibleQueue.filter((listing) => listing.id !== action.cardId);
      if (remainingVisible.length > 0) {
        return {
          ...state,
          visibleQueue: remainingVisible,
          renderStack: buildRenderStack(remainingVisible, state.bufferQueue),
          phase: state.phase === "terminal_empty" ? "terminal_empty" : "ready",
        };
      }

      if (state.bufferQueue.length > 0) {
        const swapped = splitVisibleAndBuffer(state.bufferQueue);
        return {
          ...state,
          phase: "ready",
          visibleQueue: swapped.visibleQueue,
          bufferQueue: swapped.bufferQueue,
          renderStack: buildRenderStack(swapped.visibleQueue, swapped.bufferQueue),
          hasRenderedCards: true,
        };
      }

      if ((action.fallbackQueue?.length ?? 0) > 0) {
        const swapped = splitVisibleAndBuffer(action.fallbackQueue ?? []);
        return {
          ...state,
          phase: "ready",
          visibleQueue: swapped.visibleQueue,
          bufferQueue: swapped.bufferQueue,
          renderStack: buildRenderStack(swapped.visibleQueue, swapped.bufferQueue),
          hasRenderedCards: true,
        };
      }

      return {
        ...state,
        visibleQueue: [],
        renderStack: state.renderStack.filter((listing) => listing.id !== action.cardId),
        phase: "swapping",
      };
    }
    case "ROLLBACK_SWIPE":
      return rebuildWithRestoredListing(state, action.listing);
    case "ERROR":
      return {
        ...state,
        phase: state.hasRenderedCards ? "terminal_empty" : "error",
        visibleQueue: state.hasRenderedCards ? state.visibleQueue : [],
        bufferQueue: state.hasRenderedCards ? state.bufferQueue : [],
        renderStack: state.hasRenderedCards ? state.renderStack : [],
        errorMessage: action.message,
      };
    default:
      return state;
  }
}

const syncListingCache = (listings: Listing[]) => {
  if (listings.length === 0) return;
  useAppStore.setState((state) => ({
    listingsById: {
      ...state.listingsById,
      ...listings.reduce<Record<string, Listing>>((acc, listing) => {
        acc[listing.id] = listing;
        return acc;
      }, {}),
    },
  }));
};

const fetchExploreBatch = async (
  authToken: string,
  filters: ExploreFilters,
  tenantPrefs: TenantPrefs | null | undefined,
  userLocation: { lat: number; lng: number } | null
) => {
  const preferredDistance =
    filters.preferredDistance ??
    (typeof tenantPrefs?.preferredDistance === "number" &&
    Number.isFinite(tenantPrefs.preferredDistance)
      ? tenantPrefs.preferredDistance
      : undefined) ??
    (typeof tenantPrefs?.maxCommuteRadius === "number" &&
    Number.isFinite(tenantPrefs.maxCommuteRadius)
      ? tenantPrefs.maxCommuteRadius
      : undefined);

  const preferredState =
    (typeof filters.state === "string" && filters.state.trim()) ||
    (typeof filters.preferredState === "string" && filters.preferredState.trim()) ||
    (typeof tenantPrefs?.preferredState === "string" && tenantPrefs.preferredState.trim()) ||
    undefined;

  const monthlyBudget =
    filters.budget !== undefined ? Math.round(filters.budget / 12) : undefined;

  const query = buildQuery({
    budget: monthlyBudget,
    distanceKm: filters.distance ?? preferredDistance,
    state: preferredState,
    city: filters.city,
    propertyType: filters.propertyType,
    listingIntent: filters.listingIntent || undefined,
    lat: filters.lat ?? userLocation?.lat,
    lng: filters.lng ?? userLocation?.lng,
    selfCompound: filters.toggles?.selfCompound,
    shortlets: filters.toggles?.shortlets,
    sharedCompound: filters.toggles?.sharedCompound,
    nonOwner: filters.toggles?.nonOwner,
  });

  const data = await apiFetch<ExploreApiProperty[]>(
    `/api/properties/explore?${query}`,
    { token: authToken }
  );

  return (data ?? []).map(mapPropertyToListing);
};

const fetchRecycledBatch = async (authToken: string) => {
  const data = await apiFetch<RecycledMatch[] | { items?: RecycledMatch[]; data?: RecycledMatch[] }>(
    `/api/matches/tenant/recycled?page=1&limit=50&cooldownDays=0`,
    { token: authToken }
  );

  const matches = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
        ? data.data
        : [];

  if (matches.length === 0) {
    return [];
  }

  const recycledMatchIds = matches
    .map((match) => match._id || match.id)
    .filter((id): id is string => Boolean(id));

  if (recycledMatchIds.length > 0) {
    await apiFetch(`/api/matches/recycle-bulk`, {
      method: "POST",
      body: JSON.stringify({ matchIds: recycledMatchIds }),
      token: authToken,
    }).catch(() => null);
  }

  return matches
    .map((match) => (match.property ? mapPropertyToListing(match.property) : null))
    .filter((listing): listing is Listing => Boolean(listing));
};

export function useExploreDeckController({
  authToken,
  filters,
  resetKey,
  tenantPrefs,
  userLocation,
}: ExploreDeckControllerArgs): ExploreDeckControllerResult {
  const [state, dispatch] = useReducer(deckReducer, initialDeckState);
  const requestVersionRef = useRef(0);
  const prefetchInFlightRef = useRef(false);
  const stateRef = useRef(state);
  const consumedIdsRef = useRef(new Set<string>());
  const replayListingsRef = useRef<Listing[]>([]);
  const replayCursorRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const rememberListings = (listings: Listing[]) => {
    replayListingsRef.current = mergeUniqueListings(replayListingsRef.current, listings);
    syncListingCache(listings);
  };

  const resolveNextBuffer = useEffectEvent(async (version: number) => {
    if (!authToken) {
      return { bufferQueue: [] };
    }

    const currentState = stateRef.current;
    const activeIds = new Set([
      ...currentState.visibleQueue.map((listing) => listing.id),
      ...currentState.bufferQueue.map((listing) => listing.id),
    ]);

    const freshListings = dedupeListings(
      (await fetchExploreBatch(authToken, filters, tenantPrefs, userLocation)).filter(
        (listing) =>
          !activeIds.has(listing.id) && !consumedIdsRef.current.has(listing.id)
      )
    );

    if (requestVersionRef.current !== version) {
      return { bufferQueue: [] };
    }

    if (freshListings.length > 0) {
      rememberListings(freshListings);
      return {
        bufferQueue: freshListings,
      };
    }

    const shouldAllowRecycle =
      currentState.visibleQueue.length === 0 && currentState.bufferQueue.length === 0;
    if (!shouldAllowRecycle) {
      return { bufferQueue: [] };
    }

    consumedIdsRef.current.clear();

    const recycledListings = dedupeListings(
      (await fetchRecycledBatch(authToken)).filter(
        (listing) =>
          !activeIds.has(listing.id) && !consumedIdsRef.current.has(listing.id)
      )
    );

    if (requestVersionRef.current !== version) {
      return { bufferQueue: [] };
    }

    if (recycledListings.length > 0) {
      rememberListings(recycledListings);
      return {
        bufferQueue: recycledListings,
      };
    }

    const latestState = stateRef.current;
    const latestActiveIds = new Set([
      ...latestState.visibleQueue.map((listing) => listing.id),
      ...latestState.bufferQueue.map((listing) => listing.id),
    ]);
    const replayCandidates = replayListingsRef.current.filter(
      (listing) =>
        !latestActiveIds.has(listing.id) && !consumedIdsRef.current.has(listing.id)
    );
    if (replayCandidates.length > 0) {
      const offset = replayCursorRef.current % replayCandidates.length;
      const rotatedReplayBatch =
        offset === 0
          ? replayCandidates
          : [...replayCandidates.slice(offset), ...replayCandidates.slice(0, offset)];
      replayCursorRef.current += 1;
      return {
        bufferQueue: rotatedReplayBatch,
      };
    }

    return { bufferQueue: [] };
  });

  useEffect(() => {
    requestVersionRef.current += 1;
    const version = requestVersionRef.current;
    prefetchInFlightRef.current = false;
    consumedIdsRef.current = new Set<string>();
    replayListingsRef.current = [];
    replayCursorRef.current = 0;
    dispatch({ type: "RESET" });

    let active = true;

    const boot = async () => {
      if (!authToken) {
        dispatch({ type: "BOOT_EMPTY" });
        return;
      }

      try {
        const initialListings = dedupeListings(
          await fetchExploreBatch(authToken, filters, tenantPrefs, userLocation)
        );

        if (!active || requestVersionRef.current !== version) return;

        if (initialListings.length > 0) {
          rememberListings(initialListings);
          const split = splitVisibleAndBuffer(initialListings);
          dispatch({
            type: "BOOT_SUCCESS",
            visibleQueue: split.visibleQueue,
            bufferQueue: split.bufferQueue,
          });
          return;
        }

        const recycledListings = dedupeListings(await fetchRecycledBatch(authToken));
        if (!active || requestVersionRef.current !== version) return;

        if (recycledListings.length > 0) {
          rememberListings(recycledListings);
          const split = splitVisibleAndBuffer(recycledListings);
          dispatch({
            type: "BOOT_SUCCESS",
            visibleQueue: split.visibleQueue,
            bufferQueue: split.bufferQueue,
          });
          return;
        }

        dispatch({ type: "BOOT_EMPTY" });
      } catch (error) {
        if (!active || requestVersionRef.current !== version) return;
        const message =
          error instanceof Error ? error.message : "Unable to load listings.";
        dispatch({ type: "ERROR", message });
      }
    };

    void boot();

    return () => {
      active = false;
    };
  }, [authToken, filters, resetKey, tenantPrefs, userLocation]);

  useEffect(() => {
    const shouldPrefetch =
      state.phase !== "boot_loading" &&
      state.phase !== "terminal_empty" &&
      state.phase !== "error" &&
      state.bufferQueue.length <= 2 &&
      state.visibleQueue.length <= LOW_WATERMARK;

    if (!shouldPrefetch || prefetchInFlightRef.current) {
      return;
    }

    prefetchInFlightRef.current = true;
    dispatch({ type: "PREFETCH_START" });
    const version = requestVersionRef.current;

    void resolveNextBuffer(version)
      .then((result) => {
        if (requestVersionRef.current !== version) return;
        dispatch({ type: "BUFFER_RESOLVED", ...result });
      })
      .catch((error) => {
        if (requestVersionRef.current !== version) return;
        const message =
          error instanceof Error ? error.message : "Unable to refresh listings.";
        dispatch({ type: "ERROR", message });
      })
      .finally(() => {
        if (requestVersionRef.current === version) {
          prefetchInFlightRef.current = false;
        }
      });
  }, [state.bufferQueue.length, state.phase, state.visibleQueue.length]);

  const cardsToRender = useMemo(() => state.renderStack, [state.renderStack]);

  const topCardId = cardsToRender[0]?.id ?? null;

  const commitSwipe = (cardId: string) => {
    consumedIdsRef.current.add(cardId);
    dispatch({ type: "SWIPE_COMMITTED", cardId });
  };

  const rollbackSwipe = (listing: Listing) => {
    consumedIdsRef.current.delete(listing.id);
    dispatch({ type: "ROLLBACK_SWIPE", listing });
  };

  return {
    cardsToRender,
    topCardId,
    phase: state.phase,
    hasRenderedCards: state.hasRenderedCards,
    errorMessage: state.errorMessage,
    commitSwipe,
    rollbackSwipe,
  };
}
