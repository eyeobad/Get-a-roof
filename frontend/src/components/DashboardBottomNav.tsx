"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";

type NavItemId = "overview" | "properties" | "matches" | "chat" | "profile";

type DashboardBottomNavProps = {
  active?: NavItemId;
  chatBadge?: number;
  chatHref?: string;
  rootClassName?: string;
  containerClassName?: string;
};

const iconStyle: CSSProperties = {
  fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
};

const NAV_ITEMS: Array<{ id: NavItemId; label: string; icon: string; href: string }> = [
  { id: "overview", label: "Overview", icon: "insights", href: "/dashboard/overview" },
  { id: "properties", label: "Properties", icon: "dashboard", href: "/dashboard/properties" },
  { id: "matches", label: "Matches", icon: "handshake", href: "/dashboard/matches" },
  { id: "chat", label: "Chat", icon: "chat_bubble", href: "/dashboard/messages" },
  { id: "profile", label: "Profile", icon: "person", href: "/dashboard/profile" },
];

export default function DashboardBottomNav({
  active,
  chatBadge,
  chatHref,
  rootClassName = "",
  containerClassName = "max-w-md h-full w-full mx-auto flex items-center justify-between px-4",
}: DashboardBottomNavProps) {
  const pathname = usePathname();
  const authToken = useAppStore((state) => state.authToken);
  const conversations = useAppStore((state) => state.conversations);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const current =
    active ??
    (pathname?.startsWith("/dashboard/overview") ? "overview" : pathname?.startsWith("/dashboard/matches") ? "matches" : pathname?.startsWith("/dashboard/properties") ? "properties" : pathname?.startsWith("/dashboard/profile") ? "profile" : pathname?.startsWith("/dashboard/messages") ? "chat" : undefined) ??
    (pathname === "/messages" ? "chat" : undefined);

  useEffect(() => {
    if (authToken) {
      void loadConversations();
    }
  }, [authToken, loadConversations]);

  const unreadCount = useMemo(
    () =>
      conversations.reduce(
        (sum, item) =>
          sum +
          (typeof item.unreadCount === "number"
            ? item.unreadCount
            : item.unread
              ? 1
              : 0),
        0
      ),
    [conversations]
  );
  const resolvedBadge =
    typeof chatBadge === "number" ? chatBadge : unreadCount;

  return (
    <nav
      className={[
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.06)] pb-safe z-50",
        rootClassName,
      ].join(" ")}
    >
      <div className={containerClassName}>
        {NAV_ITEMS.map((item) => {
          const isActive = current === item.id;
          const href =
            item.id === "chat" && chatHref ? chatHref : item.href;
          const badge = item.id === "chat" ? resolvedBadge : undefined;
          return (
            <Link
              key={item.id}
              href={href}
              className={[
                "flex flex-col items-center justify-center gap-0.5 w-16 transition-colors",
                isActive ? "text-[#0a44b8]" : "text-gray-400 hover:text-[#0a44b8]",
              ].join(" ")}
            >
              <div className="relative">
                <span className="material-symbols-outlined text-[32px]" style={iconStyle}>
                  {item.icon}
                </span>
                {typeof badge === "number" && badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
