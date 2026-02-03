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

type LandlordDraft = {
  id?: string;
  images: string[];
  monthlyPrice?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
  };
  propertyType?: string;
  description?: string;
  proofOfOwnership?: string;
  landlordRequirements?: {
    budgetRange?: { min?: number; max?: number };
    annualIncome?: { min?: number; max?: number };
    petsAllowed?: boolean;
    nonOwnerOccupied?: boolean;
    sharedApartment?: boolean;
    shortlet?: boolean;
    selfCompound?: boolean;
    sharedCompound?: boolean;
    idealTenantPreferences?: {
      employmentStatus?: string;
      maritalStatus?: string;
      vehicles?: string;
      hasPets?: boolean;
      smokingHabits?: string;
      drinkingHabits?: string;
      religionPreference?: string;
      educationLevel?: string;
      socialHabits?: string;
      hasChildren?: boolean;
    };
  };
  status?: "Draft" | "Listed";
};

type LandlordPropertySummary = {
  id: string;
  status?: string;
  title?: string;
  price?: number;
  beds?: number;
  baths?: number;
  matches?: number;
  newCount?: number;
  coverUrl?: string;
  area?: string;
  type?: string;
  matchCount?: number;
};

type LandlordMatch = {
  id: string;
  propertyId: string;
  tenantId: string;
  status?: string;
  matchScore?: number;
  preferencesMatchPercentage?: number;
  apartmentPreferenceMatchPercentage?: number;
  updatedAt?: string;
  isNewForLandlord?: boolean;
  tenant?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    photoUrl?: string;
    isVerified?: boolean;
    preferences?: Record<string, any>;
  };
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
  user: Record<string, unknown> | null;
  landlordDraft: LandlordDraft;
  landlordProperties: LandlordPropertySummary[];
  landlordPropertiesWithMatches: LandlordPropertySummary[];
  landlordMatchesByProperty: Record<string, LandlordMatch[]>;
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
  registerLandlord: (payload: {
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
  setLandlordDraft: (payload: Partial<LandlordDraft>) => void;
  clearLandlordDraft: () => void;
  loadLandlordDraftById: (propertyId: string) => Promise<void>;
  saveLandlordDraft: (payload?: Partial<LandlordDraft>) => Promise<LandlordDraft | null>;
  publishLandlordDraft: () => Promise<LandlordDraft | null>;
  uploadLandlordImage: (file: File) => Promise<string | null>;
  uploadLandlordProof: (file: File) => Promise<string | null>;
  loadLandlordProperties: (options?: {
    q?: string;
    status?: string;
    sort?: string;
  }) => Promise<void>;
  loadLandlordPropertiesWithMatches: (options?: {
    q?: string;
    status?: string;
    sort?: string;
  }) => Promise<void>;
  loadLandlordPropertyMatches: (propertyId: string) => Promise<void>;
  markLandlordPropertyMatchesSeen: (propertyId: string) => Promise<void>;
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
    images: property?.images ?? undefined,
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

const emptyLandlordDraft: LandlordDraft = {
  images: [],
  status: "Draft",
};

const mapLandlordPropertySummary = (property: any): LandlordPropertySummary => ({
  id: property?._id ?? property?.id ?? "",
  status: property?.status,
  title: property?.title ?? property?.address?.street ?? property?.neighborhood,
  price: property?.price ?? property?.monthlyPrice,
  beds: property?.beds ?? property?.bedCount ?? 0,
  baths: property?.baths ?? property?.bathCount ?? 0,
  matches: property?.matches ?? property?.matchCount ?? 0,
  newCount: property?.newCount ?? 0,
  coverUrl: property?.coverUrl ?? property?.images?.[0] ?? "/hero.png",
  area: property?.area ?? property?.neighborhood ?? property?.address?.city,
  type: property?.type ?? property?.propertyType,
  matchCount: property?.matchCount ?? property?.matches ?? 0,
});

const mapPropertyToLandlordDraft = (property: any): LandlordDraft => ({
  id: property?._id ?? property?.id,
  images: property?.images ?? [],
  monthlyPrice: property?.monthlyPrice,
  address: property?.address,
  propertyType: property?.propertyType,
  description: property?.description,
  proofOfOwnership: property?.proofOfOwnership,
  landlordRequirements: property?.landlordRequirements,
  status: property?.status ?? "Draft",
});

const buildLandlordPayload = (draft: LandlordDraft) => {
  const payload: Record<string, any> = {};

  if (draft.images) payload.images = draft.images;
  if (draft.monthlyPrice !== undefined) payload.monthlyPrice = draft.monthlyPrice;
  if (draft.propertyType) payload.propertyType = draft.propertyType;
  if (draft.description) payload.description = draft.description;
  if (draft.proofOfOwnership) payload.proofOfOwnership = draft.proofOfOwnership;
  if (draft.status) payload.status = draft.status;

  if (draft.address) {
    const address = Object.fromEntries(
      Object.entries(draft.address).filter(
        ([, value]) => value !== undefined && value !== ""
      )
    );
    if (Object.keys(address).length) {
      payload.address = address;
    }
  }

  if (draft.landlordRequirements) {
    const requirements: Record<string, any> = {};
    const { budgetRange, annualIncome, idealTenantPreferences, ...rest } =
      draft.landlordRequirements;

    if (budgetRange?.min !== undefined || budgetRange?.max !== undefined) {
      requirements.budgetRange = {
        ...(budgetRange?.min !== undefined ? { min: budgetRange.min } : {}),
        ...(budgetRange?.max !== undefined ? { max: budgetRange.max } : {}),
      };
    }

    if (annualIncome?.min !== undefined || annualIncome?.max !== undefined) {
      requirements.annualIncome = {
        ...(annualIncome?.min !== undefined ? { min: annualIncome.min } : {}),
        ...(annualIncome?.max !== undefined ? { max: annualIncome.max } : {}),
      };
    }

    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined) {
        requirements[key] = value;
      }
    });

    if (idealTenantPreferences) {
      const preferences = Object.fromEntries(
        Object.entries(idealTenantPreferences).filter(
          ([, value]) => value !== undefined && value !== ""
        )
      );
      if (Object.keys(preferences).length) {
        requirements.idealTenantPreferences = preferences;
      }
    }

    if (Object.keys(requirements).length) {
      payload.landlordRequirements = requirements;
    }
  }

  return payload;
};

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
      user: null,
      landlordDraft: emptyLandlordDraft,
      landlordProperties: [],
      landlordPropertiesWithMatches: [],
      landlordMatchesByProperty: {},
      setSelectedListingId: (id) => set({ selectedListingId: id }),
      setAuth: (token, userId) => set({ authToken: token, userId }),
      clearAuth: () =>
        set({
          authToken: null,
          userId: null,
          user: null,
          landlordDraft: emptyLandlordDraft,
          landlordProperties: [],
          landlordPropertiesWithMatches: [],
          landlordMatchesByProperty: {},
        }),
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
          set({ authToken: response.accessToken, userId, user: response.user });
        }
        return response;
      },
      registerTenant: async (payload) => {
        return apiFetch(`/api/users`, {
          method: "POST",
          body: JSON.stringify({ ...payload, role: "Tenant" }),
        });
      },
      registerLandlord: async (payload) => {
        return apiFetch(`/api/users`, {
          method: "POST",
          body: JSON.stringify({ ...payload, role: "Landlord" }),
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
        const response = await apiFetch(`/api/users/${state.userId}`, {
          token: state.authToken,
        });
        if (response) {
          set({ user: response });
        }
        return response;
      },
      updateUser: async (payload) => {
        const state = get();
        if (!state.authToken || !state.userId) return null;
        const response = await apiFetch(`/api/users/${state.userId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          token: state.authToken,
        });
        if (response) {
          set({ user: response });
          return response;
        }
        const nextUser = { ...(state.user ?? {}), ...payload };
        set({ user: nextUser });
        return nextUser;
      },
      uploadProfilePhoto: async (file) => {
        const state = get();
        if (!state.authToken || !state.userId || !file) return null;
        const form = new FormData();
        form.append("file", file, file.name);
        const response = await apiFetch<any>(`/api/users/${state.userId}/photo`, {
          method: "POST",
          body: form,
          token: state.authToken,
        });
        return response?.photoUrl ?? null;
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
      deleteAccount: async () => {
        const state = get();
        if (!state.authToken || !state.userId) return false;
        await apiFetch(`/api/users/${state.userId}`, {
          method: "DELETE",
          token: state.authToken,
        });
        return true;
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
      setLandlordDraft: (payload) =>
        set((state) => {
          const prev = state.landlordDraft ?? emptyLandlordDraft;
          const nextRequirements = {
            ...(prev.landlordRequirements ?? {}),
            ...(payload.landlordRequirements ?? {}),
            budgetRange: {
              ...(prev.landlordRequirements?.budgetRange ?? {}),
              ...(payload.landlordRequirements?.budgetRange ?? {}),
            },
            annualIncome: {
              ...(prev.landlordRequirements?.annualIncome ?? {}),
              ...(payload.landlordRequirements?.annualIncome ?? {}),
            },
            idealTenantPreferences: {
              ...(prev.landlordRequirements?.idealTenantPreferences ?? {}),
              ...(payload.landlordRequirements?.idealTenantPreferences ?? {}),
            },
          };

          return {
            landlordDraft: {
              ...prev,
              ...payload,
              address: { ...(prev.address ?? {}), ...(payload.address ?? {}) },
              landlordRequirements: nextRequirements,
            },
          };
        }),
      clearLandlordDraft: () => set({ landlordDraft: emptyLandlordDraft }),
      loadLandlordDraftById: async (propertyId) => {
        const state = get();
        if (!state.authToken || !propertyId) return;
        try {
          const property = await apiFetch<any>(`/api/properties/${propertyId}`, {
            token: state.authToken,
          });
          if (property) {
            set({ landlordDraft: mapPropertyToLandlordDraft(property) });
          }
        } catch {
          set({ landlordDraft: emptyLandlordDraft });
        }
      },
      saveLandlordDraft: async (payload) => {
        const state = get();
        if (!state.authToken) return null;
        const draft: LandlordDraft = {
          ...state.landlordDraft,
          ...payload,
        };
        const requestPayload = buildLandlordPayload(draft);
        if (!Object.keys(requestPayload).length) {
          return draft;
        }

        const property = draft.id
          ? await apiFetch<any>(`/api/properties/${draft.id}`, {
              method: "PATCH",
              body: JSON.stringify(requestPayload),
              token: state.authToken,
            })
          : await apiFetch<any>(`/api/properties`, {
              method: "POST",
              body: JSON.stringify(requestPayload),
              token: state.authToken,
            });

        if (property) {
          const nextDraft = mapPropertyToLandlordDraft(property);
          set({ landlordDraft: nextDraft });
          return nextDraft;
        }

        return draft;
      },
      publishLandlordDraft: async () => {
        const state = get();
        return state.saveLandlordDraft({ status: "Listed" });
      },
      uploadLandlordImage: async (file) => {
        const state = get();
        if (!state.authToken || !file) return null;
        const form = new FormData();
        form.append("file", file, file.name);
        const response = await apiFetch<{ url: string }>(`/api/properties/upload-image`, {
          method: "POST",
          body: form,
          token: state.authToken,
        });
        return response?.url ?? null;
      },
      uploadLandlordProof: async (file) => {
        const state = get();
        if (!state.authToken || !file) return null;
        const form = new FormData();
        form.append("file", file, file.name);
        const response = await apiFetch<{ url: string }>(`/api/properties/upload-proof`, {
          method: "POST",
          body: form,
          token: state.authToken,
        });
        return response?.url ?? null;
      },
      loadLandlordProperties: async (options) => {
        const state = get();
        if (!state.authToken || !state.userId) return;
        const query = buildQuery({
          q: options?.q,
          status: options?.status,
          sort: options?.sort,
        });
        try {
          const data = await apiFetch<any[]>(
            `/api/landlord/${state.userId}/properties${query ? `?${query}` : ""}`,
            { token: state.authToken }
          );
          set({ landlordProperties: (data ?? []).map(mapLandlordPropertySummary) });
        } catch {
          set({ landlordProperties: [] });
        }
      },
      loadLandlordPropertiesWithMatches: async (options) => {
        const state = get();
        if (!state.authToken || !state.userId) return;
        const query = buildQuery({
          q: options?.q,
          status: options?.status,
          sort: options?.sort,
        });
        try {
          const data = await apiFetch<any[]>(
            `/api/landlord/${state.userId}/properties-with-matches${
              query ? `?${query}` : ""
            }`,
            { token: state.authToken }
          );
          set({
            landlordPropertiesWithMatches: (data ?? []).map(mapLandlordPropertySummary),
          });
        } catch {
          set({ landlordPropertiesWithMatches: [] });
        }
      },
      loadLandlordPropertyMatches: async (propertyId) => {
        const state = get();
        if (!state.authToken || !state.userId || !propertyId) return;
        try {
          const data = await apiFetch<any[]>(
            `/api/landlord/${state.userId}/properties/${propertyId}/matches`,
            { token: state.authToken }
          );
          const matches = (data ?? []).map((match) => ({
            id: match?._id ?? match?.id ?? "",
            propertyId: match?.propertyId,
            tenantId: match?.tenantId,
            status: match?.status,
            matchScore: match?.matchScore,
            preferencesMatchPercentage: match?.preferencesMatchPercentage,
            apartmentPreferenceMatchPercentage: match?.apartmentPreferenceMatchPercentage,
            updatedAt: match?.updatedAt,
            isNewForLandlord: match?.isNewForLandlord,
            tenant: match?.tenant
              ? {
                  id: match.tenant?._id ?? match.tenant?.id,
                  firstName: match.tenant?.firstName,
                  lastName: match.tenant?.lastName,
                  email: match.tenant?.email,
                  phoneNumber: match.tenant?.phoneNumber,
                  photoUrl: match.tenant?.photoUrl,
                  isVerified: match.tenant?.isVerified,
                  preferences: match.tenant?.preferences,
                }
              : undefined,
          }));
          set((prev) => ({
            landlordMatchesByProperty: {
              ...prev.landlordMatchesByProperty,
              [propertyId]: matches,
            },
          }));
        } catch {
          set((prev) => ({
            landlordMatchesByProperty: {
              ...prev.landlordMatchesByProperty,
              [propertyId]: [],
            },
          }));
        }
      },
      markLandlordPropertyMatchesSeen: async (propertyId) => {
        const state = get();
        if (!state.authToken || !state.userId || !propertyId) return;
        try {
          await apiFetch(
            `/api/landlord/${state.userId}/properties/${propertyId}/mark-seen`,
            {
              method: "PATCH",
              token: state.authToken,
            }
          );
          set((prev) => ({
            landlordProperties: prev.landlordProperties.map((property) =>
              property.id === propertyId ? { ...property, newCount: 0 } : property
            ),
            landlordPropertiesWithMatches: prev.landlordPropertiesWithMatches.map(
              (property) =>
                property.id === propertyId ? { ...property, newCount: 0 } : property
            ),
          }));
        } catch {
          return;
        }
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
        user: state.user,
        landlordDraft: state.landlordDraft,
        landlordProperties: state.landlordProperties,
        landlordPropertiesWithMatches: state.landlordPropertiesWithMatches,
        landlordMatchesByProperty: state.landlordMatchesByProperty,
      }),
    }
  )
);
