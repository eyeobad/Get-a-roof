"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import LandlordMatchesTutorial from "@/components/LandlordMatchesTutorial";

type PropertyCard = {
  id: string;
  title: string;
  area: string;
  type: string;
  beds: number;
  baths: number;
  matchCount: number;
  newCount: number;
  coverUrl: string;
  tone?: "primary" | "warning";
};

function PropertyListCard({
  card,
  filterMode,
}: {
  card: PropertyCard;
  filterMode: "all" | "new" | "top";
}) {
  const isEmpty = card.newCount === 0;
  const badgeClass = isEmpty
    ? "bg-stone-200 text-stone-400"
    : card.tone === "warning"
      ? "bg-orange-500 text-white"
      : "bg-[#0a44b8] text-white";
  const badgeValue = filterMode === "top" ? card.matchCount : card.newCount;
  const badgeLabel = filterMode === "top" ? "Total" : "New";
  const shouldDim = filterMode !== "top" && isEmpty;

  return (
    <Link
      href={`/dashboard/matches/${card.id}`}
      className={[
        "group block rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-stone-100 overflow-hidden active:scale-[0.98] transition-transform",
        shouldDim ? "bg-stone-50" : "bg-white",
      ].join(" ")}
    >
      <div className={["p-4 flex items-center gap-4", shouldDim ? "opacity-70 grayscale-[0.5]" : ""].join(" ")}>
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
              shouldDim ? "shadow-none" : "shadow-blue-900/20",
              badgeClass,
            ].join(" ")}
          >
            <span className="text-2xl font-bold leading-none mt-1">{badgeValue}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{badgeLabel}</span>
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
      chatHref="/dashboard/messages"
      rootClassName="h-20"
      containerClassName="max-w-md lg:max-w-6xl h-full w-full mx-auto flex items-center justify-between px-5"
    />
  );
}

export default function LandlordMatchesPropertyListPage() {
  const authToken = useAppStore((state) => state.authToken);
  const landlordProperties = useAppStore((state) => state.landlordPropertiesWithMatches);
  const loadLandlordPropertiesWithMatches = useAppStore(
    (state) => state.loadLandlordPropertiesWithMatches
  );
  const [filterMode, setFilterMode] = useState<"all" | "new" | "top">("all");

  const mappedProperties: PropertyCard[] = useMemo(
    () =>
      landlordProperties.map((property) => ({
        id: property.id,
        title: property.title ?? "Untitled property",
        area: property.area ?? "",
        type: property.type ?? "Property",
        beds: property.beds ?? 0,
        baths: property.baths ?? 0,
        matchCount: property.matchCount ?? property.matches ?? 0,
        newCount: property.newCount ?? 0,
        coverUrl: property.coverUrl ?? "/hero.png",
        tone: (property.newCount ?? 0) > 0 ? "primary" : undefined,
      })),
    [landlordProperties]
  );

  const totalNew = useMemo(
    () => mappedProperties.reduce((sum, item) => sum + (item.newCount ?? 0), 0),
    [mappedProperties]
  );
  const totalMatches = useMemo(
    () => mappedProperties.reduce((sum, item) => sum + (item.matchCount ?? 0), 0),
    [mappedProperties]
  );

  const filteredProperties = useMemo(() => {
    if (filterMode === "new") {
      return mappedProperties
        .filter((property) => (property.newCount ?? 0) > 0)
        .sort((a, b) => (b.newCount ?? 0) - (a.newCount ?? 0));
    }
    if (filterMode === "top") {
      return [...mappedProperties].sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0));
    }
    return [...mappedProperties].sort((a, b) => (b.newCount ?? 0) - (a.newCount ?? 0));
  }, [filterMode, mappedProperties]);

  const headerSummary = useMemo(() => {
    if (filterMode === "new") {
      return `You got ${totalNew} new candidate${totalNew === 1 ? "" : "s"} across ${filteredProperties.length} listed propert${filteredProperties.length === 1 ? "y" : "ies"}.`;
    }
    if (filterMode === "top") {
      return `Showing top properties across ${totalMatches} total match${totalMatches === 1 ? "" : "es"}`;
    }
    return `You got ${totalNew} new candidate${totalNew === 1 ? "" : "s"} across your listed propert${mappedProperties.length === 1 ? "y" : "ies"}.`;
  }, [filterMode, filteredProperties.length, mappedProperties.length, totalMatches, totalNew]);

  useEffect(() => {
    if (!authToken) return;
    void loadLandlordPropertiesWithMatches({
      sort: filterMode === "top" ? "matchesDesc" : "newDesc",
    });
  }, [authToken, filterMode, loadLandlordPropertiesWithMatches]);

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#1a1a1a] font-display antialiased flex flex-col pb-24">
      <header className="sticky top-0 z-50 bg-[#0a44b8] px-4 py-4 shadow-md text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <div />
        </div>
        <p className="text-white/80 text-sm mt-1">{headerSummary}</p>
        <div
          data-tour="landlord-matches-filters"
          className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
              filterMode === "all" ? "bg-white text-[#0a44b8]" : "bg-white/10 text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("new")}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
              filterMode === "new" ? "bg-white text-[#0a44b8]" : "bg-white/10 text-white"
            }`}
          >
            New only
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("top")}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
              filterMode === "top" ? "bg-white text-[#0a44b8]" : "bg-white/10 text-white"
            }`}
          >
            Top matches
          </button>
        </div>
      </header>

      <main data-tour="landlord-matches-list" className="flex-1 px-4 py-6 flex flex-col gap-4">
        {filteredProperties.length ? (
          filteredProperties.map((card) => (
            <PropertyListCard key={card.id} card={card} filterMode={filterMode} />
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

      <LandlordMatchesTutorial ready={Boolean(authToken)} />
      <BottomNav active="matches" />
    </div>
  );
}
