"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import DashboardBottomNav from "@/components/DashboardBottomNav";

type TagTone = "primary" | "success";
type NoteTone = "info" | "neutral";

type MatchTag = {
  label: string;
  tone?: TagTone;
};

type MatchCard = {
  id: string;
  name: string;
  role: string;
  time: string;
  tags: MatchTag[];
  note?: string;
  noteTone?: NoteTone;
  avatarUrl: string;
  verified?: boolean;
  tenantId?: string;
  chatHref: string;
};

function MatchCardView({ match }: { match: MatchCard }) {
  return (
    <section className="bg-white rounded-xl shadow border p-5 space-y-4">
      <div className="flex gap-4">
        <div className="relative">
          <Image
            src={match.avatarUrl}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            alt={`${match.name} avatar`}
          />
          {match.verified ? (
            <span className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              <span className="material-symbols-outlined text-white text-sm">
                check
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex-1">
          <div className="flex justify-between">
            <h2 className="text-lg font-bold">{match.name}</h2>
            <span className="text-sm text-gray-500">{match.time}</span>
          </div>
          <p className="text-gray-600">{match.role}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            {match.tags.map((tag) => (
              <span
                key={tag.label}
                className={[
                  "px-3 py-1 text-sm font-semibold rounded-full border",
                  tag.tone === "success"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-blue-50 text-[#0a44b8] border-blue-100",
                ].join(" ")}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {match.note ? (
        <div
          className={[
            "rounded-lg p-3 flex gap-2 border",
            match.noteTone === "neutral"
              ? "bg-gray-50 border-gray-200 text-gray-600"
              : "bg-blue-50 border-blue-100",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[#0a44b8]">
            thumb_up
          </span>
          <p className="text-sm">{match.note}</p>
        </div>
      ) : null}

      <div className="flex gap-3">
        <Link
          href={match.chatHref}
          className="w-14 h-14 rounded-full border-2 border-[#0a44b8]/30 flex items-center justify-center text-[#0a44b8]"
          aria-label={`Chat with ${match.name}`}
        >
          <span className="material-symbols-outlined">chat</span>
        </Link>
        {match.tenantId ? (
          <Link
            href={`/dashboard/tenants/${match.tenantId}`}
            className="flex-1 h-14 rounded-full bg-[#0a44b8] text-white font-bold text-lg shadow active:scale-95 flex items-center justify-center"
          >
            View Profile
          </Link>
        ) : (
          <button className="flex-1 h-14 rounded-full bg-[#0a44b8] text-white font-bold text-lg shadow active:scale-95">
            View Profile
          </button>
        )}
      </div>
    </section>
  );
}

function BottomNav({ active }: { active: "properties" | "matches" | "chat" | "profile" }) {
  return (
    <DashboardBottomNav
      active={active}
      chatHref="/dashboard/messages"
      rootClassName="py-2 shadow flex justify-around bg-white border-t z-50"
      containerClassName="flex justify-between items-end h-14 w-full max-w-md mx-auto"
    />
  );
}

export default function LandlordMatchesPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = params?.propertyId as string;
  const authToken = useAppStore((state) => state.authToken);
  const landlordMatches = useAppStore(
    (state) => state.landlordMatchesByProperty[propertyId] ?? []
  );
  const loadLandlordPropertyMatches = useAppStore(
    (state) => state.loadLandlordPropertyMatches
  );
  const markLandlordPropertyMatchesSeen = useAppStore(
    (state) => state.markLandlordPropertyMatchesSeen
  );
  const [isLoading, setIsLoading] = useState(false);

  const matches = useMemo<MatchCard[]>(() => {
    return landlordMatches.map((match) => {
      const tenant = match.tenant;
      const name = tenant
        ? `${tenant.firstName ?? ""} ${tenant.lastName ?? ""}`.trim()
        : "Tenant";
      const role =
        tenant?.preferences?.tenant?.employmentStatus ||
        tenant?.preferences?.tenant?.educationLevel ||
        "Tenant";
      const tags: MatchTag[] = [];
      if (match.isNewForLandlord) {
        tags.push({ label: "New" });
      }
      if (match.preferencesMatchPercentage !== undefined) {
        tags.push({
          label: `Preferences ${Math.round(match.preferencesMatchPercentage)}% Match`,
        });
      }
      if (match.apartmentPreferenceMatchPercentage !== undefined) {
        tags.push({
          label: `Apartment Preference ${Math.round(
            match.apartmentPreferenceMatchPercentage
          )}% Match`,
        });
      }
      if (match.matchScore !== undefined && match.matchScore >= 80) {
        tags.push({ label: `${match.matchScore}% Match Score`, tone: "success" });
      }

      const time = match.updatedAt
        ? new Date(match.updatedAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })
        : "";
      const note = match.matchScore
        ? `Overall match score: ${match.matchScore}%`
        : undefined;

      return {
        id: match.id,
        name: name || "Tenant",
        role,
        time,
        tags: tags.length ? tags : [{ label: "New match" }],
        note,
        noteTone: note ? "info" : undefined,
        avatarUrl: tenant?.photoUrl ?? "https://i.pravatar.cc/100?img=32",
        verified: tenant?.isVerified ?? false,
        tenantId: tenant?.id ?? match.tenantId,
        chatHref: `/dashboard/messages?thread=${match.id}`,
      };
    });
  }, [landlordMatches, propertyId]);

  const newCount = useMemo(
    () => landlordMatches.filter((match) => match.isNewForLandlord).length,
    [landlordMatches]
  );

  useEffect(() => {
    if (!authToken || !propertyId) return;
    let active = true;
    setIsLoading(true);
    (async () => {
      await loadLandlordPropertyMatches(propertyId);
      await markLandlordPropertyMatchesSeen(propertyId);
      if (active) {
        setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    authToken,
    propertyId,
    loadLandlordPropertyMatches,
    markLandlordPropertyMatchesSeen,
  ]);

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-gray-900 font-display antialiased pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a44b8] text-white shadow-md z-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Matches</h1>
            <button
              type="button"
              className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center"
              aria-label="Filter matches"
            >
              <span className="material-symbols-outlined text-2xl">tune</span>
            </button>
          </div>
          <p className="text-sm opacity-80 mt-1">
            {newCount} new match{newCount === 1 ? "" : "es"} waiting for review
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-stone-500">
            Loading matches...
          </div>
        ) : matches.length ? (
          matches.map((match) => <MatchCardView key={match.id} match={match} />)
        ) : authToken ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-stone-500">
            No matches yet for this property.
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-stone-500">
            Sign in to view property matches.
          </div>
        )}

        {!matches.length && !isLoading ? (
          <div className="text-center text-gray-500 mt-6">
            <span className="material-symbols-outlined text-4xl">check</span>
            <p className="mt-2 font-medium">You&apos;re all caught up!</p>
          </div>
        ) : null}
      </main>

      <BottomNav active="matches" />
    </div>
  );
}
