"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import DashboardBottomNav from "@/components/DashboardBottomNav";
import { useToastError } from "@/hooks/useToastError";
import { showToast } from "@/lib/alerts";
import { useAppStore } from "@/store/useAppStore";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type PropertyStatus = "Listed" | "Draft";

type Property = {
  id: string;
  landlordId?: string;
  status: PropertyStatus;
  title: string;
  area?: string;
  price: number;
  beds: number;
  baths: number;
  matches?: number;
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
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
        Listed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-bold text-gray-700">
      Draft
    </span>
  );
}

function IconStat({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <span
        className="material-symbols-outlined text-[18px]"
        style={solidIconStyle}
      >
        {icon}
      </span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}

function PropertyCard({
  property,
  onEdit,
  onMatches,
  onContinue,
  onDelete,
  isDeleting,
}: {
  property: Property;
  onEdit: (id: string) => void;
  onMatches: (id: string) => void;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const isDraft = property.status === "Draft";
  const matchesLabel =
    typeof property.matches === "number"
      ? `${property.matches} Matches`
      : "Matches";

  return (
    <article
      className={[
        "flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]",
        isDraft ? "opacity-90" : "",
      ].join(" ")}
    >
      <div className="flex gap-4 p-4">
        <div
          className={[
            "h-28 w-28 shrink-0 rounded-xl bg-gray-200 bg-cover bg-center",
            isDraft ? "grayscale" : "",
          ].join(" ")}
          style={{ backgroundImage: `url('${property.coverUrl}')` }}
          aria-label={`${property.title} cover`}
        />

        <div className="flex flex-1 flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <StatusPill status={property.status} />
            <button
              type="button"
              onClick={() => onDelete(property.id)}
              disabled={isDeleting}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50"
              aria-label="Delete listing"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={solidIconStyle}
              >
                delete
              </span>
            </button>
          </div>

          <h2 className="text-[18px] font-bold leading-tight text-gray-900">
            {property.title}
          </h2>

          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-extrabold text-[#0a44b8]">
              <Money value={property.price} />
            </span>
            <span className="text-[14px] font-medium text-gray-500">/ yr</span>
          </div>

          <div className="mt-0.5 flex items-center gap-4">
            <IconStat icon="bed" value={property.beds} />
            <IconStat icon="bathtub" value={property.baths} />
          </div>
        </div>
      </div>

      {!isDraft ? (
        <div className="flex h-14 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onEdit(property.id)}
            className="flex flex-1 items-center justify-center gap-2 font-bold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={solidIconStyle}
            >
              edit
            </span>
            Edit
          </button>
          <div className="w-px bg-gray-100" />
          <button
            type="button"
            onClick={() => onMatches(property.id)}
            className={[
              "flex flex-1 items-center justify-center gap-2 font-bold transition-colors",
              (property.matches ?? 0) > 0
                ? "bg-[#0a44b8]/5 text-[#0a44b8] hover:bg-[#0a44b8]/10 active:bg-[#0a44b8]/15"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200",
            ].join(" ")}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={solidIconStyle}
            >
              {(property.matches ?? 0) > 0 ? "person_search" : "visibility"}
            </span>
            {matchesLabel}
          </button>
        </div>
      ) : (
        <div className="flex h-14 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onContinue(property.id)}
            className="flex w-full items-center justify-center gap-2 font-bold text-[#0a44b8] transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={solidIconStyle}
            >
              arrow_forward
            </span>
            Continue Editing
          </button>
        </div>
      )}
    </article>
  );
}

function PropertyCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] animate-pulse">
      <div className="flex gap-4 p-4">
        <div className="h-28 w-28 shrink-0 rounded-xl bg-slate-200" />
        <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="flex items-center justify-between">
            <div className="h-6 w-16 rounded-full bg-slate-200" />
            <div className="h-8 w-8 rounded-full bg-slate-200" />
          </div>
          <div className="h-5 w-4/5 rounded-full bg-slate-200" />
          <div className="h-5 w-2/5 rounded-full bg-slate-200" />
          <div className="flex gap-3">
            <div className="h-4 w-12 rounded-full bg-slate-200" />
            <div className="h-4 w-12 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="flex h-14 border-t border-gray-100">
        <div className="flex-1 bg-slate-100" />
        <div className="w-px bg-gray-100" />
        <div className="flex-1 bg-slate-100" />
      </div>
    </article>
  );
}

function BottomNav({
  active,
}: {
  active: "overview" | "properties" | "matches" | "chat" | "profile";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get("from") ?? "";
  const dashboardSources = new Set([
    "/dashboard/overview",
    "/dashboard/properties",
    "/dashboard/matches",
  ]);
  const isDashboardRoute =
    pathname?.startsWith("/dashboard/") || pathname === "/dashboard";
  const showDashboardNav =
    isDashboardRoute ||
    (pathname === "/messages" && dashboardSources.has(fromParam));
  const chatHref = "/dashboard/messages";

  if (!showDashboardNav) {
    return (
      <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-gray-200 bg-white">
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
      containerClassName="mx-auto flex h-full w-full max-w-md lg:max-w-6xl items-center justify-between px-5"
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
  const [agentFilter, setAgentFilter] = useState("all");
  const [propertyScope, setPropertyScope] = useState<"mine" | "all">("mine");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useToastError(error);

  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const user = useAppStore((state) => state.user);
  const userId = useAppStore((state) => state.userId);
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const landlordProperties = useAppStore((state) => state.landlordProperties);
  const loadLandlordProperties = useAppStore(
    (state) => state.loadLandlordProperties
  );
  const loadLandlordDraftById = useAppStore(
    (state) => state.loadLandlordDraftById
  );
  const clearLandlordDraft = useAppStore((state) => state.clearLandlordDraft);
  const deleteLandlordProperty = useAppStore(
    (state) => state.deleteLandlordProperty
  );
  const orgAgents = useAppStore((state) => state.orgAgents);
  const inviteAgent = useAppStore((state) => state.inviteAgent);
  const loadOrgAgents = useAppStore((state) => state.loadOrgAgents);
  const removeAgent = useAppStore((state) => state.removeAgent);

  const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
  const isOrgOwner = userRole === "Organisation";
  const isOrgAgent = userRole === "Landlord" && Boolean(user?.agentOrgId);
  const orgId = isOrgOwner ? userId : (user?.agentOrgId as string | undefined);
  const orgName =
    (user as Record<string, unknown> | null)?.orgProfile
      ? (
          (user as Record<string, unknown>).orgProfile as {
            orgName?: string;
          }
        )?.orgName
      : undefined;
  const isOrgContext = isOrgOwner || isOrgAgent;
  const canManageOrgMembers = isOrgOwner;

  const mappedProperties: Property[] = useMemo(
    () =>
      landlordProperties.map((property) => ({
        id: property.id,
        landlordId: property.landlordId,
        status: (property.status as PropertyStatus) ?? "Draft",
        title: property.title ?? "Untitled property",
        area: property.area ?? "",
        price: property.price ?? 0,
        beds: property.beds ?? 0,
        baths: property.baths ?? 0,
        matches: property.matches ?? property.matchCount ?? 0,
        newCount: property.newCount ?? 0,
        coverUrl: property.coverUrl ?? "/hero.png",
      })),
    [landlordProperties]
  );

  const memberOptions = useMemo(() => {
    if (!isOrgContext) return [];

    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();

    if (userId) {
      options.push({
        id: userId,
        label: isOrgOwner ? orgName ?? "Owner" : "You",
      });
      seen.add(userId);
    }

    orgAgents.forEach((agent) => {
      const agentId = (agent.id ?? agent._id) as string | undefined;
      if (!agentId || seen.has(agentId)) return;
      seen.add(agentId);
      const label = [agent.firstName, agent.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      options.push({
        id: agentId,
        label: label || agent.email || "Agent",
      });
    });

    return options;
  }, [isOrgContext, isOrgOwner, orgAgents, orgName, userId]);

  const agentListingCountById = useMemo(() => {
    const counts = new Map<string, number>();

    landlordProperties.forEach((property) => {
      const landlordId = property.landlordId;
      if (!landlordId) return;
      counts.set(landlordId, (counts.get(landlordId) ?? 0) + 1);
    });

    return counts;
  }, [landlordProperties]);

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
  }, [isOrgAgent, isOrgContext, isOrgOwner]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!authToken) {
        if (mounted) setIsInitialLoading(false);
        return;
      }

      try {
        await Promise.all([
          loadLandlordProperties({ scope: propertyScope }),
          user?.photoUrl ? Promise.resolve() : fetchUserProfile(),
          isOrgContext && orgId ? loadOrgAgents(orgId) : Promise.resolve(),
        ]);
      } finally {
        if (mounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [
    authToken,
    fetchUserProfile,
    isOrgContext,
    loadLandlordProperties,
    loadOrgAgents,
    orgId,
    propertyScope,
    user?.photoUrl,
  ]);

  useEffect(() => {
    if (!isOrgContext || propertyScope === "mine") {
      setAgentFilter("all");
    }
  }, [isOrgContext, propertyScope]);

  useEffect(() => {
    if (!authToken) return;
    const timer = setTimeout(() => {
      void loadLandlordProperties({
        q: q.trim() || undefined,
        scope: propertyScope,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [authToken, loadLandlordProperties, propertyScope, q]);

  const filtered = useMemo(() => {
    let result = mappedProperties;
    const search = q.trim().toLowerCase();

    if (search) {
      result = result.filter((property) =>
        property.title.toLowerCase().includes(search)
      );
    }

    if (isOrgContext && propertyScope === "all" && agentFilter !== "all") {
      result = result.filter((property) => property.landlordId === agentFilter);
    }

    if (isOrgContext && propertyScope === "mine") {
      result = result.filter((property) => property.landlordId === userId);
    }

    return result;
  }, [agentFilter, isOrgContext, mappedProperties, propertyScope, q, userId]);

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

  const emptyState = useMemo(() => {
    if (!authToken) {
      return { title: "Sign in to load your properties.", helper: null };
    }

    if (!isOrgContext) {
      return {
        title: "No properties yet. Start by adding your first listing.",
        helper: null,
      };
    }

    if (propertyScope === "mine") {
      return isOrgOwner
        ? {
            title: "No listings under your owner profile yet.",
            helper: "Create your first property to appear in the workspace.",
          }
        : {
            title: "No properties created by you yet.",
            helper: "Add a listing to build your contribution to this organisation.",
          };
    }

    if (agentFilter !== "all") {
      return {
        title: "No properties match this member filter.",
        helper: "Try another member or switch back to My Listings.",
      };
    }

    return {
      title: `${orgName ?? "This organisation"} has no listings yet.`,
      helper: canManageOrgMembers
        ? "Add your first listing to start the workspace."
        : "Ask your organisation owner or teammates to add listings first.",
    };
  }, [
    agentFilter,
    authToken,
    canManageOrgMembers,
    isOrgContext,
    isOrgOwner,
    orgName,
    propertyScope,
  ]);

  return (
    <div className="min-h-screen bg-[#f5f6f8] pb-24 text-gray-900">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-[#f5f6f8]/95 px-5 py-4 backdrop-blur-sm">
        <div>
          <h1 className="text-[28px] font-extrabold leading-none tracking-tight text-[#0a44b8]">
            {isOrgContext ? orgName ?? "Property Dashboard" : "My Properties"}
          </h1>
          <p className="mt-1 text-[18px] font-medium text-gray-600">
            {isOrgOwner
              ? "Organisation Workspace"
              : isOrgAgent
                ? "Agent Workspace"
                : "Dashboard"}
          </p>
        </div>

        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gray-200">
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

      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-6">
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[24px] text-gray-500"
            style={solidIconStyle}
          >
            search
          </span>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="h-14 w-full rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-[18px] shadow-sm focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]"
            placeholder="Search properties..."
            type="text"
          />
        </div>

        {isOrgContext ? (
          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[18px] font-bold text-gray-900">
                  {isOrgOwner ? "Organisation" : "Agent"} Controls
                </p>
                <p className="text-sm text-gray-500">
                  Switch listing scope and manage member visibility.
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setPropertyScope("mine")}
                  className={[
                    "h-9 rounded-lg px-3 text-sm font-bold transition-colors",
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
                  disabled={!isOrgOwner}
                  className={[
                    "h-9 rounded-lg px-3 text-sm font-bold transition-colors",
                    propertyScope === "all"
                      ? "bg-[#0a44b8] text-white shadow"
                      : "text-gray-600 hover:bg-gray-100",
                    !isOrgOwner ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                >
                  All Organisation Listings
                </button>
              </div>
            </div>

            {propertyScope === "all" && isOrgOwner ? (
              <div className="flex items-center gap-3">
                <label
                  htmlFor="agent-filter"
                  className="text-sm font-semibold text-gray-700"
                >
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
          </section>
        ) : null}

        {canManageOrgMembers ? (
          <section className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              onClick={() => setShowAgents((current) => !current)}
              className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[24px] text-[#0a44b8]"
                  style={solidIconStyle}
                >
                  group
                </span>
                <span className="text-[18px] font-bold text-gray-900">
                  Agents
                </span>
                <span className="inline-flex items-center justify-center rounded-full bg-[#0a44b8]/10 px-2 py-0.5 text-[12px] font-bold text-[#0a44b8]">
                  {orgAgents.length}
                </span>
              </div>
              <span
                className="material-symbols-outlined text-gray-500 transition-transform"
                style={{ transform: showAgents ? "rotate(180deg)" : undefined }}
              >
                expand_more
              </span>
            </button>

            {showAgents ? (
              <div className="space-y-4 px-5 pb-5">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Agent email address"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    className="h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-[16px] focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]"
                  />
                  <button
                    type="button"
                    disabled={isInviting || !inviteEmail.trim()}
                    onClick={async () => {
                      if (!orgId || !inviteEmail.trim()) return;
                      setIsInviting(true);
                      try {
                        await inviteAgent(orgId, inviteEmail.trim());
                        showToast({
                          title: "Invite sent",
                          text: `Invitation sent to ${inviteEmail.trim()}`,
                          variant: "success",
                        });
                        setInviteEmail("");
                      } catch (err) {
                        showToast({
                          title: "Invite failed",
                          text:
                            err instanceof Error
                              ? err.message
                              : "Failed to send invite",
                          variant: "error",
                        });
                      } finally {
                        setIsInviting(false);
                      }
                    }}
                    className="flex h-12 items-center gap-2 rounded-xl bg-[#0a44b8] px-5 text-[15px] font-bold text-white transition-colors hover:bg-[#082485] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      send
                    </span>
                    {isInviting ? "Sending..." : "Invite"}
                  </button>
                </div>

                {orgAgents.length === 0 ? (
                  <p className="py-4 text-center text-[15px] text-gray-500">
                    No agents yet. Invite your team members above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orgAgents.map((agent) => {
                      const agentId = (agent.id ?? agent._id) as string;
                      return (
                        <div
                          key={agentId}
                          className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a44b8]/10">
                            <span
                              className="material-symbols-outlined text-[20px] text-[#0a44b8]"
                              style={solidIconStyle}
                            >
                              person
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-gray-900">
                              {[agent.firstName, agent.lastName]
                                .filter(Boolean)
                                .join(" ") || "Agent"}
                            </p>
                            <p className="truncate text-[13px] text-gray-500">
                              {agent.email}
                            </p>
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
                                showToast({
                                  title: "Agent removed",
                                  variant: "success",
                                });
                              } catch (err) {
                                showToast({
                                  title:
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to remove agent",
                                  variant: "error",
                                });
                              } finally {
                                setRemovingAgentId(null);
                              }
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                            aria-label="Remove agent"
                          >
                            <span
                              className="material-symbols-outlined text-[20px]"
                              style={solidIconStyle}
                            >
                              person_remove
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-col gap-6">
          {isInitialLoading ? (
            <>
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
            </>
          ) : filtered.length ? (
            filtered.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEdit={onEdit}
                onMatches={onMatches}
                onContinue={onContinue}
                onDelete={onDelete}
                isDeleting={isDeletingId === property.id}
              />
            ))
          ) : (
            <div className="space-y-4 rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
              <p>{emptyState.title}</p>
              {emptyState.helper ? (
                <p className="text-sm text-gray-400">{emptyState.helper}</p>
              ) : null}
              {authToken ? (
                <button
                  type="button"
                  onClick={goAddProperty}
                  className="inline-flex items-center justify-center rounded-full bg-[#0a44b8] px-5 py-2.5 text-sm font-bold text-white shadow-sm"
                >
                  Add Property
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="h-20" />
      </main>

      <div className="fixed bottom-24 right-5 z-40">
        <button
          type="button"
          onClick={goAddProperty}
          className="flex h-16 items-center gap-3 rounded-full bg-[#0a44b8] pl-5 pr-7 text-white shadow-lg transition-transform hover:scale-105 hover:brightness-95 active:scale-95"
        >
          <span
            className="material-symbols-outlined text-[30px]"
            style={solidIconStyle}
          >
            add
          </span>
          <span className="text-[18px] font-bold">Add Property</span>
        </button>
      </div>

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
