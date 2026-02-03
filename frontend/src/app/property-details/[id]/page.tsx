"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import PropertyDetailsView from "@/components/PropertyDetailsView";
import { useAppStore } from "@/store/useAppStore";

const isMongoId = (value?: string | null) =>
  Boolean(value && /^[a-f\d]{24}$/i.test(value));

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) return raw[0] ?? "";
    return typeof raw === "string" ? raw : "";
  }, [params]);

  const listing = useAppStore((state) =>
    listingId ? state.listingsById[listingId] : undefined
  );
  const fetchPropertyById = useAppStore((state) => state.fetchPropertyById);
  const setSelectedListingId = useAppStore((state) => state.setSelectedListingId);
  const authToken = useAppStore((state) => state.authToken);

  useEffect(() => {
    if (!listingId) return;
    setSelectedListingId(listingId);
  }, [listingId, setSelectedListingId]);

  useEffect(() => {
    if (!listingId || listing) return;
    if (!authToken || !isMongoId(listingId)) return;
    void fetchPropertyById(listingId);
  }, [listingId, listing, authToken, fetchPropertyById]);

  if (!listingId) {
    return (
      <div className="min-h-screen bg-background-light text-slate-900 font-display flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Missing property id</h1>
          <p className="text-slate-600">We couldn&apos;t determine which property to load.</p>
          <button
            onClick={() => router.push("/explore")}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-white font-semibold"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  if (!listing && !authToken) {
    return (
      <div className="min-h-screen bg-background-light text-slate-900 font-display flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign in to view this listing</h1>
          <p className="text-slate-600">
            Property details load from your account. Log in to continue.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-white font-semibold"
            >
              Go to Login
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-slate-700 font-semibold"
            >
              Back to Explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    const isLoading = authToken && isMongoId(listingId);
    return (
      <div className="min-h-screen bg-background-light text-slate-900 font-display flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">
            {isLoading ? "Loading property..." : "Property not found"}
          </h1>
          <p className="text-slate-600">
            {isLoading
              ? "Fetching the latest details. If this persists, the listing may be unavailable."
              : "We couldn&apos;t find that listing. Try another property."}
          </p>
          <button
            onClick={() => router.push("/explore")}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-white font-semibold"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return <PropertyDetailsView listing={listing} />;
}
