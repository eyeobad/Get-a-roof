"use client";

import { useRouter } from "next/navigation";

export default function VerificationPendingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background-light font-display text-text-main flex items-center justify-center">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-background-light p-6 sm:p-8">
        <div className="h-12 w-full" />

        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 64 }}>
                pending_actions
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Verification Pending</h1>
            <p className="text-lg font-normal text-text-main/80 leading-relaxed">
              Thank you for submitting your documents. Our team is currently reviewing them to ensure community safety.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span className="text-lg font-medium text-text-main">Estimated wait: 1-2 business days</span>
            </div>
          </div>
        </div>

        <div className="mt-auto flex w-full flex-col gap-6 pb-8 pt-12">
          <button
            onClick={() => router.push("/explore")}
            className="flex h-14 w-full items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98]"
          >
            Return to Home
          </button>
          <button className="group flex items-center justify-center gap-2 text-primary">
            <span className="text-base font-medium underline underline-offset-4 group-hover:text-primary/80">
              Need help? Contact Support
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
