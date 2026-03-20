"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdaptiveBottomNav from "@/components/AdaptiveBottomNav";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import MessagesTutorial from "@/components/MessagesTutorial";
import { useAppStore } from "@/store/useAppStore";
import { getSocket } from "@/lib/socket";
import { showToast } from "@/lib/alerts";

type RouteRequestStatus = "pending" | "approved" | "denied";

type RouteRequestPayload = {
  id: string;
  status: RouteRequestStatus;
  kind: "route-access";
  propertyId?: string;
  tenantLocation?: {
    lat: number;
    lng: number;
  };
  ttlMinutes?: number;
};

const ROUTE_REQUEST_PREFIX = "__route_request__:";
const SKELETON_DELAY_MS = 150;

const encodeRouteRequest = (payload: RouteRequestPayload) =>
  `${ROUTE_REQUEST_PREFIX}${JSON.stringify(payload)}`;

const parseRouteRequest = (value: string): RouteRequestPayload | null => {
  if (!value.startsWith(ROUTE_REQUEST_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(ROUTE_REQUEST_PREFIX.length)) as RouteRequestPayload;
    if (
      parsed &&
      parsed.kind === "route-access" &&
      typeof parsed.id === "string" &&
      (parsed.status === "pending" || parsed.status === "approved" || parsed.status === "denied")
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};
const isMongoObjectId = (value?: string | null) =>
  Boolean(value && /^[a-f\d]{24}$/i.test(value));

type Conversation = {
  id: string;
  listingId?: string;
  name: string;
  preview: string;
  time: string;
  image: string;
  unread?: boolean;
  tenantId?: string;
  landlordId?: string;
};

function Icon({ name, filled }: { name: string; filled?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1", fontSize: 24 }
          : { fontSize: 24 }
      }
    >
      {name}
    </span>
  );
}

function ConversationAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative">
      <div
        className="h-14 w-14 rounded-full border-2 border-white bg-cover bg-center shadow-sm"
        style={{ backgroundImage: `url(${src})` }}
        aria-label={alt}
      />
      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
    </div>
  );
}

function EmptyState({
  title,
  message,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-10">
      <span className="material-symbols-outlined text-5xl text-slate-300">
        forum
      </span>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 max-w-xs">{message}</p>
      <Link
        href={ctaHref}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`conversation-skeleton-${index}`}
          className="flex w-full items-center gap-4 border-b border-slate-200 bg-background-light px-5 py-4"
        >
          <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-12 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, index) => {
        const isMe = index % 2 === 0;
        return (
          <div
            key={`chat-skeleton-${index}`}
            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                isMe ? "bg-primary/10" : "border border-slate-200 bg-white"
              }`}
            >
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SendingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-primary/70 py-0.5">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
      <span className="font-medium tracking-wide">Sending</span>
    </div>
  );
}

function TypingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex justify-start" aria-label="Typing indicator">
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span
          className="h-2 w-2 rounded-full bg-slate-400 animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-slate-400 animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-slate-400 animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

function RouteHintToast({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="absolute -top-16 right-14 z-20">
      <button
        type="button"
        onClick={onClose}
        className="relative inline-flex items-center gap-1 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-[11px] font-semibold text-primary shadow-sm"
      >
        <span className="material-symbols-outlined text-[14px]">map</span>
        Get route
        <span className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 border-b border-r border-blue-100 bg-white" />
      </button>
    </div>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const threadParam = searchParams?.get("thread") ?? "";
  const fromParam = searchParams?.get("from") ?? "";
  const intentParam = searchParams?.get("intent") ?? "";
  const propertyIdParam = searchParams?.get("propertyId") ?? "";
  const draftParam = searchParams?.get("draft") ?? "";
  const isLandlordContext =
    fromParam.startsWith("/dashboard") || pathname?.startsWith("/dashboard");
  const storeConversations = useAppStore((state) => state.conversations);
  const threadsById = useAppStore((state) => state.threadsById);
  const messagesByMatch = useAppStore((state) => state.messagesByMatch);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const loadMessagesForMatch = useAppStore((state) => state.loadMessagesForMatch);
  const markMatchRead = useAppStore((state) => state.markMatchRead);
  const sendMessageToApi = useAppStore((state) => state.sendMessage);
  const setSelectedThreadId = useAppStore((state) => state.setSelectedThreadId);
  const saveConversation = useAppStore((state) => state.saveConversation);
  const unmatchListing = useAppStore((state) => state.unmatchListing);
  const userId = useAppStore((state) => state.userId);
  const user = useAppStore((state) => state.user);
  const authToken = useAppStore((state) => state.authToken);
  const typingByMatch = useAppStore((state) => state.typingByMatch);

  const conversations = useMemo<Conversation[]>(
    () =>
      storeConversations.map((conversation) => ({
        id: conversation.id,
        listingId: conversation.listingId,
        name: conversation.title,
        preview: conversation.preview ?? "Start a conversation",
        time: conversation.time ?? "",
        image: conversation.image ?? "/avatar-placeholder.svg",
        unread: conversation.unread,
        tenantId: conversation.tenantId,
        landlordId: conversation.landlordId,
      })),
    [storeConversations]
  );

  const pendingConversation = useMemo<Conversation | null>(() => {
    if (!threadParam) return null;
    if (conversations.some((conversation) => conversation.id === threadParam)) {
      return null;
    }
    const thread = threadsById[threadParam];
    const listingId = thread?.listingId;
    return {
      id: threadParam,
      listingId,
      name: isLandlordContext ? "Tenant" : "Landlord",
      preview: "Start a conversation",
      time: "",
      image: "/avatar-placeholder.svg",
      tenantId: isLandlordContext ? undefined : userId ?? undefined,
      landlordId: isLandlordContext ? userId ?? undefined : undefined,
    };
  }, [threadParam, conversations, threadsById, isLandlordContext, userId]);

  const renderableConversations = useMemo(
    () =>
      pendingConversation ? [pendingConversation, ...conversations] : conversations,
    [pendingConversation, conversations]
  );

  const [activeId, setActiveId] = useState(() => threadParam);
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    () => (threadParam ? "chat" : "list")
  );
  const [messageText, setMessageText] = useState("");
  const [didApplyDraft, setDidApplyDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRouteHint, setShowRouteHint] = useState(false);
  const [isMatchActionPending, setIsMatchActionPending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [routeAccessDurationByRequestId, setRouteAccessDurationByRequestId] =
    useState<Record<string, 5 | 30 | 1440>>({});
  const activeConversationId =
    activeId || threadParam || renderableConversations[0]?.id || "";

  const activeConversation = useMemo(
    () =>
      renderableConversations.find((c) => c.id === activeConversationId) ??
      renderableConversations[0],
    [renderableConversations, activeConversationId]
  );

  const activeMessages = useMemo(
    () => {
      const thread = messagesByMatch[activeConversationId] ?? [];
      return thread.map((message) => ({
        id: message.id,
        convoId: activeConversationId,
        senderId: message.senderId,
        from: message.senderId === userId ? "me" : "them",
        text: message.content,
        routeRequest: parseRouteRequest(message.content),
        time: new Date(message.timestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      }));
    },
    [messagesByMatch, activeConversationId, userId]
  );

  const userHasTenantRole = useMemo(() => {
    if (!user?.role) return false;
    return Array.isArray(user.role)
      ? user.role.includes("Tenant")
      : user.role === "Tenant";
  }, [user?.role]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledIntentKeyRef = useRef<string>("");
  const isOtherTyping = Boolean(
    activeConversationId && typingByMatch[activeConversationId]
  );

  const selectConversation = (id: string, openChat?: boolean) => {
    setActiveId(id);
    setSelectedThreadId(id);
    if (openChat) {
      setMobileView("chat");
    }
    void loadMessagesForMatch(id);
  };

  const sendMessage = async () => {
    if (!activeConversation || !activeConversationId) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;
    const receiverId =
      userId === activeConversation.tenantId
        ? activeConversation.landlordId
        : activeConversation.tenantId;
    if (!receiverId) return;

    setMessageText("");
    setIsSending(true);
    try {
      await sendMessageToApi(activeConversationId, receiverId, trimmed);
    } finally {
      setIsSending(false);
    }

    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const sendRouteRequest = useCallback(async () => {
    if (!activeConversation || !activeConversationId) return;
    const isTenantInConversation = activeConversation.tenantId
      ? userId === activeConversation.tenantId
      : userHasTenantRole;
    if (!userId || !isTenantInConversation) {
      showToast({
        title: "Only tenants can request route access.",
        variant: "error",
      });
      return false;
    }
    if (!navigator.geolocation) {
      showToast({
        title: "Location is not supported on this browser.",
        variant: "error",
      });
      return false;
    }
    const receiverId =
      activeConversation.landlordId ??
      activeMessages.find((message) => message.from === "them")?.senderId;
    if (!receiverId || isSending) return false;
    let tenantLocation: RouteRequestPayload["tenantLocation"];
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        });
      });
      tenantLocation = {
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
      };
    } catch {
      showToast({
        title: "Allow location access first to request route directions.",
        variant: "error",
      });
      return false;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setIsSending(true);
    try {
      await sendMessageToApi(
        activeConversationId,
        receiverId,
        encodeRouteRequest({
          id,
          kind: "route-access",
          status: "pending",
          propertyId: activeConversation.listingId || propertyIdParam || undefined,
          tenantLocation,
        })
      );
      return true;
    } finally {
      setIsSending(false);
    }
  }, [
    activeConversation,
    activeConversationId,
    isSending,
    propertyIdParam,
    sendMessageToApi,
    userId,
    userHasTenantRole,
    activeMessages,
  ]);

  const hasRouteRequestInThread = useMemo(
    () => activeMessages.some((message) => Boolean(message.routeRequest)),
    [activeMessages]
  );

  useEffect(() => {
    if (intentParam !== "route-access") return;
    if (!activeConversation || !activeConversationId) return;
    if (isLoadingConversations || isLoadingMessages) return;
    const intentKey = `${intentParam}:${activeConversationId}:${propertyIdParam}`;
    if (handledIntentKeyRef.current === intentKey) return;
    if (hasRouteRequestInThread) {
      handledIntentKeyRef.current = intentKey;
      return;
    }

    handledIntentKeyRef.current = intentKey;
    void (async () => {
      const sent = await sendRouteRequest();
      if (!sent) {
        handledIntentKeyRef.current = "";
      }
    })();
  }, [
    activeConversation,
    activeConversationId,
    hasRouteRequestInThread,
    intentParam,
    isLoadingConversations,
    isLoadingMessages,
    propertyIdParam,
    sendRouteRequest,
  ]);

  const sendRouteDecision = async (
    id: string,
    status: "approved" | "denied",
    ttlMinutes?: 5 | 30 | 1440,
    propertyId?: string
  ) => {
    if (!activeConversation || !activeConversationId) return;
    const receiverId =
      userId === activeConversation.tenantId
        ? activeConversation.landlordId
        : activeConversation.tenantId;
    if (!receiverId || isSending) return;
    setIsSending(true);
    try {
      await sendMessageToApi(
        activeConversationId,
        receiverId,
        encodeRouteRequest({ id, kind: "route-access", status, ttlMinutes, propertyId })
      );
    } finally {
      setIsSending(false);
    }
  };

  const getDurationForRequest = (requestId: string): 5 | 30 | 1440 =>
    routeAccessDurationByRequestId[requestId] ?? 30;

  const routeRequestStatusById = useMemo(() => {
    const statuses: Record<string, RouteRequestStatus> = {};
    activeMessages.forEach((message) => {
      if (!message.routeRequest) return;
      statuses[message.routeRequest.id] = message.routeRequest.status;
    });
    return statuses;
  }, [activeMessages]);

  useEffect(() => {
    if (authToken) {
      let active = true;
      const timer = window.setTimeout(() => {
        if (active) setIsLoadingConversations(true);
      }, SKELETON_DELAY_MS);
      void loadConversations().finally(() => {
        window.clearTimeout(timer);
        if (active) setIsLoadingConversations(false);
      });
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }
  }, [authToken, loadConversations]);

  useEffect(() => {
    if (!authToken || !activeConversationId) return;
    const socket = getSocket(authToken);
    if (!socket) return;

    const trimmed = messageText.trim();
    if (!trimmed) {
      socket.emit("typing", { matchId: activeConversationId, isTyping: false });
      return;
    }

    socket.emit("typing", { matchId: activeConversationId, isTyping: true });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { matchId: activeConversationId, isTyping: false });
    }, 1200);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [authToken, activeConversationId, messageText]);

  useEffect(() => {
    if (activeConversationId) {
      setSelectedThreadId(activeConversationId);
    }
  }, [activeConversationId, setSelectedThreadId]);

  useEffect(() => {
    if (activeConversationId && !messagesByMatch[activeConversationId]) {
      let active = true;
      const timer = window.setTimeout(() => {
        if (active) setIsLoadingMessages(true);
      }, SKELETON_DELAY_MS);
      setSelectedThreadId(activeConversationId);
      void loadMessagesForMatch(activeConversationId).finally(() => {
        window.clearTimeout(timer);
        if (active) setIsLoadingMessages(false);
      });
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }
    setIsLoadingMessages(false);
  }, [
    activeConversationId,
    messagesByMatch,
    loadMessagesForMatch,
    setSelectedThreadId,
  ]);

  useEffect(() => {
    if (!authToken || !activeConversationId) return;
    const activeConversationEntry = storeConversations.find(
      (conversation) => conversation.id === activeConversationId
    );
    if (!activeConversationEntry?.unread && !(activeConversationEntry?.unreadCount ?? 0)) {
      return;
    }
    void markMatchRead(activeConversationId);
  }, [authToken, activeConversationId, storeConversations, markMatchRead]);

  useEffect(() => {
    if (didApplyDraft || !draftParam.trim() || !activeConversationId) return;
    setMessageText(draftParam.trim());
    setDidApplyDraft(true);
  }, [didApplyDraft, draftParam, activeConversationId]);

  useEffect(() => {
    if (isLandlordContext || !activeConversationId) {
      setShowRouteHint(false);
      return;
    }
    setShowRouteHint(true);
    const timer = window.setTimeout(() => setShowRouteHint(false), 3200);
    return () => window.clearTimeout(timer);
  }, [isLandlordContext, activeConversationId]);

  if (!authToken) {
    return (
      <div className="min-h-screen bg-background-light text-slate-900 font-display flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign in to view messages</h1>
          <p className="text-slate-600">
            Your conversations live in your account. Log in to continue.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-white font-semibold"
            >
              Go to Login
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-slate-700 font-semibold"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* MOBILE (DO NOT TOUCH) */}
      <div className="relative flex h-screen w-full max-w-md flex-col overflow-hidden bg-background-light text-slate-900 shadow-2xl lg:hidden">
        {mobileView === "list" && (
          <>
            <header className="flex items-center justify-between border-b border-slate-200 bg-background-light px-5 py-5">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                Your Conversations
              </h1>
              <div className="h-10 w-10" />
            </header>

            <main data-tour="messages-list" className="flex-1 overflow-y-auto pb-24">
              {isLoadingConversations ? (
                <ConversationListSkeleton />
              ) : renderableConversations.length === 0 ? (
                <EmptyState
                  title={isLandlordContext ? "No tenant messages yet" : "No conversations yet"}
                  message={
                    isLandlordContext
                      ? "When a tenant contacts you about a property, their chat will show up here."
                      : "Once you contact a landlord about a listing, the chat will show up here."
                  }
                  ctaLabel={isLandlordContext ? "View properties" : "Find listings"}
                  ctaHref={isLandlordContext ? "/dashboard/properties" : "/explore"}
                />
              ) : (
                renderableConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id, true)}
                    className="group flex w-full cursor-pointer border-b border-slate-200 bg-background-light px-5 py-4 transition-colors hover:bg-blue-50 hover:text-primary"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <ConversationAvatar
                        src={conversation.image}
                        alt={conversation.name}
                      />
                      <div className="flex flex-1 flex-col justify-center min-w-0">
                        <div className="mb-1 flex items-baseline justify-between gap-3">
                          <p className="truncate text-xl font-bold leading-tight">
                            {conversation.name}
                          </p>
                          <p className="whitespace-nowrap text-base font-medium text-primary">
                            {conversation.time}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-lg font-semibold leading-normal text-slate-600">
                            {conversation.preview}
                          </p>
                          {conversation.unread && (
                            <span className="h-3 w-3 rounded-full bg-primary shadow-sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </main>

            {!isLandlordContext ? (
              <AdaptiveBottomNav
                layout="fixed"
                className="lg:hidden h-20 "
              />
            ) : (
              <DashboardBottomNav
                active="chat"
                chatHref="/dashboard/messages"
                rootClassName="h-20"
                containerClassName="max-w-md h-full w-full mx-auto flex items-center justify-between px-4"
              />
            )}
          </>
        )}

        {mobileView === "chat" && activeConversation && (
          <>
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
              <button
                aria-label="Back"
                onClick={() => setMobileView("list")}
                className="rounded-full p-2 hover:bg-slate-100 transition-colors text-slate-700"
              >
                <Icon name="arrow_back" filled />
              </button>

              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full overflow-hidden relative bg-slate-100">
                  <Image
                    src={activeConversation.image}
                    alt={activeConversation.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">
                    {activeConversation.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isOtherTyping ? "Typing..." : "Online"}
                  </p>
                </div>
              </div>

              <div className="h-9 w-9" />
            </header>

            <main
              ref={chatRef}
              className="flex-1 overflow-y-auto px-4 py-4 pb-[140px]"
            >
              {isLoadingMessages ? (
                <ChatSkeleton />
              ) : (
                <div className="flex flex-col gap-3">
                {activeMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.from === "me" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        m.from === "me"
                          ? "bg-primary text-white"
                          : "bg-white text-slate-900 border border-slate-200"
                      }`}
                    >
                      {m.routeRequest ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">map</span>
                            <p className="text-sm font-semibold">Route Access Request</p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              (routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status) === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : (routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status) === "denied"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status}
                          </span>
                          {isLandlordContext &&
                            m.from === "them" &&
                            (routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status) === "pending" && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={getDurationForRequest(m.routeRequest.id)}
                                  onChange={(event) =>
                                    setRouteAccessDurationByRequestId((prev) => ({
                                      ...prev,
                                      [m.routeRequest!.id]: Number(event.target.value) as
                                        | 5
                                        | 30
                                        | 1440,
                                    }))
                                  }
                                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                                >
                                  <option value={5}>5 min</option>
                                  <option value={30}>30 min</option>
                                  <option value={1440}>1 day</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void sendRouteDecision(
                                      m.routeRequest!.id,
                                      "approved",
                                      getDurationForRequest(m.routeRequest!.id),
                                      m.routeRequest?.propertyId
                                    )
                                  }
                                  className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void sendRouteDecision(
                                      m.routeRequest!.id,
                                      "denied",
                                      undefined,
                                      m.routeRequest?.propertyId
                                    )
                                  }
                                  className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white"
                                >
                                  Deny
                                </button>
                              </div>
                            )}
                        </div>
                      ) : (
                        <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                      )}
                      <p
                        className={`mt-1 text-[10px] ${
                          m.from === "me"
                            ? "text-white/70"
                            : "text-slate-500"
                        }`}
                      >
                        {m.time}
                      </p>
                    </div>
                  </div>
                ))}
                <TypingIndicator visible={isOtherTyping} />
                </div>
              )}
            </main>

            <div data-tour="messages-composer" className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur-sm lg:hidden">
              <div className="mx-auto w-full max-w-md px-3 pt-3 pb-3">
                <div className="relative flex items-end gap-2">
                  <RouteHintToast
                    visible={showRouteHint && !isLandlordContext}
                    onClose={() => setShowRouteHint(false)}
                  />
                  <button
                    aria-label="Attach"
                    className="mb-1 rounded-full p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Icon name="attach_file" />
                  </button>

                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition-all duration-150 focus-within:border-primary/50 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(10,68,184,0.08)]">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={1}
                      placeholder="Message..."
                      className="w-full resize-none bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400 leading-relaxed"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <SendingIndicator visible={isSending} />
                  </div>

                  <button
                    aria-label="Request route access"
                    onClick={() => void sendRouteRequest()}
                    disabled={isSending || isLandlordContext}
                    className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Request route access"
                  >
                    <span className="material-symbols-outlined text-[20px]">map</span>
                  </button>

                  <button
                    aria-label="Send"
                    onClick={() => void sendMessage()}
                    disabled={isSending}
                    className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-primary/10 hover:brightness-110 hover:shadow-lg hover:shadow-primary/40 active:scale-95 disabled:opacity-60 transition-all duration-150"
                  >
                    <Icon name="send" filled />
                  </button>
                </div>
              </div>

              <div className="pb-safe" />
            </div>
          </>
        )}

        {mobileView === "chat" && !activeConversation && (
          <div className="flex-1 flex items-center justify-center px-6">
            <EmptyState
              title="Pick a conversation"
              message="Select a chat from the list to start messaging."
              ctaLabel="Back to list"
              ctaHref="/messages"
            />
          </div>
        )}
      </div>

      {/* DESKTOP (bottom nav should sit under LEFT column only) */}
      <div className="hidden lg:block h-screen overflow-hidden bg-background-light text-slate-900">
        <div className="relative h-screen overflow-hidden">
          <div className="flex h-full">
            {/* LEFT: conversations list + BottomNav under it */}
            <aside className="w-[420px] border-r border-slate-200 bg-white flex flex-col overflow-hidden">
              <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Conversations
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {renderableConversations.length} chats
                  </p>
                </div>
                <div className="h-10 w-10" />
              </header>

              <div className="px-6 pt-4 pb-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="material-symbols-outlined text-slate-500">
                    search
                  </span>
                  <input
                    placeholder="Search conversations"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Scrollable list: reserve space for BottomNav by adding pb */}
              <main
                data-tour="messages-list"
                ref={listRef}
                className="flex-1 overflow-y-auto pr-2 pb-[76px]"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <style>{`
                  .no-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
                `}</style>

                <div className="no-scrollbar">
                  {isLoadingConversations ? (
                    <ConversationListSkeleton />
                  ) : (
                    renderableConversations.map((conversation) => {
                      const isActive = conversation.id === activeConversationId;
                      return (
                        <button
                          key={conversation.id}
                          onClick={() => selectConversation(conversation.id)}
                          className={`w-full px-6 py-4 border-b border-slate-100 text-left transition-colors ${
                            isActive
                              ? "bg-primary/5"
                              : "bg-white hover:bg-blue-50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <ConversationAvatar
                              src={conversation.image}
                              alt={conversation.name}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="truncate text-base font-bold text-slate-900">
                                  {conversation.name}
                                </p>
                                <p className="shrink-0 text-xs font-semibold text-slate-500">
                                  {conversation.time}
                                </p>
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-medium text-slate-600">
                                  {conversation.preview}
                                </p>
                                {conversation.unread && !isActive && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                  <div className="h-4" />
                </div>
              </main>

              {/* BottomNav pinned to the bottom of the LEFT column only */}
              {!isLandlordContext ? (
                <AdaptiveBottomNav
                  layout="inline"
                  className="hidden lg:flex h-20"
                />
              ) : (
                <DashboardBottomNav
                  active="chat"
                  chatHref="/dashboard/messages"
                  rootClassName="relative h-20"
                  containerClassName="max-w-md h-full w-full mx-auto flex items-center justify-between px-4"
                />
              )}
            </aside>

            {/* RIGHT: chat panel (NO BottomNav under here) */}
            <section className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
              {isLoadingConversations ? (
                <div className="flex-1 px-8 py-6">
                  <ChatSkeleton />
                </div>
              ) : renderableConversations.length === 0 ? (
                <div className="flex-1 flex items-center justify-center px-8">
                  <EmptyState
                    title={isLandlordContext ? "No tenant messages yet" : "No messages yet"}
                    message={
                      isLandlordContext
                        ? "When a tenant contacts you about a property, their chat will appear here."
                        : "Like a listing and start a conversation to see it here."
                    }
                    ctaLabel={isLandlordContext ? "View properties" : "Explore listings"}
                    ctaHref={isLandlordContext ? "/dashboard/properties" : "/explore"}
                  />
                </div>
              ) : (
                <>
                  <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-full overflow-hidden relative bg-slate-100 shrink-0">
                        {activeConversation && (
                          <Image
                            src={activeConversation.image}
                            alt={activeConversation.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {activeConversation?.name ?? "Conversation"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {isOtherTyping ? "Typing..." : "Online"}
                        </p>
                      </div>
                    </div>

                    {!isLandlordContext ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            if (!activeConversation || isMatchActionPending) return;
                            if (!isMongoObjectId(activeConversation.id)) {
                              showToast({
                                title: "Conversation is not ready yet.",
                                variant: "error",
                              });
                              return;
                            }
                            setIsMatchActionPending(true);
                            try {
                              const success = await unmatchListing(activeConversation.id);
                              if (success) {
                                showToast({
                                  title: "Unmatched successfully",
                                  variant: "success",
                                });
                              } else {
                                showToast({
                                  title: "Could not unmatch. Please try again.",
                                  variant: "error",
                                });
                              }
                            } finally {
                              setIsMatchActionPending(false);
                            }
                          }}
                          disabled={!activeConversation || isMatchActionPending}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-rose-500 transition-colors"
                          title="Unmatch"
                        >
                          <Icon name="delete" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!activeConversation || isMatchActionPending) return;
                            if (!isMongoObjectId(activeConversation.id)) {
                              showToast({
                                title: "Conversation is not ready yet.",
                                variant: "error",
                              });
                              return;
                            }
                            showToast({
                              title:
                                "Are you sure? You're no longer interested. Chat will be removed.",
                              variant: "info",
                            });
                            const confirmed =
                              typeof window === "undefined"
                                ? false
                                : window.confirm(
                                    "Are you sure? You're no longer interested. This chat will be removed."
                                  );
                            if (!confirmed) return;
                            setIsMatchActionPending(true);
                            try {
                              const success = await saveConversation(activeConversation.id);
                              if (success) {
                                showToast({
                                  title: "Conversation saved",
                                  variant: "success",
                                });
                              } else {
                                showToast({
                                  title: "Could not save conversation.",
                                  variant: "error",
                                });
                              }
                            } finally {
                              setIsMatchActionPending(false);
                            }
                          }}
                          disabled={!activeConversation || isMatchActionPending}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-blue-500 transition-colors"
                          title="Save Conversation"
                        >
                          <Icon name="bookmark" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-9 w-9" />
                    )}
                  </header>

                  <main
                    ref={chatRef}
                    className="flex-1 overflow-y-auto px-8 py-6 no-scrollbar"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <div className="mx-auto max-w-3xl">
                      {isLoadingMessages ? (
                        <ChatSkeleton />
                      ) : (
                        <div className="flex flex-col gap-3">
                          {activeMessages.map((m) => (
                            <div
                              key={m.id}
                              className={`flex ${
                                m.from === "me"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                                  m.from === "me"
                                    ? "bg-primary text-white"
                                    : "bg-white text-slate-900 border border-slate-200"
                                }`}
                              >
                                {m.routeRequest ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px]">map</span>
                                      <p className="text-sm font-semibold">Route Access Request</p>
                                    </div>
                                    <span
                                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                        (routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status) === "approved"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : (routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status) === "denied"
                                            ? "bg-rose-100 text-rose-700"
                                            : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status}
                                    </span>
                                    {isLandlordContext &&
                                      m.from === "them" &&
                                      (routeRequestStatusById[m.routeRequest.id] ?? m.routeRequest.status) === "pending" && (
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={getDurationForRequest(m.routeRequest.id)}
                                            onChange={(event) =>
                                              setRouteAccessDurationByRequestId((prev) => ({
                                                ...prev,
                                                [m.routeRequest!.id]: Number(event.target.value) as
                                                  | 5
                                                  | 30
                                                  | 1440,
                                              }))
                                            }
                                            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                                          >
                                            <option value={5}>5 min</option>
                                            <option value={30}>30 min</option>
                                            <option value={1440}>1 day</option>
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void sendRouteDecision(
                                                m.routeRequest!.id,
                                                "approved",
                                                getDurationForRequest(m.routeRequest!.id),
                                                m.routeRequest?.propertyId
                                              )
                                            }
                                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void sendRouteDecision(
                                                m.routeRequest!.id,
                                                "denied",
                                                undefined,
                                                m.routeRequest?.propertyId
                                              )
                                            }
                                            className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white"
                                          >
                                            Deny
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                ) : (
                                  <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                                )}
                                <p
                                  className={`mt-1 text-[10px] ${
                                    m.from === "me"
                                      ? "text-white/70"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {m.time}
                                </p>
                              </div>
                            </div>
                          ))}
                          <TypingIndicator visible={isOtherTyping} />
                          <div className="h-2" />
                        </div>
                      )}
                    </div>
                  </main>

                  <div data-tour="messages-composer" className="border-t border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4">
                    <div className="relative mx-auto flex max-w-3xl items-end gap-3">
                      <RouteHintToast
                        visible={showRouteHint && !isLandlordContext}
                        onClose={() => setShowRouteHint(false)}
                      />
                      <button
                        aria-label="Attach"
                        className="mb-1 rounded-full p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Icon name="attach_file" />
                      </button>

                      <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-150 focus-within:border-primary/50 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(10,68,184,0.08)]">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          rows={1}
                          placeholder="Type a message..."
                          className="w-full resize-none bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400 leading-relaxed"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void sendMessage();
                            }
                          }}
                        />
                        <SendingIndicator visible={isSending} />
                      </div>

                      <button
                        aria-label="Request route access"
                        onClick={() => void sendRouteRequest()}
                        disabled={isSending || isLandlordContext}
                        className="mb-1 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title="Request route access"
                      >
                        <span className="material-symbols-outlined text-[20px]">map</span>
                      </button>

                      <button
                        aria-label="Send"
                        onClick={() => void sendMessage()}
                        disabled={isSending}
                        className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-primary/10 hover:brightness-110 hover:shadow-lg hover:shadow-primary/40 active:scale-95 disabled:opacity-60 transition-all duration-150"
                      >
                        <Icon name="send" filled />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
        <MessagesTutorial
          ready={Boolean(authToken && !isLoadingConversations)}
          isLandlord={Boolean(isLandlordContext)}
        />
      </div>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}
