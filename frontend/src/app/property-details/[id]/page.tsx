"use client";

import { useRouter, useParams } from "next/navigation";
import PropertyDetailsView from "@/components/PropertyDetailsView";
import { useAppStore } from "@/store/useAppStore";

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const listingIdRaw = params?.id;
  const listingId = Array.isArray(listingIdRaw) ? listingIdRaw[0] : listingIdRaw ?? null;
  const listing = useAppStore((state) => (listingId ? state.listingsById[listingId] ?? null : null));

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <p>We could not find that property.</p>
      </div>
    );
  }

  return <PropertyDetailsView listing={listing} onBack={() => router.back()} />;
}
