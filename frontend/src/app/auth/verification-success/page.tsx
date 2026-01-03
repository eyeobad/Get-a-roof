"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerificationApprovedPage() {
  const router = useRouter();

  return (
    <div className="bg-background-light font-display min-h-screen flex flex-col items-center justify-center">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-background-light p-6 sm:p-8">
        <div className="h-12 w-full" />

        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-primary/10">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 72, fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-text-main text-3xl font-bold leading-tight tracking-tight">
              Verification Approved!
            </h1>
            <p className="text-text-main/80 text-lg font-normal leading-relaxed px-2">
              Your identity has been successfully verified. You can now fully access all
              features of Get a Roof.
            </p>
          </div>
        </div>

        <div className="mt-auto flex w-full flex-col gap-6 pb-8 pt-12">
          <button
            onClick={() => router.push("/explore")}
            className="flex h-14 w-full cursor-pointer items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98]"
          >
            Continue to App
          </button>

          <Link
            href="/support"
            className="group flex items-center justify-center gap-2 text-primary"
          >
            <span className="text-base font-medium underline underline-offset-4 group-hover:text-primary/80">
              Need help? Contact Support
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
