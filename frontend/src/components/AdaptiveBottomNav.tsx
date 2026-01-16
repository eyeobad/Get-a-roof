"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type Layout = "fixed" | "inline";

const tenantItems = [
  { label: "Explore", icon: "search", href: "/explore", id: "explore" },
  { label: "Matches", icon: "groups", href: "/matches", id: "matches" },
  { label: "Messages", icon: "chat_bubble", href: "/messages", id: "messages" },
  { label: "Profile", icon: "person", href: "/profile", id: "profile" },
];

const dashboardItems = [
  { label: "Properties", icon: "dashboard", href: "/dashboard/properties", id: "properties" },
  { label: "Matches", icon: "group", href: "/dashboard/matches", id: "matches" },
  { label: "Chat", icon: "chat_bubble", href: "/messages", id: "chat" },
  { label: "Profile", icon: "person", href: "/dashboard/profile", id: "profile" },
];

export default function AdaptiveBottomNav({
  layout = "fixed",
  activeTab = "messages",
}: {
  layout?: Layout;
  activeTab?: "messages" | "chat";
}) {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") ?? "";
  const decodedFrom = fromParam ? decodeURIComponent(fromParam) : "";
  const isDashboard = decodedFrom.includes("dashboard");
  const navItems = isDashboard ? dashboardItems : tenantItems;
  const chatHref = isDashboard
    ? `/messages?from=${encodeURIComponent(
        decodedFrom || "/dashboard/matches"
      )}`
    : "/messages";

  const navClass =
    layout === "fixed"
      ? "fixed bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 flex items-center justify-around z-50"
      : "w-full h-16 bg-white border-t border-gray-200 flex items-center justify-around";

  return (
    <nav className={navClass}>
      {navItems.map((item) => {
        const href = item.id === "chat" ? chatHref : item.href;
        const isActive = item.id === "chat" ? activeTab === "chat" : activeTab === "messages" && item.id === "messages";
        return (
          <Link
            key={item.label}
            href={href}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              isActive ? "text-[#0a44b8]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <div className="relative">
              <span className="material-symbols-outlined text-[26px]" style={isActive ? solidIconStyle : undefined}>
                {item.icon}
              </span>
            </div>
            <span className="text-[11px] font-semibold mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
