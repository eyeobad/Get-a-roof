"use client";

import Script from "next/script";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { useToastError } from "@/hooks/useToastError";

type AdminMetrics = {
  summary: {
    totalUsers: number;
    totalListings: number;
    totalMatches: number;
    totalMessages: number;
    verifiedUsers: number;
  };
  charts: {
    roleDistribution: Array<{ role: string; count: number }>;
    listingStatus: Array<{ status: string; count: number }>;
    signupsByDay: Array<{ date: string; count: number }>;
    messagesByDay: Array<{ date: string; count: number }>;
    matchesByDay: Array<{ date: string; count: number }>;
  };
};

type AdminUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  isSuspended?: boolean;
  emailVerified?: boolean;
};

type AdminListing = {
  _id: string;
  landlordId?: string;
  status?: string;
  moderationStatus?: string;
  monthlyPrice?: number;
  propertyType?: string;
  address?: { street?: string; city?: string };
  landlord?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
};

type AdminListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

declare global {
  interface Window {
    Chart?: new (
      item: HTMLCanvasElement,
      config: {
        type: string;
        data: unknown;
        options?: unknown;
      }
    ) => { destroy?: () => void };
  }
}

export default function AdminPage() {
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const user = useAppStore((state) => state.user);
  const clearAuth = useAppStore((state) => state.clearAuth);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [auditRows, setAuditRows] = useState<Array<Record<string, unknown>>>([]);
  const [userRoleDraft, setUserRoleDraft] = useState<Record<string, string>>({});
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [listingPage, setListingPage] = useState(1);
  const [listingTotalPages, setListingTotalPages] = useState(1);
  const [listingTotal, setListingTotal] = useState(0);
  const [listingSearchInput, setListingSearchInput] = useState("");
  const [listingSearch, setListingSearch] = useState("");
  const [error, setError] = useState("");
  useToastError(error);
  const [isLoading, setIsLoading] = useState(true);
  const chartsRef = useRef<Array<{ destroy?: () => void }>>([]);
  const lineChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const donutChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barChartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const role = useMemo(() => {
    const raw = user?.role;
    const roles = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return roles.map((value) => value?.toString().toLowerCase());
  }, [user?.role]);

  useEffect(() => {
    if (!authToken) {
      router.replace("/admin/login");
      return;
    }
    if (role.length && !role.includes("admin")) {
      router.replace("/login");
    }
  }, [authToken, role, router]);

  const authFetch = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return (await response.json()) as T;
    },
    [authToken]
  );

  const load = useCallback(async () => {
    if (!authToken) return;
    setError("");
    setIsLoading(true);
    try {
      const userParams = new URLSearchParams({
        limit: "10",
        page: String(userPage),
      });
      if (userSearch.trim()) {
        userParams.set("q", userSearch.trim());
      }

      const listingParams = new URLSearchParams({
        limit: "10",
        page: String(listingPage),
      });
      if (listingSearch.trim()) {
        listingParams.set("q", listingSearch.trim());
      }

      const [m, u, l, a] = await Promise.all([
        authFetch<AdminMetrics>("/api/admin/metrics"),
        authFetch<AdminListResponse<AdminUser>>(
          `/api/admin/users?${userParams.toString()}`
        ),
        authFetch<AdminListResponse<AdminListing>>(
          `/api/admin/listings?${listingParams.toString()}`
        ),
        authFetch<{ items: Array<Record<string, unknown>> }>("/api/admin/audit-logs?limit=10"),
      ]);
      setMetrics(m);
      setUsers(u.items ?? []);
      setUserTotal(u.total ?? 0);
      setUserTotalPages(u.totalPages ?? 1);
      setListings(l.items ?? []);
      setListingTotal(l.total ?? 0);
      setListingTotalPages(l.totalPages ?? 1);
      setAuditRows(a.items ?? []);
    } catch (err) {
      setError((err as Error)?.message || "Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, authToken, listingPage, listingSearch, userPage, userSearch]);

  useEffect(() => {
    void load();
  }, [authToken, load]);

  useEffect(() => {
    setListingPage(1);
  }, [listingSearch]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  const mountCharts = useCallback(() => {
    if (!window.Chart || !metrics) return;

    chartsRef.current.forEach((chart) => chart?.destroy?.());
    chartsRef.current = [];

    const Chart = window.Chart;
    const signups = metrics.charts.signupsByDay ?? [];
    const listingStatus = metrics.charts.listingStatus ?? [];
    const rolesData = metrics.charts.roleDistribution ?? [];

    if (lineChartCanvasRef.current) {
      chartsRef.current.push(
        new Chart(lineChartCanvasRef.current, {
          type: "line",
          data: {
            labels: signups.map((p) => p.date),
            datasets: [
              {
                label: "Daily signups",
                data: signups.map((p) => p.count),
                borderColor: "#0ea5e9",
                backgroundColor: "rgba(14,165,233,0.2)",
                fill: true,
                tension: 0.35,
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        })
      );
    }

    if (donutChartCanvasRef.current) {
      chartsRef.current.push(
        new Chart(donutChartCanvasRef.current, {
          type: "doughnut",
          data: {
            labels: rolesData.map((r) => r.role),
            datasets: [
              {
                data: rolesData.map((r) => r.count),
                backgroundColor: ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444"],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        })
      );
    }

    if (barChartCanvasRef.current) {
      chartsRef.current.push(
        new Chart(barChartCanvasRef.current, {
          type: "bar",
          data: {
            labels: listingStatus.map((r) => r.status),
            datasets: [
              {
                label: "Listings",
                data: listingStatus.map((r) => r.count),
                backgroundColor: "#2563eb",
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        })
      );
    }
  }, [metrics]);

  useEffect(() => {
    mountCharts();
    return () => {
      chartsRef.current.forEach((chart) => chart?.destroy?.());
    };
  }, [metrics, mountCharts]);

  const updateUserStatus = async (userId: string, isSuspended: boolean) => {
    try {
      await authFetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          isSuspended,
          reason: isSuspended ? "Policy violation" : "",
        }),
      });
      await load();
    } catch (err) {
      setError((err as Error)?.message || "Unable to update user");
    }
  };

  const updateUserRole = async (userId: string) => {
    const role = userRoleDraft[userId];
    if (!role) return;
    try {
      await authFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (err) {
      setError((err as Error)?.message || "Unable to update role");
    }
  };

  const moderateListing = async (
    listingId: string,
    action: "approve" | "reject" | "hide"
  ) => {
    try {
      await authFetch(`/api/admin/listings/${listingId}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          reason: action === "approve" ? "" : "Admin moderation action",
        }),
      });
      await load();
    } catch (err) {
      setError((err as Error)?.message || "Unable to moderate listing");
    }
  };

  const deleteListing = async (listingId: string) => {
    const proceed = window.confirm(
      "Delete this listing and all related matches/messages? This cannot be undone."
    );
    if (!proceed) return;
    try {
      await authFetch(`/api/admin/listings/${listingId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError((err as Error)?.message || "Unable to delete listing");
    }
  };

  const deleteUser = async (userId: string) => {
    const proceed = window.confirm(
      "Delete this user account and related data? This cannot be undone."
    );
    if (!proceed) return;
    try {
      await authFetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError((err as Error)?.message || "Unable to delete user");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js" />
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo2.svg" alt="Get a Roof" width={62} height={62} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Get a Roof
            </p>
          <h1 className="text-2xl font-bold">Admin Console</h1>
          </div>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          onClick={() => {
            clearAuth();
            router.push("/admin/login");
          }}
        >
          Sign out
        </button>
      </header>

      <main className="p-6 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card label="Users" value={metrics?.summary.totalUsers ?? 0} />
          <Card label="Listings" value={metrics?.summary.totalListings ?? 0} />
          <Card label="Matches" value={metrics?.summary.totalMatches ?? 0} />
          <Card label="Messages" value={metrics?.summary.totalMessages ?? 0} />
          <Card label="Verified Users" value={metrics?.summary.verifiedUsers ?? 0} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Daily Signups">
            <canvas ref={lineChartCanvasRef} className="h-[250px]" />
          </ChartCard>
          <ChartCard title="Role Distribution">
            <canvas ref={donutChartCanvasRef} className="h-[250px]" />
          </ChartCard>
          <ChartCard title="Listing Status">
            <canvas ref={barChartCanvasRef} className="h-[250px]" />
          </ChartCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Users</h2>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={userSearchInput}
                  onChange={(event) => setUserSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setUserSearch(userSearchInput.trim());
                    }
                  }}
                  placeholder="Search users..."
                  className="h-9 w-52 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setUserSearch(userSearchInput.trim())}
                  className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserSearchInput("");
                    setUserSearch("");
                  }}
                  className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {users.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {[item.firstName, item.lastName].filter(Boolean).join(" ") || "Unnamed"}
                    </p>
                    <p className="text-slate-500 truncate">{item.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={userRoleDraft[item._id] ?? item.role}
                      onChange={(event) =>
                        setUserRoleDraft((prev) => ({
                          ...prev,
                          [item._id]: event.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                    >
                      <option value="Tenant">Tenant</option>
                      <option value="Landlord">Landlord</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <button
                      onClick={() => updateUserRole(item._id)}
                      className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Save Role
                    </button>
                    <button
                      onClick={() => updateUserStatus(item._id, !item.isSuspended)}
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        item.isSuspended
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {item.isSuspended ? "Unsuspend" : "Suspend"}
                    </button>
                    <button
                      onClick={() => deleteUser(item._id)}
                      className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!users.length && !isLoading ? (
                <p className="text-slate-500">No users found.</p>
              ) : null}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-500">
                  Showing page {userPage} of {userTotalPages} ({userTotal} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={userPage <= 1 || isLoading}
                    onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={userPage >= userTotalPages || isLoading}
                    onClick={() =>
                      setUserPage((prev) => Math.min(userTotalPages, prev + 1))
                    }
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Listings</h2>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={listingSearchInput}
                  onChange={(event) => setListingSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setListingSearch(listingSearchInput.trim());
                    }
                  }}
                  placeholder="Search listings..."
                  className="h-9 w-52 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setListingSearch(listingSearchInput.trim())}
                  className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListingSearchInput("");
                    setListingSearch("");
                  }}
                  className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {listings.map((item) => (
                <div
                  key={item._id}
                  className="rounded-lg border border-slate-200 p-3 space-y-2"
                >
                  <p className="font-medium">
                    {item.propertyType || "Property"} - {item.status || "Unknown"}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    Moderation: {item.moderationStatus || "Pending"}
                  </p>
                  <p className="text-slate-500">
                    {[item.address?.street, item.address?.city].filter(Boolean).join(", ") ||
                      "No address"}
                  </p>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Posted by
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {[item.landlord?.firstName, item.landlord?.lastName]
                        .filter(Boolean)
                        .join(" ") || "Unknown landlord"}
                    </p>
                    <p className="text-xs text-slate-600">
                      {item.landlord?.email || "No email"} - ID:{" "}
                      {item.landlord?.id || String(item.landlordId || "N/A")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moderateListing(item._id, "approve")}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => moderateListing(item._id, "reject")}
                      className="rounded-md bg-amber-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => moderateListing(item._id, "hide")}
                      className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Hide
                    </button>
                    <button
                      onClick={() => deleteListing(item._id)}
                      className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!listings.length && !isLoading ? (
                <p className="text-slate-500">No listings found.</p>
              ) : null}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-500">
                  Showing page {listingPage} of {listingTotalPages} ({listingTotal} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={listingPage <= 1 || isLoading}
                    onClick={() => setListingPage((prev) => Math.max(1, prev - 1))}
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={listingPage >= listingTotalPages || isLoading}
                    onClick={() =>
                      setListingPage((prev) => Math.min(listingTotalPages, prev + 1))
                    }
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Audit Logs</h2>
          <div className="mt-3 space-y-2">
            {auditRows.map((row, index) => (
              <div
                key={`${String(row._id ?? index)}`}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <p className="font-semibold">{String(row.action ?? "ACTION")}</p>
                <p className="text-slate-500">
                  {String(row.entityType ?? "")} {String(row.entityId ?? "")}
                </p>
              </div>
            ))}
            {!auditRows.length && !isLoading ? (
              <p className="text-slate-500">No logs yet.</p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 h-[250px]">{children}</div>
    </div>
  );
}

