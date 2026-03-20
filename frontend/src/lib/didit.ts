"use client";

type LaunchDiditOptions = {
  userId?: string;
  email?: string;
  role?: string;
  next?: string;
};

const withQueryParams = (url: string, params: Record<string, string>) => {
  const target = new URL(url, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) target.searchParams.set(key, value);
  });
  return target.toString();
};

export const getDiditLandlordLaunchUrl = (
  options: LaunchDiditOptions = {}
): string | null => {
  const configured = process.env.NEXT_PUBLIC_DIDIT_LANDLORD_VERIFICATION_URL?.trim();
  if (!configured) return null;

  // Optional passthrough values if your Didit link/session endpoint supports them.
  return withQueryParams(configured, {
    userId: options.userId ?? "",
    email: options.email ?? "",
    role: options.role ?? "landlord",
    next: options.next ?? "/dashboard/overview",
  });
};

export const launchDiditLandlordVerification = (
  options: LaunchDiditOptions = {}
): boolean => {
  if (typeof window === "undefined") return false;
  const launchUrl = getDiditLandlordLaunchUrl(options);
  if (!launchUrl) return false;
  window.location.assign(launchUrl);
  return true;
};

