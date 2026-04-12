"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { showToast } from "@/lib/alerts";

const DIGITS = 6;

function PhoneVerificationContent() {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [values, setValues] = useState<string[]>(Array(DIGITS).fill(""));
  const [timer, setTimer] = useState(59);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyPhoneOtp = useAppStore((state) => state.verifyPhoneOtp);
  const sendPhoneOtp = useAppStore((state) => state.sendPhoneOtp);
  const userId = searchParams?.get("userId") ?? "";
  const phone = searchParams?.get("phone") ?? "(555) 123-4567";
  const nextParam = searchParams?.get("next") ?? "";

  const buildNextUrl = (target: string) => {
    if (!target) return "";
    const decoded = decodeURIComponent(target);
    const [path, queryString] = decoded.split("?");
    const params = new URLSearchParams(queryString || "");
    if (userId) {
      params.set("userId", userId);
    }
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...values];
    next[index] = value;
    setValues(next);

    if (value && index < DIGITS - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && values[index] === "" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (timer === 0) return undefined;
    const timeout = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(timeout);
  }, [timer]);

  const otp = values.join("");
  const canSubmit = otp.length === DIGITS && !isSubmitting && !!userId;

  const handleVerify = async () => {
    if (!userId || !canSubmit) return;
    try {
      setIsSubmitting(true);
      await verifyPhoneOtp(userId, otp);
      const nextUrl = buildNextUrl(nextParam);
      router.push(nextUrl || "/explore");
    } catch (err) {
      showToast({
        title: err instanceof Error ? err.message : "Verification failed",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!userId || timer > 0) return;
    try {
      await sendPhoneOtp(userId);
      setTimer(59);
    } catch (err) {
      showToast({
        title: err instanceof Error ? err.message : "Resend failed",
        variant: "error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background-light font-display text-text-main">
      <div className="mx-auto w-full max-w-md px-6 pb-10 pt-8">
        <header className="flex items-center">
          <button
            onClick={() => router.back()}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[28px]">
              arrow_back
            </span>
          </button>
          <div className="flex-1" />
        </header>

        <main className="mt-3 flex flex-col text-center">
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-text-main">
            Verify Your <br />
            Phone Number
          </h1>

          <p className="mt-2 text-lg font-medium text-[#0d121c]/80">
            We sent a 6-digit code to <br />
            <span className="font-bold text-primary text-xl whitespace-nowrap">
              {phone}
            </span>
            . <br />
            Enter it below to continue.
          </p>

          <div className="mt-8 w-full">
            <fieldset className="flex gap-2 sm:gap-3">
              {Array.from({ length: DIGITS }).map((_, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputsRef.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${index + 1}`}
                  className="flex h-14 w-full items-center justify-center rounded-2xl border-2 border-[#ced8e8] bg-white text-center text-2xl font-bold text-primary shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
                  value={values[index]}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e.key)}
                />
              ))}
            </fieldset>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-[#e7ebf4] px-4 py-2">
              <span className="material-symbols-outlined text-[20px]">
                timer
              </span>
              <p className="text-base font-semibold">
                Resend code in {timer.toString().padStart(2, "0")}
              </p>
            </div>

            <button
              disabled={timer > 0}
              onClick={handleResend}
              className="text-lg font-bold text-primary underline decoration-2 underline-offset-4 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resend Code
            </button>
          </div>

          <div className="mt-10">
            <button
              onClick={handleVerify}
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-xl font-bold text-white shadow-lg shadow-primary/30 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>Verify</span>
              <span className="material-symbols-outlined text-[24px]">
                arrow_forward
              </span>
            </button>

            <p className="mt-4 text-center text-sm font-medium text-text-main/60">
              Need help?{" "}
              <Link className="font-bold text-primary" href="#">
                Contact Support
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PhoneVerificationPage() {
  return (
    <Suspense fallback={null}>
      <PhoneVerificationContent />
    </Suspense>
  );
}
