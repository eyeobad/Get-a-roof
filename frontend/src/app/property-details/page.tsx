"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export default function PropertyDetailsRedirect() {
  const router = useRouter();
  const hasHydrated = useAppStore((state) => state._hasHydrated);
  const firstListingId = useAppStore(
    (state) => state.selectedListingId ?? Object.keys(state.listingsById)[0] ?? null
  );

  useEffect(() => {
    if (!hasHydrated) return;
    if (firstListingId) {
      router.replace(`/property-details/${firstListingId}`);
      return;
    }
    router.replace("/explore");
  }, [firstListingId, hasHydrated, router]);

  return null;
}
