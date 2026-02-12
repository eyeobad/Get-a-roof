"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import AnimatedIcon from "@/components/AnimatedIcon";
import { useAppStore } from "@/store/useAppStore";
import { type MotionScheme } from "@/lib/motion";

const navItems = [
  { label: "Explore", icon: "search", href: "/explore" },
  { label: "Matches", icon: "handshake", href: "/matches" },
  { label: "Messages", icon: "chat_bubble", href: "/messages" },
  { label: "Profile", icon: "person", href: "/profile" },
];

type BottomNavProps = {
  className?: string;
  scheme?: MotionScheme;
};

export default function BottomNav({ className = "", scheme }: BottomNavProps) {
  const pathname = usePathname();
  const normalizedPath = pathname === "/" ? "/explore" : pathname ?? "";
  const authToken = useAppStore((state) => state.authToken);
  const conversations = useAppStore((state) => state.conversations);
  const loadConversations = useAppStore((state) => state.loadConversations);

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

  return (
    <nav
      className={`flex-none bg-white border-t border-slate-200 pb-safe z-30 ${className}`}
    >
      <div className="flex justify-around items-end pt-3 pb-4 px-2">
        {navItems.map((item) => {
          const isActive = normalizedPath.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 group transition-colors ${
                isActive ? "text-primary" : "text-slate-400"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative p-1 rounded-full group-hover:bg-primary/5 transition-colors">
                <AnimatedIcon
                  name={item.icon}
                  active={isActive}
                  scheme={isActive ? "expressive" : scheme}
                />
                {item.label === "Messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-semibold ${isActive ? "text-primary" : ""}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
