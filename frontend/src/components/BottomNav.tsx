"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Explore", icon: "search", href: "/explore" },
  { label: "Matches", icon: "groups", href: "/matches" },
  { label: "Messages", icon: "chat_bubble", href: "/messages" },
  { label: "Profile", icon: "person", href: "/profile" },
];

const solidStyle = { fontVariationSettings: "'FILL' 1" };

type BottomNavProps = {
  className?: string;
};

export default function BottomNav({ className = "" }: BottomNavProps) {
  const pathname = usePathname();
  const normalizedPath = pathname === "/" ? "/explore" : pathname;

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
              <div className="p-1 rounded-full group-hover:bg-primary/5 transition-colors">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={solidStyle}
                >
                  {item.icon}
                </span>
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
