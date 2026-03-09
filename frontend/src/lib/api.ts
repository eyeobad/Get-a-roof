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
type ApiErrorLike = Error & {
  status?: number;
  data?: unknown;
  code?: string;
};
type ResponseCacheEntry = {
  value: unknown;
  expiresAt: number;
};
const inflightGetRequests = new Map<string, Promise<unknown>>();
const memoryGetCache = new Map<string, ResponseCacheEntry>();
const GET_CACHE_TTL_MS = 20_000;

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

  const method = (options.method ?? "GET").toUpperCase();
  const isCacheableGet = method === "GET" && !options.body;
  const authPart = options.token ? options.token.slice(0, 20) : "anon";
  const requestKey = `${method}:${url}:${authPart}`;

  const performRequest = async () => {
    const innerResponse = await fetch(url, {
      ...options,
      cache: options.cache ?? "no-store",
      headers,
    });

    if (!innerResponse.ok) {
      const rawMessage = await innerResponse.text();
      let parsed: unknown = null;
      try {
        parsed = rawMessage ? JSON.parse(rawMessage) : null;
      } catch {
        parsed = null;
      }

      const parsedMessage =
        typeof parsed === "object" &&
        parsed !== null &&
        "message" in parsed
          ? (parsed as { message?: unknown }).message
          : undefined;
      const messageFromObject =
        typeof parsedMessage === "object" &&
        parsedMessage !== null &&
        "message" in (parsedMessage as Record<string, unknown>)
          ? (parsedMessage as { message?: unknown }).message
          : undefined;
      const message =
        typeof parsedMessage === "string"
          ? parsedMessage
          : typeof messageFromObject === "string"
            ? messageFromObject
            : rawMessage || innerResponse.statusText || "Request failed";
      const normalized = message.toLowerCase();
      const shouldForceRelogin =
        Boolean(options.token) &&
        (innerResponse.status === 401 ||
          innerResponse.status === 403 ||
          (innerResponse.status === 404 &&
            (normalized.includes("user not found") ||
              normalized.includes("account not found") ||
              normalized.includes("invalid user"))));
      if (shouldForceRelogin) {
        void forceRelogin();
      }
      const error = markErrorToastShown(new Error(message)) as ApiErrorLike;
      error.status = innerResponse.status;
      error.data = parsed ?? rawMessage;
      if (
        parsed &&
        typeof parsed === "object" &&
        "errorCode" in (parsed as Record<string, unknown>)
      ) {
        error.code = String((parsed as Record<string, unknown>).errorCode);
      }
      showToast({
        title: getApiErrorMessage(error),
        variant: "error",
      });
      throw error;
    }

    const contentType = innerResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await innerResponse.json()) as T;
    }

    return null as T;
  };

  if (isCacheableGet) {
    const cached = memoryGetCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
    const existingInflight = inflightGetRequests.get(requestKey);
    if (existingInflight) {
      return (await existingInflight) as T;
    }
    const promise = performRequest()
      .then((value) => {
        memoryGetCache.set(requestKey, {
          value,
          expiresAt: Date.now() + GET_CACHE_TTL_MS,
        });
        return value;
      })
      .finally(() => {
        inflightGetRequests.delete(requestKey);
      });
    inflightGetRequests.set(requestKey, promise);
    return (await promise) as T;
  }
  return performRequest();
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
