"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import { showToast } from "@/lib/alerts";
import { useToastError } from "@/hooks/useToastError";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type PropertyStatus = "Listed" | "Draft";

type Property = {
  id: string;
  landlordId?: string;
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
  onDelete,
  isDeleting,
  agentName,
}: {
  p: Property;
  onEdit: (id: string) => void;
  onMatches: (id: string) => void;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  agentName?: string;
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
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              disabled={isDeleting}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50"
              aria-label="Delete listing"
            >
              <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>
                delete
              </span>
            </button>
          </div>

          <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
            {p.title}
          </h2>
          {agentName ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0a44b8]">
              {agentName}
            </p>
          ) : null}

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

function LandlordDashboardContent() {
  const [q, setQ] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteAt, setPendingDeleteAt] = useState(0);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [removingAgentId, setRemovingAgentId] = useState<string | null>(null);
  useToastError(error);
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const user = useAppStore((state) => state.user);
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const landlordProperties = useAppStore((state) => state.landlordProperties);
  const loadLandlordProperties = useAppStore((state) => state.loadLandlordProperties);
  const loadLandlordDraftById = useAppStore((state) => state.loadLandlordDraftById);
  const clearLandlordDraft = useAppStore((state) => state.clearLandlordDraft);
  const deleteLandlordProperty = useAppStore((state) => state.deleteLandlordProperty);
  const orgAgents = useAppStore((state) => state.orgAgents);
  const inviteAgent = useAppStore((state) => state.inviteAgent);
  const loadOrgAgents = useAppStore((state) => state.loadOrgAgents);
  const removeAgent = useAppStore((state) => state.removeAgent);
  const orgStats = useAppStore((state) => state.orgStats);
  const loadOrgStats = useAppStore((state) => state.loadOrgStats);
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [propertyScope, setPropertyScope] = useState<"mine" | "all">("mine");
  const userId = useAppStore((state) => state.userId);

  const userRole = Array.isArray(user?.role) ? user?.role[0] : user?.role;
  const isOrgOwner = userRole === "Organisation";
  const isOrgAgent = userRole === "Landlord" && Boolean(user?.agentOrgId);
  const orgId = isOrgOwner ? userId : (user?.agentOrgId as string | undefined);
  const orgName =
    (user as Record<string, unknown> | null)?.orgProfile
      ? ((user as Record<string, unknown>).orgProfile as { orgName?: string })?.orgName
      : undefined;
  const isOrgContext = isOrgOwner || isOrgAgent;
  const canManageOrgMembers = isOrgOwner;
  const isOrgScopeEnabled = isOrgContext;
  const orgRoleBadge = isOrgOwner ? "Owner" : isOrgAgent ? "Agent" : undefined;

  const mappedProperties: Property[] = useMemo(
    () =>
      landlordProperties.map((property) => ({
        id: property.id,
        landlordId: property.landlordId,
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

  /* Memoized chart data to avoid Chart.js re-render loop */
  const donutData = useMemo(() => {
    if (!orgStats) return null;
    return {
      labels: [
        orgName ?? "You",
        ...orgStats.listingsByAgent.map((a) => a.name),
      ],
      datasets: [{
        data: [
          orgStats.ownerListingCount,
          ...orgStats.listingsByAgent.map((a) => a.count),
        ],
        backgroundColor: ["#0a44b8", "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"],
        borderWidth: 2,
        borderColor: "#f5f6f8",
      }],
    };
  }, [orgStats, orgName]);

  const barData = useMemo(() => {
    if (!orgStats) return null;
    return {
      labels: orgStats.matchesByMonth.map((m) => m.month),
      datasets: [{
        label: "Matches",
        data: orgStats.matchesByMonth.map((m) => m.count),
        backgroundColor: "#0a44b8",
        borderRadius: 8,
        barThickness: 18,
      }],
    };
  }, [orgStats]);

  const agentNameById = useMemo(() => {
    if (!isOrgContext) return new Map<string, string>();
    const map = new Map<string, string>();
    if (userId) {
      map.set(userId, isOrgOwner ? "You" : "You");
    }
    if (orgStats) {
      orgStats.listingsByAgent.forEach((agent) => {
        map.set(agent.agentId, agent.name || agent.email || "Agent");
      });
    } else {
      orgAgents.forEach((agent) => {
        const name = [agent.firstName, agent.lastName].filter(Boolean).join(" ").trim();
        if (agent.id || agent._id) {
          map.set((agent.id ?? agent._id) as string, name || agent.email || "Agent");
        }
      });
    }
    if (isOrgOwner && userId) map.set(userId, orgName ?? "Owner");
    if (isOrgAgent && userId) map.set(userId, "You");
    return map;
  }, [isOrgContext, isOrgAgent, isOrgOwner, orgAgents, orgName, orgStats, userId]);

  const memberOptions = useMemo(() => {
    if (!isOrgContext) return [];
    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();

    if (userId) {
      const ownerLabel = isOrgOwner ? orgName ?? "Owner" : "You";
      options.push({ id: userId, label: ownerLabel });
      seen.add(userId);
    }

    const candidates = orgStats?.listingsByAgent?.length
      ? orgStats.listingsByAgent
      : orgAgents.map((agent) => ({
        agentId: (agent.id ?? agent._id) as string | undefined,
        name: [agent.firstName, agent.lastName].filter(Boolean).join(" ").trim(),
        email: agent.email,
      }));

    candidates.forEach((agent) => {
      if (!agent.agentId) return;
      if (seen.has(agent.agentId)) return;
      seen.add(agent.agentId);
      const label = [agent.name, agent.email].filter(Boolean).join(" | ");
      options.push({ id: agent.agentId, label: label || "Agent" });
    });

    return options;
  }, [isOrgContext, isOrgOwner, orgAgents, orgName, orgStats, userId]);

  const agentListingCountById = useMemo(() => {
    if (!isOrgContext) return new Map<string, number>();
    const map = new Map<string, number>();
    if (orgStats) {
      orgStats.listingsByAgent.forEach((agent) => {
        map.set(agent.agentId, agent.count ?? 0);
      });
      if (orgId) {
        map.set(orgId, orgStats.ownerListingCount ?? 0);
      }
    } else {
      landlordProperties.forEach((property) => {
        const landlordId = property.landlordId;
        if (!landlordId) return;
        map.set(landlordId, (map.get(landlordId) ?? 0) + 1);
      });
    }
    return map;
  }, [isOrgContext, landlordProperties, orgId, orgStats]);

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      animation: false as const,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: { boxWidth: 12, font: { size: 11, weight: "bold" as const } },
        },
      },
      cutout: "60%",
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 } },
          grid: { color: "#f0f0f0" },
        },
        x: {
          ticks: { font: { size: 11, weight: "bold" as const } },
          grid: { display: false },
        },
      },
    }),
    []
  );

  useEffect(() => {
    if (!isOrgContext) {
      setPropertyScope("mine");
      return;
    }
    if (isOrgAgent) {
      setPropertyScope("mine");
    } else if (isOrgOwner) {
      setPropertyScope("all");
    }
  }, [isOrgAgent, isOrgOwner, isOrgContext]);

  useEffect(() => {
    if (!authToken) return;
    void loadLandlordProperties({ scope: propertyScope });
  }, [authToken, loadLandlordProperties, propertyScope]);

  useEffect(() => {
    if (authToken && !user?.photoUrl) {
      void fetchUserProfile();
    }
  }, [authToken, user?.photoUrl, fetchUserProfile]);

  useEffect(() => {
    if (!isOrgContext || propertyScope === "mine") {
      setAgentFilter("all");
    }
  }, [isOrgContext, propertyScope]);

  const orgStatsLoadedRef = useRef(false);
  useEffect(() => {
    if (!authToken || !isOrgContext || !orgId) return;
    void loadOrgAgents(orgId);
    if (isOrgOwner && !orgStatsLoadedRef.current) {
      orgStatsLoadedRef.current = true;
      void loadOrgStats(orgId);
    }
  }, [authToken, isOrgContext, isOrgOwner, orgId, loadOrgAgents, loadOrgStats]);

  useEffect(() => {
    if (!authToken) return;
    const timer = setTimeout(() => {
      void loadLandlordProperties({
        q: q.trim() || undefined,
        scope: propertyScope,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [authToken, q, loadLandlordProperties, propertyScope]);

  const filtered = useMemo(() => {
    let result = mappedProperties;
    const s = q.trim().toLowerCase();
    if (s) {
      result = result.filter((p) => p.title.toLowerCase().includes(s));
    }
    if (isOrgContext && propertyScope === "all" && agentFilter !== "all") {
      result = result.filter((p) => p.landlordId === agentFilter);
    }
    if (isOrgContext && propertyScope === "mine") {
      result = result.filter((p) => p.landlordId === userId);
    }
    return result;
  }, [
    agentFilter,
    isOrgContext,
    mappedProperties,
    propertyScope,
    q,
    userId,
  ]);

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

  const onDelete = async (id: string) => {
    const now = Date.now();
    if (pendingDeleteId !== id || now - pendingDeleteAt > 5000) {
      setPendingDeleteId(id);
      setPendingDeleteAt(now);
      showToast({
        title: "Tap delete again to confirm",
        text: "This listing and related matches/messages will be removed.",
        variant: "info",
      });
      return;
    }

    setIsDeletingId(id);
    setError(null);
    try {
      const ok = await deleteLandlordProperty(id);
      if (ok) {
        showToast({ title: "Listing deleted", variant: "success" });
      }
    } catch (err) {
      setError(err);
    } finally {
      setPendingDeleteId(null);
      setPendingDeleteAt(0);
      setIsDeletingId(null);
    }
  };

  const getEmptyState = () => {
    if (!authToken) {
      return {
        title: "Sign in to load your properties.",
        ctaLabel: null as string | null,
      };
    }
    if (!isOrgContext) {
      return {
        title: "No properties yet. Start by adding your first listing.",
        ctaLabel: "Add Property",
      };
    }
    if (propertyScope === "mine") {
      return isOrgOwner
        ? {
          title: "No listings under your owner profile yet.",
          ctaLabel: "Add Property",
          helper: "Create your first property to appear in the workspace.",
        }
        : {
          title: "No properties created by you yet.",
          ctaLabel: "Add Property",
          helper: "Add a listing to build your contribution to this org.",
        };
    }
    if (agentFilter !== "all") {
      return {
        title: "No properties match this agent filter.",
        ctaLabel: null as string | null,
        helper: "Try selecting another agent or switch to My Listings.",
      };
    }
    return isOrgOwner
      ? {
        title: "This organisation has no listings yet.",
        ctaLabel: "Add Property",
        helper: "Create one listing to start collaborating with your agents.",
      }
      : {
        title: `${orgName ?? "This organisation"} has no listings yet.`,
        ctaLabel: null,
        helper: "Ask your owner or teammates to add listings first.",
      };
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f6f8]/95 backdrop-blur-sm border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <div>
          {isOrgContext ? (
            <>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] text-[#0a44b8]" style={solidIconStyle}>corporate_fare</span>
                <h1 className="text-[28px] font-extrabold text-[#0a44b8] tracking-tight leading-none">
                  {orgName ?? "Organisation"}
                </h1>
              </div>
              <p className="text-[14px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                  {isOrgOwner ? "Organisation" : orgRoleBadge ?? "Member"}
                </span>
                {orgRoleBadge ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                    {orgRoleBadge}
                  </span>
                ) : null}
                Dashboard
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-extrabold text-[#0a44b8] tracking-tight leading-none">
                My Properties
              </h1>
              <p className="text-[18px] text-gray-600 font-medium mt-1">Dashboard</p>
            </>
          )}
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
      <main className="px-5 pt-6 flex flex-col gap-6 max-w-md lg:max-w-6xl mx-auto w-full">

        {/* ═══════════ ORG STATS & CHARTS ═══════════ */}
        {isOrgOwner && orgStats && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Listings", value: orgStats.totalListings, icon: "home_work", color: "#0a44b8" },
                { label: "Matches", value: orgStats.totalMatches, icon: "handshake", color: "#10b981" },
                { label: "Agents", value: orgStats.activeAgents, icon: "group", color: "#6366f1" },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] p-4 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[28px]" style={{ ...solidIconStyle, color: card.color }}>
                    {card.icon}
                  </span>
                  <span className="text-[26px] font-extrabold text-gray-900">{card.value}</span>
                  <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Donut — Listings per Member */}
              <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] p-4">
                <h3 className="text-[14px] font-bold text-gray-700 mb-3">Listings by Member</h3>
                {donutData && (orgStats.listingsByAgent.length > 0 || orgStats.ownerListingCount > 0) ? (
                  <div className="w-full aspect-square max-w-[220px] lg:max-w-[320px] mx-auto">
                    <Doughnut
                      data={donutData}
                      options={donutOptions}
                    />
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-[13px] py-6">No listings yet</p>
                )}
              </div>

              {/* Bar — Matches over 6 months */}
              <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] p-4">
                <h3 className="text-[14px] font-bold text-gray-700 mb-3">Matches (6 months)</h3>
                {barData && (
                  <div className="h-[220px] lg:h-[280px]">
                    <Bar
                      data={barData}
                      options={barOptions}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

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

        {/* Agent Management Panel (Org only) */}
        {isOrgScopeEnabled && canManageOrgMembers && (
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAgents((prev) => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[24px] text-[#0a44b8]" style={solidIconStyle}>group</span>
                <span className="text-[18px] font-bold text-gray-900">Agents</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[12px] font-bold bg-[#0a44b8]/10 text-[#0a44b8]">
                  {orgAgents.length}
                </span>
              </div>
              <span className="material-symbols-outlined text-gray-500 transition-transform" style={{ transform: showAgents ? 'rotate(180deg)' : undefined }}>
                expand_more
              </span>
            </button>

            {showAgents && (
              <div className="px-5 pb-5 space-y-4">
                {/* Invite Form */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Agent email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 h-12 rounded-xl border border-gray-300 bg-white px-4 text-[16px] focus:ring-2 focus:ring-[#0a44b8] focus:border-[#0a44b8]"
                  />
                  <button
                    type="button"
                    disabled={isInviting || !inviteEmail.trim()}
                    onClick={async () => {
                      if (!orgId || !inviteEmail.trim()) return;
                      setIsInviting(true);
                      try {
                        await inviteAgent(orgId, inviteEmail.trim());
                        showToast({ title: "Invite sent!", text: `Invitation sent to ${inviteEmail.trim()}`, variant: "success" });
                        setInviteEmail("");
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Failed to send invite";
                        showToast({ title: "Invite failed", text: msg, variant: "error" });
                      } finally {
                        setIsInviting(false);
                      }
                    }}
                    className="h-12 px-5 rounded-xl bg-[#0a44b8] text-white font-bold text-[15px] hover:bg-[#082485] disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    {isInviting ? "Sending..." : "Invite"}
                  </button>
                </div>

                {/* Agent List */}
                {orgAgents.length === 0 ? (
                  <p className="text-center text-gray-500 text-[15px] py-4">
                    No agents yet. Invite your team members above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orgAgents.map((agent) => {
                      const agentId = (agent.id ?? agent._id) as string;
                      return (
                        <div
                          key={agentId}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#0a44b8]/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[20px] text-[#0a44b8]" style={solidIconStyle}>person</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-semibold text-gray-900 truncate">
                              {agent.firstName ?? ""} {agent.lastName ?? ""}
                            </p>
                            <p className="text-[13px] text-gray-500 truncate">{agent.email}</p>
                          </div>
                          <span className="inline-flex items-center justify-center rounded-full bg-[#0a44b8]/10 px-2.5 py-1 text-[11px] font-bold text-[#0a44b8]">
                            {agentListingCountById.get(agentId) ?? 0} listings
                          </span>
                          <button
                            type="button"
                            disabled={removingAgentId === agentId}
                            onClick={async () => {
                              if (!orgId) return;
                              setRemovingAgentId(agentId);
                              try {
                                await removeAgent(orgId, agentId);
                                showToast({ title: "Agent removed", variant: "success" });
                              } catch (err) {
                                const msg = err instanceof Error ? err.message : "Failed";
                                showToast({ title: msg, variant: "error" });
                              } finally {
                                setRemovingAgentId(null);
                              }
                            }}
                            className="h-9 w-9 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            aria-label={`Remove ${agent.firstName ?? "agent"}`}
                          >
                            <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>person_remove</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cards */}
        <div className="flex flex-col gap-6">
          {isOrgScopeEnabled ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm font-semibold text-gray-700">Viewing scope</p>
                <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setPropertyScope("mine")}
                    className={[
                      "h-9 px-3 rounded-lg text-sm font-bold transition-colors",
                      propertyScope === "mine"
                        ? "bg-[#0a44b8] text-white shadow"
                        : "text-gray-600 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    My Listings
                  </button>
                  <button
                    type="button"
                    onClick={() => setPropertyScope("all")}
                    className={[
                      "h-9 px-3 rounded-lg text-sm font-bold transition-colors",
                      propertyScope === "all"
                        ? "bg-[#0a44b8] text-white shadow"
                        : "text-gray-600 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    All Organisation Listings
                  </button>
                </div>
              </div>

              {propertyScope === "all" ? (
                <div className="flex items-center gap-3">
                  <label htmlFor="agent-filter" className="text-sm font-semibold text-gray-700">
                    Filter by member
                  </label>
                  <select
                    id="agent-filter"
                    value={agentFilter}
                    onChange={(event) => setAgentFilter(event.target.value)}
                    className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 focus:border-[#0a44b8] focus:outline-none"
                  >
                    <option value="all">All members</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </>
          ) : null}
          {filtered.length ? (
            filtered.map((p) => (
              <PropertyCard
                key={p.id}
                p={p}
                onEdit={onEdit}
                onMatches={onMatches}
                onContinue={onContinue}
                onDelete={onDelete}
                isDeleting={isDeletingId === p.id}
                agentName={isOrgContext ? agentNameById.get(p.landlordId ?? "") : undefined}
              />
            ))
          ) : authToken ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500 space-y-4">
              <p>{getEmptyState().title}</p>
              {getEmptyState().helper ? (
                <p className="text-sm text-gray-400">{getEmptyState().helper}</p>
              ) : null}
              {getEmptyState().ctaLabel ? (
                <button
                  type="button"
                  onClick={goAddProperty}
                  className="inline-flex items-center justify-center rounded-full bg-[#0a44b8] text-white text-sm font-bold px-5 py-2.5 shadow-sm cursor-pointer"
                >
                  {getEmptyState().ctaLabel}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
              {getEmptyState().title}
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
          <span className="text-[18px] font-bold">
            Add Property
          </span>
        </button>
      </div>

      {/* Bottom Nav */}
      <BottomNav active="properties" />
    </div>
  );
}

export default function LandlordDashboardPage() {
  return (
    <Suspense fallback={null}>
      <LandlordDashboardContent />
    </Suspense>
  );
}
