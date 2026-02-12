"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerificationSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams?.get("userId") ?? "";

  useEffect(() => {
    const params = new URLSearchParams(userId ? { userId } : {});
    const timer = setTimeout(() => {
      router.push(`/login?${params.toString()}`);
    }, 2200);
    return () => clearTimeout(timer);
  }, [router, userId]);

  const handleContinue = () => {
    const params = new URLSearchParams(userId ? { userId } : {});
    router.push(`/login?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fffefe] px-6 text-center font-display">
      <div className="rounded-[2rem] border border-[#e3e4eb] bg-white px-10 py-12 shadow-[0_20px_80px_rgba(10,22,70,0.08)] max-w-md w-full">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#dbe3ff] to-[#f0f5ff] text-[#0a44b8] shadow-inner">
          <span className="material-symbols-outlined text-[34px]">check_circle</span>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[#101a3c]">
          Verification Approved!
        </h1>
        <p className="mt-3 text-lg text-[#3e4564]">
          Your identity has been successfully verified. You can now fully access
          all features of Get a Roof.
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-8 w-full rounded-full bg-[#0a44b8] px-6 py-3 text-lg font-semibold text-white shadow-[0_15px_35px_rgba(10,68,184,0.35)] transition hover:bg-[#083590]"
        >
          Continue to App
        </button>
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
