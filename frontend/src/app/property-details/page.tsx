"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export default function PropertyDetailsRedirect() {
  const router = useRouter();
  const firstListingId = useAppStore(
    (state) => state.selectedListingId ?? Object.keys(state.listingsById)[0] ?? null
  );

  useEffect(() => {
    if (firstListingId) {
      router.replace(`/property-details/${firstListingId}`);
    }
  }, [firstListingId, router]);

  return null;
}
