"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listingIds, listingSeed, type Listing } from "@/lib/listings";
import { apiFetch, buildQuery } from "@/lib/api";

type MatchStatus = "TenantLiked" | "LandlordQualified" | "ChatInitiated" | "Dismissed";

export type MatchSummary = {
  id: string;
  listingId: string;
  status: MatchStatus;
  matchScore?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

export type ConversationSummary = {
  id: string;
  listingId?: string;
  title: string;
  preview?: string;
  time?: string;
  image?: string;
  unread?: boolean;
  tenantId?: string;
  landlordId?: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
};

type Thread = {
  id: string;
  listingId: string;
  participantIds: string[];
  messages: ChatMessage[];
};

type ExploreFilters = {
  budget?: number;
  distance?: number;
  apartmentType?: string;
  toggles?: Record<string, boolean>;
  lat?: number;
  lng?: number;
};

type AppState = {
  listingsById: Record<string, Listing>;
  exploreQueue: string[];
  likedIds: string[];
  passedIds: string[];
  matchSummaries: MatchSummary[];
  mapMatches: Listing[];
  selectedListingId: string | null;
  threadsById: Record<string, Thread>;
  selectedThreadId: string | null;
  conversations: ConversationSummary[];
  messagesByMatch: Record<string, ChatMessage[]>;
  authToken: string | null;
  userId: string | null;
  setSelectedListingId: (id: string | null) => void;
  setAuth: (token: string, userId: string) => void;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<{ accessToken: string; user: any } | null>;
  registerTenant: (payload: {
    firstName?: string;
    lastName?: string;
    email: string;
    phoneNumber?: string;
    password: string;
  }) => Promise<any>;
  sendEmailOtp: (userId: string) => Promise<any>;
  sendPhoneOtp: (userId: string) => Promise<any>;
  verifyEmailOtp: (userId: string, otp: string) => Promise<any>;
  verifyPhoneOtp: (userId: string, otp: string) => Promise<any>;
  requestPasswordReset: (email: string) => Promise<{ token?: string } | null>;
  resetPassword: (token: string, password: string) => Promise<any>;
  fetchUserProfile: () => Promise<any>;
  updateUser: (payload: Record<string, unknown>) => Promise<any>;
  updatePreferences: (payload: { tenant?: Record<string, unknown>; landlord?: Record<string, unknown> }) => Promise<any>;
  likeListing: (listingId: string) => Promise<void>;
  unlikeListing: (listingId: string) => Promise<void>;
  toggleLikeListing: (listingId: string) => Promise<void>;
  passListing: (listingId: string) => Promise<void>;
  advanceQueue: () => void;
  resetExploreQueue: () => void;
  ensureMatchForListing: (listingId: string) => Promise<void>;
  ensureThreadForListing: (listingId: string) => Promise<string | null>;
  loadExploreListings: (filters?: ExploreFilters) => Promise<void>;
  loadMapMatches: (filters?: ExploreFilters) => Promise<void>;
  loadMatches: () => Promise<void>;
  loadConversations: (options?: { limit?: number; offset?: number }) => Promise<void>;
  loadMessagesForMatch: (matchId: string, options?: { limit?: number; before?: string }) => Promise<void>;
  sendMessage: (matchId: string, receiverId: string, content: string) => Promise<void>;
  markMatchRead: (matchId: string) => Promise<void>;
  fetchPropertyById: (listingId: string) => Promise<void>;
};

const listingMap = listingSeed.reduce<Record<string, Listing>>((acc, listing) => {
  acc[listing.id] = listing;
  return acc;
}, {});

const initialQueue = listingIds;

const isMongoId = (value?: string | null) =>
  Boolean(value && /^[a-f\d]{24}$/i.test(value));

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "$0";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value}`;
  }
};

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return "0";
  return new Intl.NumberFormat("en-US").format(value);
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const mapPropertyToListing = (property: any): Listing => {
  const addressParts = [
    property?.address?.street,
    property?.address?.city,
    property?.address?.state,
    property?.address?.zip,
  ].filter(Boolean);

  const address = addressParts.join(", ");

  const bedrooms = property?.bedCount ?? 0;
  const bathrooms = property?.bathCount ?? 0;
  const sqftValue = property?.sqFt ?? 0;

  return {
    id: property?._id ?? "",
    image: property?.images?.[0] ?? "/hero.png",
    price: formatCurrency(property?.monthlyPrice),
    period: "/mo",
    stats: [
      { icon: "bed", label: `${bedrooms} Beds` },
      { icon: "bathtub", label: `${bathrooms} Baths` },
      { icon: "square_foot", label: `${formatNumber(sqftValue)} sqft` },
    ],
    address: address || property?.neighborhood || "",
    highlight: property?.propertyType ?? "Listing",
    tag: property?.status ?? "Listing",
    alt: property?.propertyType ?? "Property",
    neighborhood: property?.neighborhood ?? property?.address?.city ?? "",
    bedrooms,
    bathrooms,
    sqft: formatNumber(sqftValue),
    lat: property?.address?.lat ?? 0,
    lng: property?.address?.lng ?? 0,
    description: property?.description ?? "",
  };
};

const createThreadObject = (listingId: string, threadId: string): Thread => ({
  id: threadId,
  listingId,
  participantIds: [],
  messages: [],
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      listingsById: listingMap,
      exploreQueue: initialQueue,
      likedIds: [],
      passedIds: [],
      matchSummaries: [],
      mapMatches: [],
      selectedListingId: initialQueue[0] ?? null,
      threadsById: {},
      selectedThreadId: null,
      conversations: [],
      messagesByMatch: {},
      authToken: null,
      userId: null,
      setSelectedListingId: (id) => set({ selectedListingId: id }),
      setAuth: (token, userId) => set({ authToken: token, userId }),
      clearAuth: () => set({ authToken: null, userId: null }),
      login: async (email, password) => {
        const response = await apiFetch<any>(`/api/auth/login`, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (!response?.accessToken || !response?.user) {
          return null;
        }

        const userId = response.user.id || response.user._id;
        if (userId) {
          set({ authToken: response.accessToken, userId });
        }
        return response;
      },
      registerTenant: async (payload) => {
        return apiFetch(`/api/users`, {
          method: "POST",
          body: JSON.stringify({ ...payload, role: "Tenant" }),
        });
      },
      sendEmailOtp: async (userId) => {
        return apiFetch(`/api/auth/send-email-otp`, {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
      },
      sendPhoneOtp: async (userId) => {
        return apiFetch(`/api/auth/send-phone-otp`, {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
      },
      verifyEmailOtp: async (userId, otp) => {
        return apiFetch(`/api/auth/verify-email-otp`, {
          method: "POST",
          body: JSON.stringify({ userId, otp }),
        });
      },
      verifyPhoneOtp: async (userId, otp) => {
        return apiFetch(`/api/auth/verify-phone-otp`, {
          method: "POST",
          body: JSON.stringify({ userId, otp }),
        });
      },
      requestPasswordReset: async (email) => {
        return apiFetch(`/api/auth/request-password-reset`, {
          method: "POST",
          body: JSON.stringify({ email }),
        });
      },
      resetPassword: async (token, password) => {
        return apiFetch(`/api/auth/reset-password`, {
          method: "POST",
          body: JSON.stringify({ token, password }),
        });
      },
      fetchUserProfile: async () => {
        const state = get();
        if (!state.authToken || !state.userId) return null;
        return apiFetch(`/api/users/${state.userId}`, {
          token: state.authToken,
        });
      },
      updateUser: async (payload) => {
        const state = get();
        if (!state.authToken || !state.userId) return null;
        return apiFetch(`/api/users/${state.userId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          token: state.authToken,
        });
      },
      updatePreferences: async (payload) => {
        const state = get();
        if (!state.authToken || !state.userId) return null;
        return apiFetch(`/api/users/${state.userId}/preferences`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          token: state.authToken,
        });
      },
      likeListing: async (listingId) => {
        const state = get();
        if (state.likedIds.includes(listingId)) return;

        set({
          likedIds: [...state.likedIds, listingId],
          selectedListingId: listingId,
        });

        if (state.authToken && state.userId && isMongoId(listingId)) {
          await apiFetch(`/api/users/${state.userId}/saved-properties`, {
            method: "POST",
            body: JSON.stringify({ propertyId: listingId }),
            token: state.authToken,
          });
        }
      },
      unlikeListing: async (listingId) => {
        const state = get();
        set({
          likedIds: state.likedIds.filter((id) => id !== listingId),
        });

        if (state.authToken && state.userId && isMongoId(listingId)) {
          await apiFetch(`/api/users/${state.userId}/saved-properties/${listingId}`, {
            method: "DELETE",
            token: state.authToken,
          });
        }
      },
      toggleLikeListing: async (listingId) => {
        const state = get();
        if (state.likedIds.includes(listingId)) {
          await state.unlikeListing(listingId);
        } else {
          await state.likeListing(listingId);
        }
      },
      passListing: async (listingId) => {
        const state = get();
        if (state.passedIds.includes(listingId)) return;

        set({
          passedIds: [...state.passedIds, listingId],
          selectedListingId:
            state.exploreQueue.find((id) => id !== listingId) ?? state.selectedListingId,
        });

        if (state.authToken && isMongoId(listingId)) {
          await apiFetch(`/api/matches`, {
            method: "POST",
            body: JSON.stringify({ propertyId: listingId, tenantLiked: false }),
            token: state.authToken,
          });
        }
      },
      advanceQueue: () =>
        set((state) => {
          const [, ...rest] = state.exploreQueue;
          return {
            exploreQueue: rest,
            selectedListingId: rest[0] ?? state.selectedListingId,
          };
        }),
      resetExploreQueue: () =>
        set((state) => ({
          exploreQueue: Object.keys(state.listingsById),
          likedIds: [],
          passedIds: [],
          matchSummaries: [],
          selectedListingId: Object.keys(state.listingsById)[0] ?? null,
          threadsById: {},
          selectedThreadId: null,
        })),
      ensureMatchForListing: async (listingId) => {
        const state = get();
        if (!state.authToken || !isMongoId(listingId)) return;
        await apiFetch(`/api/matches`, {
          method: "POST",
          body: JSON.stringify({ propertyId: listingId, tenantLiked: true }),
          token: state.authToken,
        });
      },
      ensureThreadForListing: async (listingId) => {
        const state = get();
        if (!state.authToken || !isMongoId(listingId)) {
          return null;
        }
        const response = await apiFetch<{ matchId: string }>(`/api/chat/start`, {
          method: "POST",
          body: JSON.stringify({ propertyId: listingId }),
          token: state.authToken,
        });

        if (!response?.matchId) return null;

        const thread = createThreadObject(listingId, response.matchId);
        set(({ threadsById }) => ({
          threadsById: { ...threadsById, [thread.id]: thread },
          selectedThreadId: thread.id,
        }));

        return response.matchId;
      },
      loadExploreListings: async (filters) => {
        const state = get();
        if (!state.authToken) {
          set({ listingsById: listingMap, exploreQueue: initialQueue });
          return;
        }
        const query = buildQuery({
          budget: filters?.budget,
          distanceKm: filters?.distance,
          apartmentType: filters?.apartmentType,
          lat: filters?.lat,
          lng: filters?.lng,
          selfCompound: filters?.toggles?.selfCompound,
          shortlets: filters?.toggles?.shortlets,
          sharedCompound: filters?.toggles?.sharedCompound,
          nonOwner: filters?.toggles?.nonOwner,
        });

        const data = await apiFetch<any[]>(`/api/properties/explore?${query}`, {
          token: state.authToken,
        });

        const listings = (data ?? []).map(mapPropertyToListing);
        const nextMap = listings.reduce<Record<string, Listing>>((acc, listing) => {
          acc[listing.id] = listing;
          return acc;
        }, {});

        const queue = listings.map((listing) => listing.id);

        set({
          listingsById: nextMap,
          exploreQueue: queue,
          selectedListingId: queue[0] ?? null,
        });
      },
      loadMapMatches: async (filters) => {
        const state = get();
        if (!state.authToken) {
          set({ mapMatches: [] });
          return;
        }
        const query = buildQuery({
          budget: filters?.budget,
          distanceKm: filters?.distance,
          apartmentType: filters?.apartmentType,
          lat: filters?.lat,
          lng: filters?.lng,
          selfCompound: filters?.toggles?.selfCompound,
          shortlets: filters?.toggles?.shortlets,
          sharedCompound: filters?.toggles?.sharedCompound,
          nonOwner: filters?.toggles?.nonOwner,
        });

        const data = await apiFetch<any[]>(`/api/properties/matches/map?${query}`, {
          token: state.authToken,
        });
        const listings = (data ?? []).map(mapPropertyToListing);
        set((prev) => {
          const nextMap = { ...prev.listingsById };
          listings.forEach((listing) => {
            nextMap[listing.id] = listing;
          });
          return { mapMatches: listings, listingsById: nextMap };
        });
      },
      loadMatches: async () => {
        const state = get();
        if (!state.authToken) return;
        const data = await apiFetch<any[]>(`/api/matches/tenant`, {
          token: state.authToken,
        });

        const summaries = (data ?? []).map((match) => {
          const listing = match.property ? mapPropertyToListing(match.property) : null;
          if (listing) {
            set((prev) => ({
              listingsById: { ...prev.listingsById, [listing.id]: listing },
            }));
          }
          return {
            id: match._id,
            listingId: listing?.id ?? match.propertyId,
            status: match.status,
            matchScore: match.matchScore,
            lastMessage: match.lastMessage?.content,
            lastMessageAt: match.lastMessage?.timestamp,
            unreadCount: match.unreadCount ?? 0,
          } as MatchSummary;
        });

        set({ matchSummaries: summaries });
      },
      loadConversations: async (options) => {
        const state = get();
        if (!state.authToken) return;
        const query = buildQuery({
          limit: options?.limit,
          offset: options?.offset,
        });
        const data = await apiFetch<any[]>(`/api/chat/conversations?${query}`, {
          token: state.authToken,
        });

        const conversations = (data ?? []).map((item) => {
          const listing = item.property ? mapPropertyToListing(item.property) : null;
          if (listing) {
            set((prev) => ({
              listingsById: { ...prev.listingsById, [listing.id]: listing },
            }));
          }
          const title = listing?.address || listing?.neighborhood || "Conversation";
          return {
            id: item.matchId,
            listingId: listing?.id,
            title,
            preview: item.lastMessage?.content ?? "Start a conversation",
            time: formatTime(item.lastMessage?.timestamp),
            image: listing?.image,
            unread: (item.unreadCount ?? 0) > 0,
            tenantId: item.tenantId,
            landlordId: item.property?.landlordId,
          } as ConversationSummary;
        });

        set({ conversations });
      },
      loadMessagesForMatch: async (matchId, options) => {
        const state = get();
        if (!state.authToken) return;
        const query = buildQuery({
          matchId,
          limit: options?.limit ?? 50,
          before: options?.before,
        });
        const data = await apiFetch<any[]>(`/api/chat/messages?${query}`, {
          token: state.authToken,
        });
        const messages = (data ?? [])
          .map((message) => ({
            id: message._id,
            senderId: message.senderId,
            content: message.content,
            timestamp: message.timestamp,
          }))
          .reverse();

        set((prev) => ({
          messagesByMatch: { ...prev.messagesByMatch, [matchId]: messages },
        }));
      },
      sendMessage: async (matchId, receiverId, content) => {
        const state = get();
        if (!state.authToken) return;
        const message = await apiFetch<any>(`/api/chat`, {
          method: "POST",
          body: JSON.stringify({ matchId, receiverId, content }),
          token: state.authToken,
        });

        if (!message) return;

        const nextMessage: ChatMessage = {
          id: message._id,
          senderId: message.senderId,
          content: message.content,
          timestamp: message.timestamp,
        };

        set((prev) => ({
          messagesByMatch: {
            ...prev.messagesByMatch,
            [matchId]: [...(prev.messagesByMatch[matchId] ?? []), nextMessage],
          },
        }));
      },
      markMatchRead: async (matchId) => {
        const state = get();
        if (!state.authToken) return;
        await apiFetch(`/api/chat/mark-read`, {
          method: "PATCH",
          body: JSON.stringify({ matchId }),
          token: state.authToken,
        });
        set((prev) => ({
          conversations: prev.conversations.map((conversation) =>
            conversation.id === matchId
              ? { ...conversation, unread: false }
              : conversation
          ),
        }));
      },
      fetchPropertyById: async (listingId) => {
        const state = get();
        if (!state.authToken || !isMongoId(listingId)) return;
        if (state.listingsById[listingId]) return;
        const property = await apiFetch<any>(`/api/properties/${listingId}`, {
          token: state.authToken,
        });
        if (!property) return;
        const listing = mapPropertyToListing(property);
        set((prev) => ({
          listingsById: { ...prev.listingsById, [listing.id]: listing },
          exploreQueue: prev.exploreQueue.includes(listing.id)
            ? prev.exploreQueue
            : [...prev.exploreQueue, listing.id],
        }));
      },
    }),
    {
      name: "get-a-roof-store",
      partialize: (state) => ({
        listingsById: state.listingsById,
        exploreQueue: state.exploreQueue,
        likedIds: state.likedIds,
        passedIds: state.passedIds,
        matchSummaries: state.matchSummaries,
        mapMatches: state.mapMatches,
        selectedListingId: state.selectedListingId,
        threadsById: state.threadsById,
        selectedThreadId: state.selectedThreadId,
        conversations: state.conversations,
        messagesByMatch: state.messagesByMatch,
        authToken: state.authToken,
        userId: state.userId,
      }),
    }
  )
);
