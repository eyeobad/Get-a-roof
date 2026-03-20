"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { launchDiditLandlordVerification } from "@/lib/didit";

type VerificationOutcome = "success" | "failed" | "abandoned" | "unknown";

const SUCCESS_VALUES = new Set([
  "approved",
  "success",
  "verified",
  "complete",
  "completed",
  "pass",
  "passed",
]);
const FAILED_VALUES = new Set([
  "failed",
  "declined",
  "rejected",
  "error",
  "denied",
]);
const ABANDONED_VALUES = new Set([
  "abandoned",
  "cancelled",
  "canceled",
  "incomplete",
  "expired",
  "timeout",
]);

function VerificationSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams?.get("userId") ?? "";
  const nextParam = searchParams?.get("next") ?? "";
  const retryUrl =
    searchParams?.get("retryUrl") ??
    searchParams?.get("retry_url") ??
    searchParams?.get("resumeUrl") ??
    searchParams?.get("resume_url") ??
    "";
  const diditStatusRaw =
    searchParams?.get("status") ??
    searchParams?.get("verificationStatus") ??
    searchParams?.get("verification_status") ??
    searchParams?.get("decision") ??
    searchParams?.get("result") ??
    "";
  const authToken = useAppStore((state) => state.authToken);
  const userRole = useAppStore((state) => state.user?.role);
  const userEmail = useAppStore((state) => state.user?.email);

  const normalizeRole = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value[0]?.toLowerCase() ?? "";
    return (value ?? "").toLowerCase();
  };

  const role = normalizeRole(userRole);
  const isLandlordLike = role === "landlord" || role === "organisation";
  const hasSession = Boolean(authToken);
  const diditStatus = diditStatusRaw.trim().toLowerCase();

  const outcome: VerificationOutcome = (() => {
    if (SUCCESS_VALUES.has(diditStatus)) return "success";
    if (FAILED_VALUES.has(diditStatus)) return "failed";
    if (ABANDONED_VALUES.has(diditStatus)) return "abandoned";
    return "unknown";
  })();

  const resolvedTarget = (() => {
    if (nextParam) return decodeURIComponent(nextParam);
    if (hasSession) return isLandlordLike ? "/dashboard/overview" : "/explore";
    const params = new URLSearchParams(userId ? { userId } : {});
    return `/login?${params.toString()}`;
  })();

  useEffect(() => {
    if (outcome === "failed" || outcome === "abandoned") return undefined;
    const timer = setTimeout(() => {
      router.push(resolvedTarget);
    }, 2200);
    return () => clearTimeout(timer);
  }, [outcome, resolvedTarget, router]);

  const handleContinue = () => {
    router.push(resolvedTarget);
  };

  const handleRetryOrResume = () => {
    if (retryUrl) {
      window.location.assign(retryUrl);
      return;
    }
    const launched = launchDiditLandlordVerification({
      userId: userId || undefined,
      email: userEmail || undefined,
      role: "landlord",
      next: "/dashboard/overview",
    });
    if (!launched) {
      router.push("/verify-identity");
    }
  };

  const ui = (() => {
    if (outcome === "failed") {
      return {
        icon: "cancel",
        iconClass: "text-rose-600",
        title: "Verification Failed",
        text: "We could not verify your identity. Please retry to continue.",
        actionLabel: "Retry Verification",
      };
    }
    if (outcome === "abandoned") {
      return {
        icon: "hourglass_top",
        iconClass: "text-amber-600",
        title: "Verification Not Completed",
        text: "Your verification was not completed. Resume when you are ready.",
        actionLabel: "Resume Verification",
      };
    }
    return {
      icon: "check_circle",
      iconClass: "text-[#0a44b8]",
      title: "Verification Approved!",
      text: "Your identity has been successfully verified. You can now fully access all features of Get a Roof.",
      actionLabel: "Continue to App",
    };
  })();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fffefe] px-6 text-center font-display">
      <div className="rounded-[2rem] border border-[#e3e4eb] bg-white px-10 py-12 shadow-[0_20px_80px_rgba(10,22,70,0.08)] max-w-md w-full">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#dbe3ff] to-[#f0f5ff] shadow-inner">
          <span className={`material-symbols-outlined text-[34px] ${ui.iconClass}`}>{ui.icon}</span>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[#101a3c]">{ui.title}</h1>
        <p className="mt-3 text-lg text-[#3e4564]">{ui.text}</p>

        <button
          type="button"
          onClick={outcome === "failed" || outcome === "abandoned" ? handleRetryOrResume : handleContinue}
          className="mt-8 w-full rounded-full bg-[#0a44b8] px-6 py-3 text-lg font-semibold text-white shadow-[0_15px_35px_rgba(10,68,184,0.35)] transition hover:bg-[#083590]"
        >
          {ui.actionLabel}
        </button>
        {(outcome === "failed" || outcome === "abandoned") && (
          <button
            type="button"
            onClick={() => router.push("/dashboard/overview")}
            className="mt-3 w-full rounded-full border border-[#d4daf0] bg-white px-6 py-3 text-base font-semibold text-[#0a44b8] transition hover:bg-[#f5f8ff]"
          >
            Back to Overview
          </button>
        )}
        <p className="mt-4 text-sm text-[#0a44b8] underline-offset-2 hover:underline">
          Need help? Contact Support
        </p>
      </div>
    </div>
  );
}

export default function VerificationSuccessPage() {
  return (
    <Suspense fallback={null}>
      <VerificationSuccessContent />
    </Suspense>
  );
}
