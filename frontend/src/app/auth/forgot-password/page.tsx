"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmailValid = useMemo(() => {
    // Simple + safe email check for UI gating (backend must still validate)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const handleSubmit = async () => {
    if (!isEmailValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      // TODO: call your API here:
      // await fetch("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email }) })

      // For now: just a UX-friendly fake delay
      await new Promise((r) => setTimeout(r, 650));

      // TODO: route to a "Check your email" screen if you have one
      // router.push("/auth/check-email");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-warm-beige font-display transition-colors duration-200 overflow-x-hidden">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 justify-between">
        <button
          aria-label="Go back"
          onClick={() => router.back()}
          className="text-near-black flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span className="material-symbols-outlined text-[32px]">chevron_left</span>
        </button>
      </div>

      {/* Main Content Wrapper (matches HTML) */}
      <main className="flex flex-1 flex-col justify-start max-w-[600px] mx-auto w-full">
        <h1 className="text-primary tracking-tight text-[32px] md:text-[36px] font-bold leading-tight px-6 text-left pb-3 pt-6">
          Forgot Password?
        </h1>

        <div className="px-6 pb-6 pt-1">
          <p className="text-near-black text-lg font-normal leading-relaxed">
            Don&apos;t worry, it happens. Please enter the email address associated with your
            account, and we will send you a secure link to reset your password.
          </p>
        </div>

        {/* Input Field */}
        <div className="flex w-full flex-wrap items-end gap-4 px-6 py-3">
          <label className="flex flex-col w-full flex-1">
            <p className="text-near-black text-lg font-medium leading-normal pb-3 pl-1">
              Email Address
            </p>

            <div className="relative">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                type="email"
                placeholder="example@email.com"
                aria-label="Email Address Input"
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-2xl text-near-black placeholder:text-[#64748b] focus:outline-0 focus:ring-4 focus:ring-primary/10 border-2 border-[#ced7e8] bg-white focus:border-primary h-16 px-5 text-lg font-normal leading-normal shadow-sm transition-all"
              />

              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none">
                <span className="material-symbols-outlined">mail</span>
              </div>
            </div>

            {/* Optional helper */}
            {!email.length ? null : !isEmailValid ? (
              <p className="mt-2 text-sm font-medium text-red-600 pl-1">
                Please enter a valid email address.
              </p>
            ) : null}
          </label>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-[40px]" />

        {/* Action Button */}
        <div className="flex px-6 py-6 pb-10 w-full">
          <button
            onClick={handleSubmit}
            disabled={!isEmailValid || isSubmitting}
            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 bg-primary text-white text-lg font-bold leading-normal tracking-wide shadow-lg shadow-blue-900/10 transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            <span className="truncate">{isSubmitting ? "Sending..." : "Send Reset Link"}</span>
          </button>
        </div>

        <div className="px-6 pb-10">
          <p className="text-sm text-near-black/60">
            Remembered your password?{" "}
            <Link className="text-primary font-bold" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </main>

      {/* Keep icon styling consistent */}
      <style jsx global>{`
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
      `}</style>
    </div>
  );
}
