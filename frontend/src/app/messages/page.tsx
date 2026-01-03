"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";

type Conversation = {
  id: string;
  name: string;
  preview: string;
  time: string;
  image: string;
  unread?: boolean;
};

type Message = {
  id: string;
  convoId: string;
  from: "me" | "them";
  text: string;
  time: string;
};

const conversations: Conversation[] = [
  {
    id: "convo-1",
    name: "123 Maple St",
    preview: "Hi, when are you available to view the property?",
    time: "10:42 AM",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBnA6YW67ntfEuqnMOSWzVaD1K1Q1skfZSRnyd4LtWmxBfQoLwvnGwcA9n_1wT05sokh7ilLW5kYDSXeCy2IpZJzifVJtgbmn0MoPAVOyu9Pl6_IkJKyl-NEAKrIGKKPtlkvSLUtUCJthjp_VVKFpQAYBxiEaf3Ojr58k4qqLVtTnFtyKyrCj6SKvPjGuP9lw4uOy1gbmmW2Gg2wagvZqaST1RpGhet6PRvRJgrSfoA-MCEeebPTxYZsm3UrvbAgv5Ud6ttkolVUmBR",
    unread: true,
  },
  {
    id: "convo-2",
    name: "John Smith",
    preview: "Thanks for the application. I'll review it shortly.",
    time: "Yesterday",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuClBOwibdwWto3BED8-CUa5jhc3DIU_0Y1IyggfYnC9Tlzme7JFnFrZ_wwAhPWWJsq0jD_FsqHcObP4WIECWQQlIlc1p0ev307oib5dmz9nO6nwD78IrVvHIqLbhtoHl_78jROgLM5UlxeZ_40AYT7gAmzWCNzacdAvAzqvktxJE1L5gfjdxCM-sFZi3AyYMWGB-C_UPvudaCHlT8MttMpx7Oz8C5Mi18UJgPWmLGxyD81y64dCibzdnTNiNlamPjKyFdfTdtS6-Zlw",
  },
  {
    id: "convo-3",
    name: "Sunset Apartments",
    preview: "Let me check the lease terms for you.",
    time: "Monday",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC3MriWzu1VrFnfCCLxgO8GNqoBpTokcV8kecTDcCZsLuT7KN2Z9_mhmcVsmroQo6yFZF7bMOTvJJThWQByKgj-GQ7W09ozqZbIIsZaFWLhRl-tXhFIusSTDRwEfzT6kCi5xo5NZOjoB1Bi_AqAyEjq95-vcmAzBfKpvCC5XVbEEZPqZA4CPJTpL-ICcHbQSTPA70C_QTYKStnj11UcoqlHJ1RoVeMBPmJ4wA5uuE4b6LX_s88vKIUhc2zndKP12-i0QYDJR2GD_nkD",
  },
  {
    id: "convo-4",
    name: "Martha Garden",
    preview: "Is the parking spot included in the rent?",
    time: "Sunday",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAUUz679dmV9a4mjgH4e_iJ-U-CSewiEz7u-O5kzW-m1MQ5aBMWtqGWSNs2m4TlQNqlfIaA30AaztmmgHMFS4SmkkQ0qRU5C7EKknZUcCa9rHddPyqkUqoiN-w-tmySGixbjJF0KS6su4iUp0fNrqRdyBcxJ59hBMdBFO8yavo33oeuekSCAM7THt2yHyDROPGtdA2Eb1eBA2kzqek_HeveMLyM6tQ79ayjApPr9uTdCnFJEIo8g43E9zLwNyWlyr7NXyOxW4G77zNb",
  },
  {
    id: "convo-5",
    name: "The Height Listings",
    preview: "We have a new unit opening up on the 5th floor.",
    time: "Oct 24",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAtcCG0_iuWPf4sIUrOnIP1Klrko3ruUfUuFgIB2zNaohMmkMeApooY9uc8UvCUs-BRdu8JUy3xnQ4yIexocbyD0jXo2bZ24F6HX1amKNAlnjNokNNcHDdggh4Ku-BcQEpbqjcF8Yd21CNVzwnVXkGiarsQ20K2YUeBaOTm70Gtyp1obpFJWl2m-mf93lkAv4GXxXhEfmnfxQUOTv2-mO6zVtLSoVlEbhJcewL6T2chJWgD-zBeplmlTe-HhfRmr5CHmwNSh2TJDDxt",
  },
];

const seedMessages: Message[] = [
  {
    id: "m1",
    convoId: "convo-1",
    from: "them",
    text: "Hi, when are you available to view the property?",
    time: "10:42 AM",
  },
  {
    id: "m2",
    convoId: "convo-1",
    from: "me",
    text: "Tomorrow afternoon works. Does 2pm suit you?",
    time: "10:44 AM",
  },
  {
    id: "m3",
    convoId: "convo-2",
    from: "them",
    text: "Thanks for the application. I'll review it shortly.",
    time: "Yesterday",
  },
  {
    id: "m4",
    convoId: "convo-3",
    from: "them",
    text: "Let me check the lease terms for you.",
    time: "Monday",
  },
];

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

export default function MessagesPage() {
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "convo-1");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>(seedMessages);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [activeId]
  );

  const activeMessages = useMemo(
    () => messages.filter((m) => m.convoId === activeId),
    [messages, activeId]
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const openConversation = (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    // optional: mark unread off in UI state here if you want
  };

  const sendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const next: Message = {
      id: `m-${Date.now()}`,
      convoId: activeId,
      from: "me",
      text: trimmed,
      time: "Now",
    };

    setMessages((prev) => [...prev, next]);
    setMessageText("");

    // scroll to bottom next tick
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  return (
    <>
      {/* MOBILE */}
      <div className="relative flex h-screen w-full max-w-md flex-col overflow-hidden bg-background-light text-slate-900 shadow-2xl lg:hidden">
        {/* Mobile List View */}
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
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => openConversation(conversation.id)}
                  className="group flex w-full cursor-pointer border-b border-slate-200 bg-background-light px-5 py-4 transition-colors hover:bg-white hover:text-primary"
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
              ))}
            </main>

            <BottomNav className="lg:hidden" />
          </>
        )}

        {/* Mobile Chat View */}
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
                  <p className="text-xs text-slate-500">Online</p>
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
                          sendMessage();
                        }
                      }}
                    />
                  </div>

                  <button
                    aria-label="Send"
                    onClick={sendMessage}
                    className="rounded-full bg-primary p-3 text-white shadow-sm hover:brightness-110 active:scale-95 transition"
                  >
                    <Icon name="send" filled />
                  </button>
                </div>
              </div>

              <div className="pb-safe" />
            </div>
          </>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block h-screen overflow-hidden bg-background-light text-slate-900">
        <div className="relative h-screen overflow-hidden">
          {/* Content area (reserve space for desktop bottom nav) */}
          <div className="flex h-full pb-[76px]">
            {/* LEFT: conversations list (scrollable, no visible scrollbar) */}
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

              <main
                ref={listRef}
                className="flex-1 overflow-y-auto pr-2"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <style>{`
                  /* hide scrollbar (desktop list + chat) */
                  .no-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
                `}</style>

                <div className="no-scrollbar">
                  {conversations.map((conversation) => {
                    const isActive = conversation.id === activeId;
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setActiveId(conversation.id)}
                        className={`w-full px-6 py-4 border-b border-slate-100 text-left transition-colors ${
                          isActive
                            ? "bg-primary/5"
                            : "bg-white hover:bg-slate-50"
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
            </aside>

            {/* RIGHT: chat panel */}
            <section className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
              {/* Chat header */}
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
                    <p className="text-xs text-slate-500">Online</p>
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

              {/* Messages */}
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
                    <div className="h-2" />
                  </div>
                </div>
              </main>

              {/* Composer */}
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
                          sendMessage();
                        }
                      }}
                    />
                  </div>

                  <button
                    aria-label="Send"
                    onClick={sendMessage}
                    className="rounded-full bg-primary p-3 text-white shadow-sm hover:brightness-110 active:scale-95 transition"
                  >
                    <Icon name="send" filled />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <BottomNav className="hidden lg:block" />
        </div>
      </div>

    </>
  );
}
