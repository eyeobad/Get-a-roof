"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AdaptiveBottomNav from "@/components/AdaptiveBottomNav";
import { useAppStore } from "@/store/useAppStore";
import { getSocket } from "@/lib/socket";

type Conversation = {
  id: string;
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

function SendingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
      <span className="inline-flex h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
      <span className="font-medium">Sending...</span>
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

function MessagesContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const threadParam = searchParams?.get("thread") ?? "";
  const fromParam = searchParams?.get("from") ?? "";
  const isLandlordContext =
    fromParam.startsWith("/dashboard") || pathname?.startsWith("/dashboard");
  const storeConversations = useAppStore((state) => state.conversations);
  const messagesByMatch = useAppStore((state) => state.messagesByMatch);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const loadMessagesForMatch = useAppStore((state) => state.loadMessagesForMatch);
  const sendMessageToApi = useAppStore((state) => state.sendMessage);
  const markMatchRead = useAppStore((state) => state.markMatchRead);
  const setSelectedThreadId = useAppStore((state) => state.setSelectedThreadId);
  const userId = useAppStore((state) => state.userId);
  const authToken = useAppStore((state) => state.authToken);
  const typingByMatch = useAppStore((state) => state.typingByMatch);

  const conversations = useMemo<Conversation[]>(
    () =>
      storeConversations.map((conversation) => ({
        id: conversation.id,
        name: conversation.title,
        preview: conversation.preview ?? "Start a conversation",
        time: conversation.time ?? "",
        image: conversation.image ?? "/hero.png",
        unread: conversation.unread,
        tenantId: conversation.tenantId,
        landlordId: conversation.landlordId,
      })),
    [storeConversations]
  );

  const [activeId, setActiveId] = useState(() => threadParam);
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    () => (threadParam ? "chat" : "list")
  );
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const activeConversationId =
    activeId || threadParam || conversations[0]?.id || "";

  const activeConversation = useMemo(
    () =>
      conversations.find((c) => c.id === activeConversationId) ??
      conversations[0],
    [conversations, activeConversationId]
  );

  const activeMessages = useMemo(
    () => {
      const thread = messagesByMatch[activeConversationId] ?? [];
      return thread.map((message) => ({
        id: message.id,
        convoId: activeConversationId,
        from: message.senderId === userId ? "me" : "them",
        text: message.content,
        time: new Date(message.timestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      }));
    },
    [messagesByMatch, activeConversationId, userId]
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    void markMatchRead(id);
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

  useEffect(() => {
    if (authToken) {
      void loadConversations();
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
      setSelectedThreadId(activeConversationId);
      void loadMessagesForMatch(activeConversationId);
      void markMatchRead(activeConversationId);
    }
  }, [
    activeConversationId,
    messagesByMatch,
    loadMessagesForMatch,
    markMatchRead,
    setSelectedThreadId,
  ]);

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
              <button
                aria-label="New Message"
                className="rounded-full p-2 text-primary hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[28px]">
                  edit_square
                </span>
              </button>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
              {conversations.length === 0 ? (
                <EmptyState
                  title={isLandlordContext ? "No tenant messages yet" : "No conversations yet"}
                  message={
                    isLandlordContext
                      ? "When a tenant contacts you about a property, their chat will show up here."
                      : "Once you like a listing, you can start chatting with the landlord here."
                  }
                  ctaLabel={isLandlordContext ? "View properties" : "Find listings"}
                  ctaHref={isLandlordContext ? "/dashboard/properties" : "/explore"}
                />
              ) : (
                conversations.map((conversation) => (
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

            <AdaptiveBottomNav
              layout="fixed"
              className="lg:hidden"
            />
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

              <button
                aria-label="More"
                className="rounded-full p-2 hover:bg-slate-100 transition-colors text-slate-700"
              >
                <Icon name="more_vert" />
              </button>
            </header>

            <main
              ref={chatRef}
              className="flex-1 overflow-y-auto px-4 py-4 pb-28"
            >
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
                      <p className="text-sm font-medium leading-relaxed">
                        {m.text}
                      </p>
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
            </main>

            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-end gap-3">
                  <button
                    aria-label="Attach"
                    className="rounded-full p-2 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    <Icon name="attach_file" />
                  </button>

                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={1}
                      placeholder="Message..."
                      className="w-full resize-none bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                  </div>

                  <SendingIndicator visible={isSending} />

                  <button
                    aria-label="Send"
                    onClick={() => void sendMessage()}
                    className="rounded-full bg-primary p-3 text-white shadow-sm hover:brightness-110 active:scale-95 transition"
                    disabled={isSending}
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
                    {conversations.length} chats
                  </p>
                </div>
                <button
                  aria-label="New Message"
                  className="rounded-full p-2 text-primary hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[26px]">
                    edit_square
                  </span>
                </button>
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
                  {conversations.map((conversation) => {
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
                  })}
                  <div className="h-4" />
                </div>
              </main>

              {/* BottomNav pinned to the bottom of the LEFT column only */}
              <AdaptiveBottomNav
                layout="inline"
                className="hidden lg:flex"
              />
            </aside>

            {/* RIGHT: chat panel (NO BottomNav under here) */}
            <section className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
              {conversations.length === 0 ? (
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

                    <div className="flex items-center gap-2">
                      <button className="rounded-full p-2 hover:bg-slate-100 text-slate-700 transition-colors">
                        <Icon name="call" />
                      </button>
                      <button className="rounded-full p-2 hover:bg-slate-100 text-slate-700 transition-colors">
                        <Icon name="videocam" />
                      </button>
                      <button className="rounded-full p-2 hover:bg-slate-100 text-slate-700 transition-colors">
                        <Icon name="more_vert" />
                      </button>
                    </div>
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
                              <p className="text-sm font-medium leading-relaxed">
                                {m.text}
                              </p>
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
                    </div>
                  </main>

                  <div className="border-t border-slate-200 bg-white px-6 py-4">
                    <div className="mx-auto flex max-w-3xl items-end gap-3">
                      <button
                        aria-label="Attach"
                        className="rounded-full p-2 hover:bg-slate-100 text-slate-700 transition-colors"
                      >
                        <Icon name="attach_file" />
                      </button>

                      <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          rows={1}
                          placeholder="Type a message..."
                          className="w-full resize-none bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void sendMessage();
                            }
                          }}
                        />
                      </div>

                      <SendingIndicator visible={isSending} />

                      <button
                        aria-label="Send"
                        onClick={() => void sendMessage()}
                        className="rounded-full bg-primary p-3 text-white shadow-sm hover:brightness-110 active:scale-95 transition"
                        disabled={isSending}
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
