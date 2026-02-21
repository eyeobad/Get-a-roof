"use client";

import { useEffect } from "react";
import { getApiErrorMessage, hasShownErrorToast, showToast } from "@/lib/alerts";

export function useToastError(error: unknown, enabled = true) {
  useEffect(() => {
    if (!enabled || !error || hasShownErrorToast(error)) {
      return;
    }
    showToast({
      title: getApiErrorMessage(error),
      variant: "error",
    });
  }, [enabled, error]);
}
