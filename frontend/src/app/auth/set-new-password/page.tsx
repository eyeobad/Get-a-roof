"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export default function SetNewPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetPassword = useAppStore((state) => state.resetPassword);
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordMeetsRules = useMemo(() => {
    const p = password.trim();
    return p.length >= 8 && /\d/.test(p);
  }, [password]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword.length) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const canSubmit =
    passwordMeetsRules && password === confirmPassword && !isSubmitting && !!token;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await resetPassword(token, password);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background-light text-text-main min-h-screen transition-colors duration-200">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-background-light ">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eceef5] bg-background-light px-4 py-6">
          <button
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex h-12 w-12 items-center justify-center rounded-full text-text-main hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>

          <h1 className="text-center text-2xl font-bold flex-1 text-text-main">Set New Password</h1>
          <div className="w-12" />
        </header>

        <main className="flex flex-1 flex-col px-6 pb-8 pt-6">
          <p className="text-center text-lg font-normal leading-relaxed text-text-main/80">
            Please create a secure password including at least 8 characters and one number.
          </p>

          <div className="mt-6 flex flex-col gap-6">
            {/* New Password */}
            <label className="flex flex-col gap-2">
              <span className="text-lg font-medium text-text-main pl-1">New Password</span>

              <div className="relative flex w-full items-center rounded-2xl border-2 border-[#ced7e8] bg-white px-5 h-16 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  className="flex w-full flex-1 bg-transparent text-lg font-normal text-text-main placeholder:text-[#64748b] outline-none"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[#64748b] hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>

              <div className="pl-1 text-sm font-medium">
                {!password.length ? (
                  <span className="text-text-main/50">Use at least 8 characters and include 1 number.</span>
                ) : passwordMeetsRules ? (
                  <span className="text-green-600">Looks good.</span>
                ) : (
                  <span className="text-red-600">Password must be 8+ characters and include a number.</span>
                )}
              </div>
            </label>

            {/* Verify Password */}
            <label className="flex flex-col gap-2">
              <span className="text-lg font-medium text-text-main pl-1">Verify New Password</span>

              <div className="relative flex w-full items-center rounded-2xl border-2 border-[#ced7e8] bg-white px-5 h-16 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <input
                  id="verify-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter new password"
                  className="flex w-full flex-1 bg-transparent text-lg font-normal text-text-main placeholder:text-[#64748b] outline-none"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />

                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-[#64748b] hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showConfirm ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>

              <div className="pl-1 text-sm font-medium">
                {!confirmPassword.length ? null : passwordsMatch ? (
                  <span className="text-green-600">Passwords match.</span>
                ) : (
                  <span className="text-red-600">Passwords do not match.</span>
                )}
              </div>
            </label>
          </div>

          <div className="flex-1 min-h-[40px]" />

          <div className="mt-auto pt-4">
            {error && (
              <p className="text-center text-sm font-medium text-red-600 mb-3">
                {error}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex w-full items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
