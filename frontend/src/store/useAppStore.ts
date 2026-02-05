"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listingIds, listingSeed, type Listing } from "@/lib/listings";
import { apiFetch, buildQuery } from "@/lib/api";
import { getSocket } from "@/lib/socket";

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
  unreadCount?: number;
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
  bedCount?: number;
  bathCount?: number;
  sqFt?: number;
  amenities?: string[];
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
    preferences?: Record<string, unknown>;
  };
};

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
};

type ApiUser = {
  id?: string;
  _id?: string;
  role?: string | string[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  isVerified?: boolean;
  preferences?: {
    tenant?: Record<string, unknown>;
    landlord?: Record<string, unknown>;
  };
};

type ApiAuthResponse = {
  accessToken: string;
  user: ApiUser;
};

type ApiProperty = {
  _id?: string;
  id?: string;
  images?: string[];
  amenities?: string[];
  monthlyPrice?: number;
  price?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
  };
  neighborhood?: string;
  title?: string;
  bedCount?: number;
  beds?: number;
  bathCount?: number;
  baths?: number;
  sqFt?: number;
  propertyType?: string;
  type?: string;
  status?: string;
  description?: string;
  proofOfOwnership?: string;
  landlordId?: string;
  landlordRequirements?: LandlordDraft["landlordRequirements"];
  matchScore?: number;
  preferencesMatchPercentage?: number;
  apartmentPreferenceMatchPercentage?: number;
  matches?: number;
  matchCount?: number;
  newCount?: number;
  coverUrl?: string;
  area?: string;
};

type ApiMatch = {
  _id?: string;
  id?: string;
  propertyId?: string;
  tenantId?: string;
  status?: MatchStatus;
  matchScore?: number;
  preferencesMatchPercentage?: number;
  apartmentPreferenceMatchPercentage?: number;
  updatedAt?: string;
  property?: ApiProperty;
  lastMessage?: { content?: string; timestamp?: string };
  unreadCount?: number;
  tenant?: ApiUser;
  isNewForLandlord?: boolean;
};

type ApiConversation = {
  matchId?: string;
  tenantId?: string;
  property?: ApiProperty;
  tenant?: ApiUser;
  landlord?: ApiUser;
  lastMessage?: { content?: string; timestamp?: string };
  unreadCount?: number;
};

export type ApiMessage = {
  _id?: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  timestamp?: string;
  matchId?: string;
};

type ApiUploadResponse = { url?: string };
type ApiPhotoResponse = { photoUrl?: string };

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
  typingByMatch: Record<string, boolean>;
  authToken: string | null;
  userId: string | null;
  user: ApiUser | null;
  landlordDraft: LandlordDraft;
  landlordProperties: LandlordPropertySummary[];
  landlordPropertiesWithMatches: LandlordPropertySummary[];
  landlordMatchesByProperty: Record<string, LandlordMatch[]>;
  setSelectedListingId: (id: string | null) => void;
  setSelectedThreadId: (id: string | null) => void;
  setAuth: (token: string, userId: string) => void;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<ApiAuthResponse | null>;
  registerTenant: (payload: {
    firstName?: string;
    lastName?: string;
    email: string;
    phoneNumber?: string;
    password: string;
  }) => Promise<ApiUser>;
  registerLandlord: (payload: {
    firstName?: string;
    lastName?: string;
    email: string;
    phoneNumber?: string;
    password: string;
  }) => Promise<ApiUser>;
  sendEmailOtp: (userId: string) => Promise<Record<string, unknown>>;
  sendPhoneOtp: (userId: string) => Promise<Record<string, unknown>>;
  verifyEmailOtp: (userId: string, otp: string) => Promise<Record<string, unknown>>;
  verifyPhoneOtp: (userId: string, otp: string) => Promise<Record<string, unknown>>;
  requestPasswordReset: (email: string) => Promise<{ token?: string } | null>;
  resetPassword: (token: string, password: string) => Promise<Record<string, unknown>>;
  fetchUserProfile: () => Promise<ApiUser | null>;
  updateUser: (payload: Record<string, unknown>) => Promise<ApiUser | null>;
  updatePreferences: (payload: {
    tenant?: Record<string, unknown>;
    landlord?: Record<string, unknown>;
  }) => Promise<ApiUser | null>;
  likeListing: (listingId: string) => Promise<void>;
  unlikeListing: (listingId: string) => Promise<void>;
  createMatchForListing: (listingId: string, tenantLiked: boolean) => Promise<void>;
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
  receiveMessage: (message: ApiMessage) => void;
  receiveTyping: (matchId: string, senderId: string, isTyping: boolean) => void;
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

const resolvePropertyId = (property?: ApiProperty | null) => {
  if (!property) return "";
  const raw = property._id ?? property.id;
  if (!raw) return "";
  return typeof raw === "string" ? raw : String(raw);
};

const toIdString = (value?: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "toString" in (value as any)) {
    const str = (value as any).toString?.();
    return typeof str === "string" ? str : "";
  }
  return "";
};

const toTimestamp = (value?: unknown) => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  const asString = toIdString(value);
  if (asString) {
    const date = new Date(asString);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
};

const buildMessageId = (message: ApiMessage) => {
  const id = toIdString((message as any).id ?? message._id);
  if (id) return id;
  const senderId = toIdString(message.senderId);
  const timestamp = toTimestamp(message.timestamp);
  return `${senderId}:${timestamp}:${message.content ?? ""}`;
};

const mapApiMessageToChat = (message: ApiMessage): ChatMessage => ({
  id: buildMessageId(message),
  senderId: toIdString(message.senderId),
  content: message.content ?? "",
  timestamp: toTimestamp(message.timestamp),
});

const isSameChatMessage = (a: ChatMessage, b: ChatMessage) => {
  const aId = toIdString(a.id);
  const bId = toIdString(b.id);
  if (aId && bId && aId === bId) return true;
  return (
    a.senderId === b.senderId &&
    a.content === b.content &&
    a.timestamp === b.timestamp
  );
};

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

const buildConversationSummary = (
  item: ApiConversation,
  currentUserId?: string,
  currentUser?: ApiUser | null
) => {
  const matchId = toIdString(item.matchId);
  const listing = item.property ? mapPropertyToListing(item.property) : null;
  const tenantId = item.tenantId ? toIdString(item.tenantId) : undefined;
  const landlordId = toIdString(
    item.landlord?.id ?? item.landlord?._id ?? item.property?.landlordId
  );

  const tenantName = [item.tenant?.firstName, item.tenant?.lastName]
    .filter(Boolean)
    .join(" ");
  const landlordName = [item.landlord?.firstName, item.landlord?.lastName]
    .filter(Boolean)
    .join(" ");

  const currentId = toIdString(currentUserId);
  const isTenant = Boolean(currentId && tenantId && currentId === tenantId);
  const isLandlord = Boolean(currentId && landlordId && currentId === landlordId);

  const title = isLandlord
    ? tenantName || "Tenant"
    : isTenant
      ? landlordName || "Landlord"
      : landlordName || tenantName || "Unknown user";

  const otherPhoto = isLandlord
    ? item.tenant?.photoUrl
    : item.landlord?.photoUrl || item.tenant?.photoUrl;
  const summary: ConversationSummary = {
    id: matchId,
    listingId: listing?.id,
    title,
    preview: item.lastMessage?.content ?? "Start a conversation",
    time: formatTime(item.lastMessage?.timestamp),
    image: otherPhoto || listing?.image,
    unread: (item.unreadCount ?? 0) > 0,
    unreadCount: item.unreadCount ?? 0,
    tenantId,
    landlordId,
  };
  return { summary, listing };
};

const mapPropertyToListing = (property: ApiProperty): Listing => {
  const propertyId = resolvePropertyId(property);
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
    id: propertyId,
    image: property?.images?.[0] ?? "/hero.png",
    images: property?.images ?? undefined,
    amenities: property?.amenities ?? undefined,
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

const mapLandlordPropertySummary = (property: ApiProperty): LandlordPropertySummary => ({
  id: resolvePropertyId(property),
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

const mapPropertyToLandlordDraft = (property: ApiProperty): LandlordDraft => ({
  id: resolvePropertyId(property),
  images: property?.images ?? [],
  monthlyPrice: property?.monthlyPrice,
  address: property?.address,
  propertyType: property?.propertyType,
  bedCount: property?.bedCount,
  bathCount: property?.bathCount,
  sqFt: property?.sqFt,
  amenities: property?.amenities,
  description: property?.description,
  proofOfOwnership: property?.proofOfOwnership,
  landlordRequirements: property?.landlordRequirements,
  status: property?.status ?? "Draft",
});

const buildLandlordPayload = (draft: LandlordDraft) => {
  const payload: Record<string, unknown> = {};

  if (draft.images) payload.images = draft.images;
  if (draft.monthlyPrice !== undefined) payload.monthlyPrice = draft.monthlyPrice;
  if (draft.propertyType) payload.propertyType = draft.propertyType;
  if (draft.bedCount !== undefined) payload.bedCount = draft.bedCount;
  if (draft.bathCount !== undefined) payload.bathCount = draft.bathCount;
  if (draft.sqFt !== undefined) payload.sqFt = draft.sqFt;
  if (draft.amenities) payload.amenities = draft.amenities;
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
    const requirements: Record<string, unknown> = {};
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
      typingByMatch: {},
      authToken: null,
      userId: null,
      user: null,
      landlordDraft: emptyLandlordDraft,
      landlordProperties: [],
      landlordPropertiesWithMatches: [],
      landlordMatchesByProperty: {},
      setSelectedListingId: (id) => set({ selectedListingId: id }),
      setSelectedThreadId: (id) => {
        set({ selectedThreadId: id });
        const state = get();
        if (id && state.authToken) {
          const socket = getSocket(state.authToken);
          socket?.emit("join", { matchId: id });
        }
        if (id) {
          void get().markMatchRead(id);
        }
      },
      setAuth: (token, userId) => set({ authToken: token, userId }),
      clearAuth: () => {
        set({
          authToken: null,
          userId: null,
          user: null,
          landlordDraft: emptyLandlordDraft,
          landlordProperties: [],
          landlordPropertiesWithMatches: [],
          landlordMatchesByProperty: {},
        });
        void fetch("/api/auth/session", { method: "DELETE" });
      },
      login: async (email, password) => {
        const response = await apiFetch<ApiAuthResponse>(`/api/auth/login`, {
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
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: response.accessToken }),
        });
        return response;
      },
      registerTenant: async (payload) => {
        return apiFetch<ApiUser>(`/api/users`, {
          method: "POST",
          body: JSON.stringify({ ...payload, role: "Tenant" }),
        });
      },
      registerLandlord: async (payload) => {
        return apiFetch<ApiUser>(`/api/users`, {
          method: "POST",
          body: JSON.stringify({ ...payload, role: "Landlord" }),
        });
      },
      sendEmailOtp: async (userId) => {
        return apiFetch<Record<string, unknown>>(`/api/auth/send-email-otp`, {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
      },
      sendPhoneOtp: async (userId) => {
        return apiFetch<Record<string, unknown>>(`/api/auth/send-phone-otp`, {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
      },
      verifyEmailOtp: async (userId, otp) => {
        return apiFetch<Record<string, unknown>>(`/api/auth/verify-email-otp`, {
          method: "POST",
          body: JSON.stringify({ userId, otp }),
        });
      },
      verifyPhoneOtp: async (userId, otp) => {
        return apiFetch<Record<string, unknown>>(`/api/auth/verify-phone-otp`, {
          method: "POST",
          body: JSON.stringify({ userId, otp }),
        });
      },
      requestPasswordReset: async (email) => {
        return apiFetch<{ token?: string }>(`/api/auth/request-password-reset`, {
          method: "POST",
          body: JSON.stringify({ email }),
        });
      },
      resetPassword: async (token, password) => {
        return apiFetch<Record<string, unknown>>(`/api/auth/reset-password`, {
          method: "POST",
          body: JSON.stringify({ token, password }),
        });
      },
      fetchUserProfile: async () => {
        const state = get();
        if (!state.authToken || !state.userId) return null;
        const response = await apiFetch<ApiUser>(`/api/users/${state.userId}`, {
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
        const response = await apiFetch<ApiUser>(`/api/users/${state.userId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          token: state.authToken,
        });
        if (response) {
          set({ user: response });
          return response;
        }
        const nextUser = { ...(state.user ?? {}), ...payload } as ApiUser;
        set({ user: nextUser });
        return nextUser;
      },
      uploadProfilePhoto: async (file) => {
        const state = get();
        if (!state.authToken || !state.userId || !file) return null;
        const form = new FormData();
        form.append("file", file, file.name);
        const response = await apiFetch<ApiPhotoResponse>(`/api/users/${state.userId}/photo`, {
          method: "POST",
          body: form,
          token: state.authToken,
        });
        return response?.photoUrl ?? null;
      },
      updatePreferences: async (payload) => {
        const state = get();
        if (!state.authToken || !state.userId) return null;
        return apiFetch<ApiUser>(`/api/users/${state.userId}/preferences`, {
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
      createMatchForListing: async (listingId, tenantLiked) => {
        const state = get();
        if (!state.authToken || !isMongoId(listingId)) return;
        try {
          await apiFetch(`/api/matches`, {
            method: "POST",
            body: JSON.stringify({ propertyId: listingId, tenantLiked }),
            token: state.authToken,
          });
          await get().loadMatches();
        } catch {
          // Best-effort; ignore errors here to avoid blocking UI.
        }
      },
      likeListing: async (listingId) => {
        const state = get();
        if (state.likedIds.includes(listingId)) return;

        set({
          likedIds: [...state.likedIds, listingId],
          selectedListingId: listingId,
        });

        if (state.authToken && isMongoId(listingId)) {
          if (state.userId) {
            try {
              await apiFetch(`/api/users/${state.userId}/saved-properties`, {
                method: "POST",
                body: JSON.stringify({ propertyId: listingId }),
                token: state.authToken,
              });
            } catch {
              // Keep match creation independent of saved-properties failures.
            }
          }

          await get().createMatchForListing(listingId, true);
        }
      },
      unlikeListing: async (listingId) => {
        const state = get();
        set({
          likedIds: state.likedIds.filter((id) => id !== listingId),
        });

        if (state.authToken && isMongoId(listingId)) {
          if (state.userId) {
            try {
              await apiFetch(`/api/users/${state.userId}/saved-properties/${listingId}`, {
                method: "DELETE",
                token: state.authToken,
              });
            } catch {
              // Ignore saved-properties failures; still update match state.
            }
          }

          await get().createMatchForListing(listingId, false);
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
          await get().createMatchForListing(listingId, false);
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
        await get().createMatchForListing(listingId, true);
      },
      ensureThreadForListing: async (listingId) => {
        const state = get();
        if (!state.authToken || !isMongoId(listingId)) {
          return null;
        }
        const response = await apiFetch<ApiConversation>(`/api/chat/start`, {
          method: "POST",
          body: JSON.stringify({ propertyId: listingId }),
          token: state.authToken,
        });

        if (!response?.matchId) return null;

        const { summary, listing } = buildConversationSummary(
          response,
          state.userId,
          state.user
        );
        if (listing) {
          set((prev) => ({
            listingsById: { ...prev.listingsById, [listing.id]: listing },
          }));
        }
        if (summary.id) {
          set((prev) => {
            const next = prev.conversations.filter((item) => item.id !== summary.id);
            return {
              conversations: [summary, ...next],
            };
          });
        } else {
          const thread = createThreadObject(listingId, response.matchId);
          set(({ threadsById }) => ({
            threadsById: { ...threadsById, [thread.id]: thread },
            selectedThreadId: thread.id,
          }));
        }

        const hasNames =
          Boolean(response.tenant?.firstName || response.tenant?.lastName) ||
          Boolean(response.landlord?.firstName || response.landlord?.lastName);
        if (!hasNames) {
          await get().loadConversations();
        }

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

        const data = await apiFetch<ApiProperty[]>(`/api/properties/explore?${query}`, {
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

        const data = await apiFetch<ApiProperty[]>(`/api/properties/matches/map?${query}`, {
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
        const data = await apiFetch<ApiMatch[]>(`/api/matches/tenant`, {
          token: state.authToken,
        });

        const summaries = (data ?? []).map((match) => {
          const listing = match.property ? mapPropertyToListing(match.property) : null;
          if (listing) {
            set((prev) => ({
              listingsById: { ...prev.listingsById, [listing.id]: listing },
            }));
          }
          const listingId =
            listing?.id ?? (match.propertyId ? String(match.propertyId) : "");
          if (listingId && !state.listingsById[listingId]) {
            void get().fetchPropertyById(listingId);
          }
          return {
            id: toIdString(match._id ?? match.id),
            listingId,
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
        const data = await apiFetch<ApiConversation[]>(`/api/chat/conversations?${query}`, {
          token: state.authToken,
        });

        const conversations = (data ?? []).map((item) => {
          const { summary, listing } = buildConversationSummary(
            item,
            state.userId,
            state.user
          );
          if (listing) {
            set((prev) => ({
              listingsById: { ...prev.listingsById, [listing.id]: listing },
            }));
          }
          return summary;
        });

        if (!conversations.length) {
          if (state.conversations.length) return;
          set({ conversations: [] });
          return;
        }

        set((prev) => {
          const prevById = new Map(prev.conversations.map((item) => [item.id, item]));
          const merged = conversations.map((next) => {
            const prevItem = prevById.get(next.id);
            if (!prevItem) return next;
            const nextTitle = next.title?.trim();
            const prevTitle = prevItem.title?.trim();
            const usePrevTitle =
              (!nextTitle || nextTitle === "Unknown user") &&
              prevTitle &&
              prevTitle !== "Unknown user";

            return {
              ...prevItem,
              ...next,
              title: usePrevTitle ? prevTitle : next.title,
              image: next.image || prevItem.image,
            };
          });
          return { conversations: merged };
        });
      },
      loadMessagesForMatch: async (matchId, options) => {
        const state = get();
        if (!state.authToken || !isMongoId(matchId)) return;
        const query = buildQuery({
          matchId,
          limit: options?.limit ?? 50,
          before: options?.before,
        });
        const data = await apiFetch<ApiMessage[]>(`/api/chat/messages?${query}`, {
          token: state.authToken,
        });
        const messages = (data ?? [])
          .map(mapApiMessageToChat)
          .reverse();

        set((prev) => ({
          messagesByMatch: { ...prev.messagesByMatch, [matchId]: messages },
        }));
      },
      sendMessage: async (matchId, receiverId, content) => {
        const state = get();
        if (!state.authToken || !isMongoId(matchId)) return;
        const message = await apiFetch<ApiMessage>(`/api/chat`, {
          method: "POST",
          body: JSON.stringify({ matchId, receiverId, content }),
          token: state.authToken,
        });

        if (!message) return;

        const nextMessage = mapApiMessageToChat(message);
        const messageId = nextMessage.id;

        const nextTime = formatTime(nextMessage.timestamp);
        set((prev) => {
          const currentMessages = prev.messagesByMatch[matchId] ?? [];
          const alreadyExists = currentMessages.some((existing) =>
            isSameChatMessage(existing, nextMessage)
          );
          const nextMessages = alreadyExists
            ? currentMessages
            : [...currentMessages, nextMessage];

          const updated = prev.conversations.map((conversation) =>
            conversation.id === matchId
              ? {
                  ...conversation,
                  preview: nextMessage.content,
                  time: nextTime,
                  unread: false,
                  unreadCount: 0,
                }
              : conversation
          );
          const active = updated.find((conversation) => conversation.id === matchId);
          const reordered = active
            ? [active, ...updated.filter((conversation) => conversation.id !== matchId)]
            : updated;

          return {
            messagesByMatch: {
              ...prev.messagesByMatch,
              [matchId]: nextMessages,
            },
            conversations: reordered,
          };
        });
      },
      receiveMessage: (incoming) => {
        const state = get();
        const matchId = toIdString(incoming.matchId);
        if (!matchId) return;

        const senderId = toIdString(incoming.senderId);
        const nextMessage = mapApiMessageToChat(incoming);
        const messageId = nextMessage.id;
        const hasConversation = state.conversations.some(
          (conversation) => conversation.id === matchId
        );
        const shouldCountUnread =
          senderId !== state.userId && state.selectedThreadId !== matchId;

        set((prev) => {
          const currentMessages = prev.messagesByMatch[matchId] ?? [];
          const alreadyExists = currentMessages.some((message) =>
            isSameChatMessage(message, nextMessage)
          );
          const nextMessages = alreadyExists
            ? currentMessages
            : [...currentMessages, nextMessage];

          const updatedConversations = prev.conversations.map((conv) => {
            if (conv.id !== matchId) return conv;
            const nextUnreadCount = shouldCountUnread
              ? (conv.unreadCount ?? 0) + 1
              : 0;
            return {
              ...conv,
              preview: nextMessage.content || conv.preview,
              time: formatTime(nextMessage.timestamp),
              unread: nextUnreadCount > 0,
              unreadCount: nextUnreadCount,
            };
          });

          if (!updatedConversations.some((conv) => conv.id === matchId)) {
            const placeholder: ConversationSummary = {
              id: matchId,
              title: senderId === state.userId ? "Conversation" : "New message",
              preview: nextMessage.content || "Start a conversation",
              time: formatTime(nextMessage.timestamp),
              image: "/hero.png",
              unread: shouldCountUnread,
              unreadCount: shouldCountUnread ? 1 : 0,
            };
            updatedConversations.unshift(placeholder);
          }

          const updatedIndex = updatedConversations.findIndex(
            (conv) => conv.id === matchId
          );
          if (updatedIndex > 0) {
            const [updatedConv] = updatedConversations.splice(updatedIndex, 1);
            updatedConversations.unshift(updatedConv);
          }

          return {
            messagesByMatch: {
              ...prev.messagesByMatch,
              [matchId]: nextMessages,
            },
            conversations: updatedConversations,
          };
        });

        if (!hasConversation) {
          void get().loadConversations();
        }
      },
      receiveTyping: (matchId, senderId, isTyping) => {
        const state = get();
        if (!matchId || senderId === state.userId) return;
        set((prev) => ({
          typingByMatch: { ...prev.typingByMatch, [matchId]: isTyping },
        }));
      },
      markMatchRead: async (matchId) => {
        const state = get();
        if (!state.authToken || !isMongoId(matchId)) return;
        await apiFetch(`/api/chat/mark-read`, {
          method: "PATCH",
          body: JSON.stringify({ matchId }),
          token: state.authToken,
        });
        set((prev) => ({
          conversations: prev.conversations.map((conversation) =>
            conversation.id === matchId
              ? { ...conversation, unread: false, unreadCount: 0 }
              : conversation
          ),
        }));
      },
      fetchPropertyById: async (listingId) => {
        const state = get();
        if (!state.authToken || !isMongoId(listingId)) return;
        if (state.listingsById[listingId]) return;
        const property = await apiFetch<ApiProperty>(`/api/properties/${listingId}`, {
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
          const property = await apiFetch<ApiProperty>(`/api/properties/${propertyId}`, {
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
          ? await apiFetch<ApiProperty>(`/api/properties/${draft.id}`, {
              method: "PATCH",
              body: JSON.stringify(requestPayload),
              token: state.authToken,
            })
          : await apiFetch<ApiProperty>(`/api/properties`, {
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
        const response = await apiFetch<ApiUploadResponse>(`/api/properties/upload-image`, {
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
        const response = await apiFetch<ApiUploadResponse>(`/api/properties/upload-proof`, {
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
          const data = await apiFetch<ApiProperty[]>(
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
          const data = await apiFetch<ApiProperty[]>(
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
          const data = await apiFetch<ApiMatch[]>(
            `/api/landlord/${state.userId}/properties/${propertyId}/matches`,
            { token: state.authToken }
          );
          const matches = (data ?? []).map((match) => ({
            id: toIdString(match?._id ?? match?.id),
            propertyId: match?.propertyId ? String(match.propertyId) : "",
            tenantId: match?.tenantId ? String(match.tenantId) : "",
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
        typingByMatch: state.typingByMatch,
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
