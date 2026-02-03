"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import DashboardBottomNav from "@/components/DashboardBottomNav";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type PropertyCard = {
  id: string;
  title: string;
  area: string;
  type: string;
  beds: number;
  baths: number;
  newCount: number;
  coverUrl: string;
  tone?: "primary" | "warning";
};

const sampleProperties: PropertyCard[] = [
  {
    id: "maple",
    title: "123 Maple Avenue",
    area: "South District",
    type: "House",
    beds: 3,
    baths: 2,
    newCount: 5,
    tone: "primary",
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqIAu0kQ1GflhWMuP-A5gKpS2fSgzH-SceEq9D060pr9ZxuICllWfBPljMmLN5bZvVvQLx8ivvOyNcU_C1GkD7LRxPL79nF50665aqcCP7TtwZdNWa3f_EIB9hC0F1MP_urlxAR-GXMEEVyBPS7bn00W2dGtrRb3Q2NTTFLckdrCFt_td1r5tlOU8P6eYd4HMwWSoqcusT_p2c-Ifux6ozHUG9FV-9yWHE3Zu3CK9ZQcWXbXD-g8RLO7y47GDXgKAxzaL5T5Qv4XnA",
  },
  {
    id: "broadway",
    title: "450 Broadway St, #4B",
    area: "Downtown",
    type: "Apartment",
    beds: 1,
    baths: 1,
    newCount: 2,
    tone: "primary",
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA44ONytmRLzcTkqPylL4JJl1VvH1QFba_NqAXjnurF0GvRbdYvMsTV1RFKbsnRi69_9aHr93KnQ9K-W2gGHTYIr4mesXj-DPWmtArjQhT_OMHO8HhrY01n1ypBI-no1Xe3PdsC1PzA2NmPpYaPaFhAjhlHKOCC5_OnkWpUjaK2kYwA9JLlgRsP0w0oDqM7W6TWMko6u4lmQyGFrHP5GooZChKHZVXpyoAvUxxFclF_VV7yyUnsssk6kkg5h7WjRWOWgbpKDD45QhY1",
  },
  {
    id: "oak",
    title: "78 Oak Lane",
    area: "West End",
    type: "House",
    beds: 2,
    baths: 1.5,
    newCount: 1,
    tone: "warning",
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBbG5LZXzt_L22GE6qjRpDVKxIAgSvdm19YMOrrzQeFX-f5oXEAMSpYE9cSe1YVWYEa0qhoXmJHvgCN9Sc3sZglpHKcLwTRcmZUARwJejlu3WJgu_07hOJ-7gPhGSRSxqfdyvFOzUDUM6fN3pj3pd4CVoygg0ObgPl9o_akuInaF-i1xRQj9SowvzaDt4Gs_I5bTRlN6ask0rEgnYJfrg6lDOqa4gfElYnpE5ewVX7WZN00T9HBnnpDQKeFZnPwzOeuBOoLljRMaIz9",
  },
  {
    id: "willow",
    title: "22 Willow Lane",
    area: "Northside",
    type: "House",
    beds: 3,
    baths: 2,
    newCount: 0,
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAS2F3qjzYuh38GXwptFH3zVJBCv8N-MXljlwCjbeZxqVLLvxLMpiTrl2odDe-yDJQd4eJFIvOGKUdxC-CUNOOqqU09PpDoPIR0UlQeWouKqPMPtsDW5jD-yp0XTDaAjvn16MzdcELYd2afZm-Skh21O0ZlbTFGsG2jG1DHt8bRrlN3-7PxC3b-b4NPhfLYMMynw2BV1la6V_aSzrWP5cOi3ZzSrkWfXhtRdznj0G3Yp3TKc4u2kCb1qKbQqFwOAtGBqEESVGDj7jtM",
  },
];

function PropertyListCard({ card }: { card: PropertyCard }) {
  const isEmpty = card.newCount === 0;
  const badgeClass = isEmpty
    ? "bg-stone-200 text-stone-400"
    : card.tone === "warning"
      ? "bg-orange-500 text-white"
      : "bg-[#0a44b8] text-white";

  return (
    <Link
      href={`/dashboard/matches/${card.id}`}
      className={[
        "group block rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-stone-100 overflow-hidden active:scale-[0.98] transition-transform",
        isEmpty ? "bg-stone-50" : "bg-white",
      ].join(" ")}
    >
      <div className={["p-4 flex items-center gap-4", isEmpty ? "opacity-70 grayscale-[0.5]" : ""].join(" ")}>
        <div
          aria-label={`Thumbnail of ${card.title}`}
          className="h-20 w-20 shrink-0 rounded-lg bg-stone-200 bg-center bg-cover border border-stone-100 shadow-sm"
          role="img"
          style={{ backgroundImage: `url('${card.coverUrl}')` }}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#1a1a1a] truncate group-active:text-[#0a44b8] transition-colors">
            {card.title}
          </h2>
          <p className="text-lg text-stone-600 truncate mt-0.5">
            {card.area} - {card.type}
          </p>
          <p className="text-sm text-stone-400 font-medium truncate mt-1">
            {card.beds} Bed - {card.baths} Bath
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className={[
              "flex flex-col items-center justify-center h-[60px] w-[60px] rounded-xl shadow-md",
              isEmpty ? "shadow-none" : "shadow-blue-900/20",
              badgeClass,
            ].join(" ")}
          >
            <span className="text-2xl font-bold leading-none mt-1">{card.newCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">New</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function BottomNav({ active }: { active: "properties" | "matches" | "chat" | "profile" }) {
  return (
    <DashboardBottomNav
      active={active}
      chatBadge={2}
      chatHref="/messages?from=/dashboard/matches"
      rootClassName="px-6 py-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
      containerClassName="flex justify-between items-end h-14 max-w-md mx-auto"
    />
  );
}

export default function LandlordMatchesPropertyListPage() {
  const authToken = useAppStore((state) => state.authToken);
  const landlordProperties = useAppStore((state) => state.landlordPropertiesWithMatches);
  const loadLandlordPropertiesWithMatches = useAppStore(
    (state) => state.loadLandlordPropertiesWithMatches
  );
  const [sort, setSort] = useState<"newDesc" | "matchesDesc">("newDesc");

  const mappedProperties: PropertyCard[] = useMemo(
    () =>
      (authToken ? landlordProperties : sampleProperties).map((property) => ({
        id: property.id,
        title: property.title ?? "Untitled property",
        area: property.area ?? "",
        type: property.type ?? "Property",
        beds: property.beds ?? 0,
        baths: property.baths ?? 0,
        newCount: property.newCount ?? 0,
        coverUrl: property.coverUrl ?? "/hero.png",
        tone: (property.newCount ?? 0) > 0 ? "primary" : undefined,
      })),
    [authToken, landlordProperties]
  );

  const totalNew = useMemo(
    () => mappedProperties.reduce((sum, item) => sum + (item.newCount ?? 0), 0),
    [mappedProperties]
  );

  useEffect(() => {
    if (!authToken) return;
    void loadLandlordPropertiesWithMatches({ sort });
  }, [authToken, sort, loadLandlordPropertiesWithMatches]);

  const handleSort = () => {
    setSort((prev) => (prev === "newDesc" ? "matchesDesc" : "newDesc"));
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#1a1a1a] font-display antialiased flex flex-col pb-24">
      <header className="sticky top-0 z-50 bg-[#0a44b8] px-4 py-4 shadow-md text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <button
            aria-label="Sort Properties"
            className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-white/10 transition-colors"
            type="button"
            onClick={handleSort}
          >
            <span className="material-symbols-outlined text-[28px]" style={solidIconStyle}>
              sort
            </span>
          </button>
        </div>
        <p className="text-white/80 text-sm mt-1">
          Select a property to view {totalNew} new candidate
          {totalNew === 1 ? "" : "s"}
        </p>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-4">
        {mappedProperties.length ? (
          mappedProperties.map((card) => (
            <PropertyListCard key={card.id} card={card} />
          ))
        ) : authToken ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-stone-500">
            No matches yet. Keep your listings active to attract tenants.
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-stone-500">
            Sign in to view your matches.
          </div>
        )}
      </main>

      <BottomNav active="matches" />
    </div>
  );
}
