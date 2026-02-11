"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import DashboardBottomNav from "@/components/DashboardBottomNav";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type PropertyStatus = "Listed" | "Draft";

type Property = {
  id: string;
  status: PropertyStatus;
  title: string;
  price: number;
  beds: number;
  baths: number;
  matches?: number; // only for listed
  newCount?: number;
  coverUrl: string;
};

function Money({ value }: { value: number }) {
  const formatted = useMemo(
    () =>
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(value),
    [value]
  );
  return <>{formatted}</>;
}

function StatusPill({ status }: { status: PropertyStatus }) {
  if (status === "Listed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
        Listed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-700">
      Draft
    </span>
  );
}

function IconStat({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <span className="material-symbols-outlined text-[18px]" style={solidIconStyle}>
        {icon}
      </span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}

function PropertyCard({
  p,
  onEdit,
  onMatches,
  onContinue,
}: {
  p: Property;
  onEdit: (id: string) => void;
  onMatches: (id: string) => void;
  onContinue: (id: string) => void;
}) {
  const isDraft = p.status === "Draft";
  const matchesLabel =
    typeof p.matches === "number" ? `${p.matches} Matches` : "Matches";

  return (
    <article
      className={[
        "bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col",
        isDraft ? "opacity-90" : "",
      ].join(" ")}
    >
      <div className="p-4 flex gap-4">
        <div
          className={[
            "w-28 h-28 shrink-0 rounded-xl bg-gray-200 bg-cover bg-center",
            isDraft ? "grayscale" : "",
          ].join(" ")}
          style={{ backgroundImage: `url('${p.coverUrl}')` }}
          aria-label={`${p.title} cover`}
        />
        <div className="flex-1 flex flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between">
            <StatusPill status={p.status} />
          </div>

          <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
            {p.title}
          </h2>

          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-extrabold text-[#0a44b8]">
              <Money value={p.price} />
            </span>
            <span className="text-[14px] text-gray-500 font-medium">/ yr</span>
          </div>

          <div className="flex items-center gap-4 mt-0.5">
            <IconStat icon="bed" value={p.beds} />
            <IconStat icon="bathtub" value={p.baths} />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      {!isDraft ? (
        <div className="flex border-t border-gray-100 h-14">
          <button
            type="button"
            onClick={() => onEdit(p.id)}
            className="flex-1 flex items-center justify-center gap-2 text-gray-700 font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>
              edit
            </span>
            Edit
          </button>
          <div className="w-px bg-gray-100" />
          <button
            type="button"
            onClick={() => onMatches(p.id)}
            className={[
              "flex-1 flex items-center justify-center gap-2 font-bold transition-colors",
              (p.matches ?? 0) > 0
                ? "bg-[#0a44b8]/5 text-[#0a44b8] hover:bg-[#0a44b8]/10 active:bg-[#0a44b8]/15"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>
              {(p.matches ?? 0) > 0 ? "person_search" : "visibility"}
            </span>
            {matchesLabel}
          </button>
        </div>
      ) : (
        <div className="flex border-t border-gray-100 h-14">
          <button
            type="button"
            onClick={() => onContinue(p.id)}
            className="w-full flex items-center justify-center gap-2 text-[#0a44b8] font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>
              arrow_forward
            </span>
            Continue Editing
          </button>
        </div>
      )}
    </article>
  );
}

 
function BottomNav({ active }: { active: "properties" | "matches" | "chat" | "profile" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get("from") ?? "";
  const dashboardSources = new Set(["/dashboard/properties", "/dashboard/matches"]);
  const isDashboardRoute =
    pathname?.startsWith("/dashboard/") || pathname === "/dashboard";
  const showDashboardNav =
    isDashboardRoute ||
    (pathname === "/messages" && dashboardSources.has(fromParam));
  const chatHref = "/dashboard/messages";

  if (!showDashboardNav) {
    return (
      <nav className="fixed bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 flex items-center justify-around z-50">
        <Link href="/messages">
          <span className="material-symbols-outlined">chat_bubble</span>
        </Link>
        <Link href="/properties">
          <span className="material-symbols-outlined">home</span>
        </Link>
        <Link href="/profile">
          <span className="material-symbols-outlined">person</span>
        </Link>
      </nav>
    );
  }

  return (
    <DashboardBottomNav
      active={active}
      chatHref={chatHref}
      rootClassName="h-20"
      containerClassName="max-w-md h-full w-full mx-auto flex items-center justify-between px-4"
    />
  );
}

export default function LandlordDashboardPage() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const user = useAppStore((state) => state.user);
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const landlordProperties = useAppStore((state) => state.landlordProperties);
  const loadLandlordProperties = useAppStore((state) => state.loadLandlordProperties);
  const loadLandlordDraftById = useAppStore((state) => state.loadLandlordDraftById);
  const clearLandlordDraft = useAppStore((state) => state.clearLandlordDraft);

  const mappedProperties: Property[] = useMemo(
    () =>
      landlordProperties.map((property) => ({
        id: property.id,
        status: (property.status as PropertyStatus) ?? "Draft",
        title: property.title ?? "Untitled property",
        price: property.price ?? 0,
        beds: property.beds ?? 0,
        baths: property.baths ?? 0,
        matches: property.matches ?? property.matchCount ?? 0,
        newCount: property.newCount ?? 0,
        coverUrl: property.coverUrl ?? "/hero.png",
      })),
    [landlordProperties]
  );

  useEffect(() => {
    if (!authToken) return;
    void loadLandlordProperties();
    if (!user?.photoUrl) {
      void fetchUserProfile();
    }
  }, [authToken, loadLandlordProperties, fetchUserProfile, user?.photoUrl]);

  useEffect(() => {
    if (!authToken) return;
    const timer = setTimeout(() => {
      void loadLandlordProperties({ q: q.trim() || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [authToken, q, loadLandlordProperties]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mappedProperties;
    return mappedProperties.filter((p) => p.title.toLowerCase().includes(s));
  }, [q, mappedProperties]);

  const openDraft = async (id: string) => {
    if (authToken) {
      await loadLandlordDraftById(id);
    }
    router.push(`/add-property-photos?propertyId=${id}`);
  };

  const goAddProperty = () => {
    clearLandlordDraft();
    router.push("/add-property-photos");
  };

  const onEdit = (id: string) => void openDraft(id);
  const onContinue = (id: string) => void openDraft(id);
  const onMatches = (id: string) => {
    router.push(`/dashboard/matches/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f6f8]/95 backdrop-blur-sm border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#0a44b8] tracking-tight leading-none">
            My Properties
          </h1>
          <p className="text-[18px] text-gray-600 font-medium mt-1">Dashboard</p>
        </div>

        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 hover:ring-4 ring-[#0a44b8]/20 transition-all focus:outline-none focus:ring-4">
          <Image
            alt="Profile avatar"
            src={
              user?.photoUrl ||
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDfCV60c8Lx3OwS6F6pZlph9DX90dUTo4gA-2YMIEaOfPWkF0OHDzVIPspyJrie7yszZDJ8i3bhK9EnT2M8zTDYy8P4IKH2cs9FIy0PJW0j7AukRcImec7aji1iXCosy05vO23XbOMn2NC5IzoLg_4wAEMKJaEeUhUnvhl1H4GoUSg30PBswRZsVoscA5v1ZuxEZ1pALXC3zJGeTCY1-4rsmKIaTCim5Sr4qpQRoBvLxb1TWRGOIuIaZJ3oxRP0qomRnhWGfzJhIm8P"
            }
            fill
            className="object-cover"
          />
        </div>
      </header>

      {/* Main */}
      <main className="px-5 pt-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Search */}
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[24px]"
            style={solidIconStyle}
          >
            search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-300 bg-white text-[18px] shadow-sm focus:ring-2 focus:ring-[#0a44b8] focus:border-[#0a44b8]"
            placeholder="Search properties..."
            type="text"
          />
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-6">
          {filtered.length ? (
            filtered.map((p) => (
              <PropertyCard
                key={p.id}
                p={p}
                onEdit={onEdit}
                onMatches={onMatches}
                onContinue={onContinue}
              />
            ))
          ) : authToken ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500 space-y-4">
              <p>No properties yet. Start by adding your first listing.</p>
            <button
              type="button"
              onClick={goAddProperty}
              className="inline-flex items-center justify-center rounded-full bg-[#0a44b8] text-white text-sm font-bold px-5 py-2.5 shadow-sm cursor-pointer"
            >
              <span onClick={goAddProperty} className="cursor-pointer">
                Add Property
              </span>
            </button>
          </div>
        ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
              Sign in to load your properties.
            </div>
          )}
        </div>

        <div className="h-20" />
      </main>

      {/* Floating Add Property */}
      <div className="fixed bottom-24 right-5 z-40">
        <button
          type="button"
          onClick={goAddProperty}
          className="h-16 pl-5 pr-7 bg-[#0a44b8] hover:brightness-95 text-white rounded-full shadow-lg flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 ring-[#0a44b8]/30 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[30px]" style={solidIconStyle}>
            add
          </span>
          <span className="text-[18px] font-bold cursor-pointer" onClick={goAddProperty}>
            Add Property
          </span>
        </button>
      </div>

      {/* Bottom Nav */}
      <BottomNav active="properties" />
    </div>
  );
}
