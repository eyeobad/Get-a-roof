"use client";

import { useEffect } from "react";
import { getApiErrorMessage, hasShownErrorToast, showToast } from "@/lib/alerts";

export function useToastError(error: unknown, enabled = true) {
  useEffect(() => {
    if (!enabled || !error || hasShownErrorToast(error)) {
      return;
    }
    if (typeof error === "string") {
      showToast({
        title: error.trim() || "Something went wrong.",
        variant: "error",
      });
      return;
    }
    showToast({
      title: getApiErrorMessage(error),
      variant: "error",
    });
  }, [enabled, error]);
}
