"use client";

import {
  getApiErrorMessage,
  hasShownErrorToast,
  markErrorToastShown,
  showToast,
} from "@/lib/alerts";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiOptions = RequestInit & { token?: string };

const forceRelogin = async () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("get-a-roof-store");
  } catch {
    // ignore
  }
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // ignore
  }
  const next = `${window.location.pathname}${window.location.search}`;
  const target = `/login?next=${encodeURIComponent(next)}`;
  if (!window.location.pathname.startsWith("/login")) {
    window.location.replace(target);
  }
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(
    isFormData ? undefined : { "Content-Type": "application/json" }
  );
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(url, {
    ...options,
    cache: options.cache ?? "no-store",
    headers,
  });

  if (!response.ok) {
    const rawMessage = await response.text();
    const message = rawMessage || response.statusText || "Request failed";
    const normalized = message.toLowerCase();
    const shouldForceRelogin =
      Boolean(options.token) &&
      (response.status === 401 ||
        response.status === 403 ||
        (response.status === 404 &&
          (normalized.includes("user not found") ||
            normalized.includes("account not found") ||
            normalized.includes("invalid user"))));
    if (shouldForceRelogin) {
      void forceRelogin();
    }
    const error = markErrorToastShown(new Error(message));
    showToast({
      title: getApiErrorMessage(error),
      variant: "error",
    });
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return null as T;
}

export function toastUnhandledError(err: unknown, fallback = "Something went wrong.") {
  if (hasShownErrorToast(err)) {
    return;
  }
  showToast({
    title: getApiErrorMessage(err) || fallback,
    variant: "error",
  });
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  return query.toString();
}
