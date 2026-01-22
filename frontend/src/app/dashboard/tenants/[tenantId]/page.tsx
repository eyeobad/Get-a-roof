"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

type TenantProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  isVerified?: boolean;
  preferences?: Record<string, any>;
};

export default function TenantProfilePage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId as string;
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const userId = useAppStore((state) => state.userId);
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authToken || !userId || !tenantId) return;
    setLoading(true);
    setError(null);
    apiFetch<any>(`/api/landlord/${userId}/tenants/${tenantId}`, {
      token: authToken,
    })
      .then((data) => {
        setTenant({
          id: data?.id ?? data?._id ?? tenantId,
          firstName: data?.firstName,
          lastName: data?.lastName,
          email: data?.email,
          phoneNumber: data?.phoneNumber,
          photoUrl: data?.photoUrl,
          isVerified: data?.isVerified,
          preferences: data?.preferences,
        });
      })
      .catch((err) => {
        setError((err as Error).message || "Unable to load tenant profile.");
      })
      .finally(() => setLoading(false));
  }, [authToken, userId, tenantId]);

  const name = useMemo(() => {
    if (!tenant) return "Tenant";
    return `${tenant.firstName ?? ""} ${tenant.lastName ?? ""}`.trim() || "Tenant";
  }, [tenant]);

  const preferences = tenant?.preferences?.tenant ?? {};

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-900 font-display antialiased">
      <div className="max-w-md mx-auto px-5 py-6 space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a44b8]"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </button>

        <header className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
            {tenant?.photoUrl ? (
              <img
                src={tenant.photoUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-500">
              {tenant?.isVerified ? "Verified tenant" : "Verification pending"}
            </p>
          </div>
        </header>

        {!authToken || !userId ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500">
            Sign in to view tenant details.
          </div>
        ) : loading ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500">
            Loading profile...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <>
            <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Contact
              </h2>
              <p className="text-sm text-gray-700">
                Email: {tenant?.email ?? "Not provided"}
              </p>
              <p className="text-sm text-gray-700">
                Phone: {tenant?.phoneNumber ?? "Not provided"}
              </p>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Preferences
              </h2>
              <div className="text-sm text-gray-700 space-y-2">
                <p>Employment: {preferences?.employmentStatus ?? "Not set"}</p>
                <p>Marital Status: {preferences?.maritalStatus ?? "Not set"}</p>
                <p>Vehicles: {preferences?.vehicles ?? "Not set"}</p>
                <p>Pets: {preferences?.hasPets === undefined ? "Not set" : preferences.hasPets ? "Yes" : "No"}</p>
                <p>Smoking: {preferences?.smokingHabits ?? "Not set"}</p>
                <p>Drinking: {preferences?.drinkingHabits ?? "Not set"}</p>
                <p>Religion: {preferences?.religionPreference ?? "Not set"}</p>
                <p>Education: {preferences?.educationLevel ?? "Not set"}</p>
                <p>Social Habits: {preferences?.socialHabits ?? "Not set"}</p>
                <p>
                  Children:{" "}
                  {preferences?.hasChildren === undefined
                    ? "Not set"
                    : preferences.hasChildren
                      ? "Has children"
                      : "No children"}
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
