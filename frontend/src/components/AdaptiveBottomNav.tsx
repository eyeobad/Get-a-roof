"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type Layout = "fixed" | "inline";

const tenantItems = [
  { label: "Explore", icon: "search", href: "/explore", id: "explore" },
  { label: "Matches", icon: "handshake", href: "/matches", id: "matches" },
  { label: "Messages", icon: "chat_bubble", href: "/messages", id: "messages" },
  { label: "Profile", icon: "person", href: "/profile", id: "profile" },
];

const dashboardItems = [
  { label: "Properties", icon: "dashboard", href: "/dashboard/properties", id: "properties" },
  { label: "Matches", icon: "handshake", href: "/dashboard/matches", id: "matches" },
  { label: "Chat", icon: "chat_bubble", href: "/dashboard/messages", id: "chat" },
  { label: "Profile", icon: "person", href: "/dashboard/profile", id: "profile" },
];

export default function AdaptiveBottomNav({
  layout = "fixed",
  className = "",
}: {
  layout?: Layout;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const normalizedPath = pathname === "/" ? "/explore" : pathname ?? "";
  const fromParam = searchParams?.get("from") ?? "";
  const decodedFrom = fromParam ? decodeURIComponent(fromParam) : "";
  const isDashboard =
    decodedFrom.includes("dashboard") || pathname?.startsWith("/dashboard");
  const navItems = isDashboard ? dashboardItems : tenantItems;
  const authToken = useAppStore((state) => state.authToken);
  const conversations = useAppStore((state) => state.conversations);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const chatHref = isDashboard ? "/dashboard/messages" : "/messages";

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
  const badgeItemId = isDashboard ? "chat" : "messages";

  const navClass =
    layout === "fixed"
      ? `fixed bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 flex items-center justify-around z-50 ${className}`
      : `w-full h-16 bg-white border-t border-gray-200 flex items-center justify-around ${className}`;

  return (
    <nav className={navClass}>
      {navItems.map((item) => {
        const href = item.id === "chat" ? chatHref : item.href;
        const matchesPath =
          normalizedPath === href || normalizedPath.startsWith(`${href}/`);
        const isActive = matchesPath;
        const showBadge = item.id === badgeItemId && unreadCount > 0;
        return (
          <Link
            key={item.id}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center h-full transition-colors ${
              isActive ? "text-[#0a44b8]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <div className="relative">
              <span className="material-symbols-outlined text-[26px]" style={isActive ? solidIconStyle : undefined}>
                {item.icon}
              </span>
              {showBadge && (
                <span className="absolute -top-1 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
