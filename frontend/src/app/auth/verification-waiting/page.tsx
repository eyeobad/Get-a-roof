"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VerificationWaitingPage() {
  const router = useRouter();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col items-center justify-center px-4">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden bg-background-light dark:bg-background-dark p-6 sm:p-8">
        <div className="h-12" />

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
            <h1 className="text-text-dark dark:text-white text-3xl font-bold leading-tight tracking-tight">
              Verification Pending
            </h1>
            <p className="text-text-dark/80 dark:text-gray-300 text-lg font-normal leading-relaxed">
              Thank you for submitting your documents. Our team is currently reviewing them to ensure community safety.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-[#1C2533]">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span className="text-text-dark dark:text-white text-lg font-medium">Estimated wait: 1-2 business days</span>
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
          <Link
            href="#"
            className="group flex items-center justify-center gap-2 text-primary text-lg font-semibold underline underline-offset-4 decoration-transparent transition hover:decoration-current"
          >
            <span className="text-base font-medium">Need help? Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
