"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getApiErrorMessage, hasShownErrorToast, showToast } from "@/lib/alerts";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const login = useAppStore((state) => state.login);
  const captureUserLocation = useAppStore((state) => state.captureUserLocation);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const result = await login(email, password);
      if (!result) {
        const message = "Login failed.";
        showToast({ title: message, variant: "error" });
        return;
      }
      if (result.status === "EMAIL_NOT_VERIFIED" && result.userId) {
        const query = new URLSearchParams({
          userId: result.userId,
          email: result.email ?? email,
          verificationToken: result.verificationToken ?? "",
          otpSent: result.otpSent ? "1" : "0",
        });
        showToast({
          title: "Verify your email to continue",
          variant: "info",
        });
        router.push(`/auth/email-verification?${query.toString()}`);
        return;
      }
      if (!result.user) {
        showToast({ title: "Login failed.", variant: "error" });
        return;
      }
      const rawRole = result.user?.role;
      const roles = Array.isArray(rawRole)
        ? rawRole
        : rawRole
        ? [rawRole]
        : [];
      const isLandlord = roles.some(
        (value) => value?.toString().toLowerCase() === "landlord"
      );
      const isAdmin = roles.some(
        (value) => value?.toString().toLowerCase() === "admin"
      );
      const tenantPreferences = (
        result.user?.preferences as { tenant?: { lookingFor?: string[] } } | undefined
      )?.tenant;
      const needsTenantOnboarding =
        !isLandlord &&
        (!tenantPreferences ||
          !tenantPreferences.lookingFor ||
          tenantPreferences.lookingFor.length === 0);
      if (!isAdmin && !isLandlord) {
        const location = await captureUserLocation();
        if (!location) {
          clearAuth();
          showToast({
            title: "Location access is required after sign in. Please enable location and try again.",
            variant: "error",
          });
          return;
        }
      }
      if (isAdmin) {
        router.push("/admin");
      } else if (isLandlord) {
        router.push("/dashboard/properties");
      } else if (needsTenantOnboarding) {
        router.push("/tenant-onboarding");
      } else {
        router.push("/explore");
      }
    } catch (err) {
      if (!hasShownErrorToast(err)) {
        const message = getApiErrorMessage(err);
        showToast({ title: message, variant: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f5f6f8] text-[#1A1A1A] font-display antialiased">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-8">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className=" rounded-full  flex items-center justify-center">
            <Image
              src="/logo2.svg"
              alt="Get a Roof Logo"
              width={204}
              height={204}
              className="object-cover"
            />
          </div>
          <h1 className="text-[#0a44b8] text-3xl font-bold leading-tight tracking-tight">
            Welcome Back
          </h1>
          <p className="text-lg font-medium text-[#4d4d4d]">
            Log in to find your perfect home.
          </p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium text-[#1A1A1A]" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="form-input w-full h-14 rounded-[1.25rem] border border-gray-300 bg-white px-5 text-lg text-[#1A1A1A] focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]/20 transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-lg font-medium text-[#1A1A1A]"
              htmlFor="loginPassword"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="loginPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="form-input w-full h-14 rounded-[1.25rem] border border-gray-300 bg-white px-5 text-lg text-[#1A1A1A] focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]/20 transition pr-14"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                className="absolute inset-y-0 right-0 flex items-center justify-center pr-4 text-[#0a44b8]"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-6 h-6"
                  >
                    <path
                      d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z"
                      fill="#0a44b8"
                    />
                    <path
                      d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z"
                      fill="#0a44b8"
                    />
                    <path
                      d="M6.75 12c0-.619.107-1.215.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z"
                      fill="#0a44b8"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-6 h-6"
                  >
                    <path
                      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                      fill="#0a44b8"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                      fill="#0a44b8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-14 items-center justify-center rounded-[1.75rem] bg-[#0a44b8] text-white text-base font-bold transition hover:bg-[#082485]"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
          <div className="text-center">
            <Link
              href="/auth/forgot-password"
              className="text-base font-medium text-[#555] hover:text-[#0a44b8]"
            >
              Forgot Password?
            </Link>
          </div>
        </form>

        <div className="mt-6 flex items-center gap-3 text-gray-500">
          <span className="h-px flex-1 bg-gray-300" />
          <span className="text-base font-medium">OR</span>
          <span className="h-px flex-1 bg-gray-300" />
        </div>

        <button className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-[1.75rem] border border-gray-300 bg-white text-base font-semibold text-[#1A1A1A] transition hover:bg-gray-50">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>
        <div className="mt-8 text-center">
          <p className="text-lg text-[#444]">
            Don&apos;t have an account?
            <Link href="/create-account" className="ml-2 font-bold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
