"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getApiErrorMessage, hasShownErrorToast, showToast } from "@/lib/alerts";
import { getGoogleIdToken } from "@/lib/firebase";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24',
};

function SignUpContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    verifyPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registerLandlord = useAppStore((state) => state.registerLandlord);
  const googleLogin = useAppStore((state) => state.googleLogin);
  const captureUserLocation = useAppStore((state) => state.captureUserLocation);
  const sendEmailOtp = useAppStore((state) => state.sendEmailOtp);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  const isAgentSignup = searchParams?.get("isAgent") === "true";
  const redirectParam = searchParams?.get("redirect") ?? "";

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGoogleSignup = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const firebaseIdToken = await getGoogleIdToken();
      const result = await googleLogin(firebaseIdToken, "Landlord");
      if (!result?.user) {
        showToast({ title: "Google sign-up failed.", variant: "error" });
        return;
      }
      captureUserLocation().catch(() => { });
      router.push("/dashboard/overview");
    } catch (err) {
      if (!hasShownErrorToast(err)) {
        showToast({ title: getApiErrorMessage(err), variant: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? form.firstName).trim(),
      lastName: String(formData.get("lastName") ?? form.lastName).trim(),
      email: String(formData.get("email") ?? form.email).trim(),
      phoneNumber: String(formData.get("phoneNumber") ?? form.phoneNumber).trim(),
      password: String(formData.get("password") ?? form.password),
      verifyPassword: String(
        formData.get("verifyPassword") ?? form.verifyPassword
      ),
    };

    if (!payload.email || !payload.password || !payload.firstName || !payload.lastName) {
      showToast({ title: "Please complete all required fields.", variant: "error" });
      return;
    }
    if (payload.password.length < 8) {
      showToast({ title: "Password must be at least 8 characters.", variant: "error" });
      return;
    }
    if (payload.password !== payload.verifyPassword) {
      showToast({ title: "Passwords do not match.", variant: "error" });
      return;
    }
    if (!siteKey) {
      showToast({ title: "Missing reCAPTCHA site key configuration.", variant: "error" });
      return;
    }

    const w = window as typeof window & {
      grecaptcha?: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };

    if (!w.grecaptcha) {
      showToast({ title: "reCAPTCHA is still loading. Please try again.", variant: "error" });
      return;
    }

    const recaptchaToken = await new Promise<string>((resolve, reject) => {
      w.grecaptcha?.ready(() => {
        w.grecaptcha
          ?.execute(siteKey, { action: "landlord_signup" })
          .then(resolve)
          .catch(() => reject(new Error("Unable to verify reCAPTCHA")));
      });
    }).catch(() => "");

    if (!recaptchaToken) {
      showToast({ title: "reCAPTCHA verification failed. Please try again.", variant: "error" });
      return;
    }

    try {
      clearAuth();
      setIsSubmitting(true);
      const result = await registerLandlord({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        password: payload.password,
        recaptchaToken,
      });
      const isPending =
        (result as { status?: string })?.status === "PENDING_VERIFICATION";
      const userId = isPending
        ? String((result as { userId?: string }).userId ?? "")
        : ((result as { id?: string; _id?: string })?.id ||
          (result as { id?: string; _id?: string })?._id);
      const verificationToken = isPending
        ? String(
          (result as { verificationToken?: string }).verificationToken ?? ""
        )
        : "";
      if (!userId) {
        throw new Error("Unable to start verification. Please try again.");
      }
      let otpSent = false;
      if (verificationToken) {
        try {
          await sendEmailOtp(userId, verificationToken);
          otpSent = true;
        } catch {
          // resend is available on verification screen
        }
      }

      const query = new URLSearchParams({
        userId,
        email: payload.email,
        role: "landlord",
        next:
          isAgentSignup && redirectParam
            ? decodeURIComponent(redirectParam)
            : "/verify-identity",
        otpSent: otpSent ? "1" : "0",
        ...(verificationToken ? { verificationToken } : {}),
      });
      showToast({
        title: "Continue verification",
        text: "We sent a verification code to your email.",
        variant: "success",
      });

      router.push(`/auth/email-verification?${query.toString()}`);
    } catch (err) {
      if (!hasShownErrorToast(err)) {
        const message = getApiErrorMessage(err);
        const isConflict = message.toLowerCase().includes("already in use");
        const friendly = isConflict
          ? "Account already exists. Log in instead."
          : message;
        showToast({
          title: "Sign up failed",
          text: friendly,
          variant: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center">
      {siteKey ? (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="afterInteractive"
        />
      ) : null}
      <div className="w-full max-w-md px-6 py-8 flex flex-col min-h-screen font-display">
        {/* Header */}
        <header className="flex flex-col items-center mt-4 mb-8">
          <div className="rounded-full flex items-center justify-center">
            <Image
              src="/logo2.svg"
              alt="Get a Roof Logo"
              width={204}
              height={204}
              className="object-contain"
            />
          </div>
          <h1 className="text-[#0a44b8] text-[32px] font-bold tracking-tight mb-2">
            {isAgentSignup ? "Create Agent Account" : "Create Landlord Account"}
          </h1>
          <p className="text-[#1A1A1A]/80 text-lg">
            {isAgentSignup
              ? "Join your organisation to manage properties."
              : "List and manage your properties with ease."}
          </p>
        </header>

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {[
            { id: "firstName", label: "First Name", placeholder: "Enter your first name", type: "text" },
            { id: "lastName", label: "Last Name", placeholder: "Enter your last name", type: "text" },
            { id: "email", label: "Email Address", placeholder: "name@example.com", type: "email" },
            { id: "phoneNumber", label: "Phone Number", placeholder: "Enter your phone number", type: "tel" },
          ].map((field) => (
            <div key={field.id} className="flex flex-col gap-2">
              <label className="text-[#1A1A1A] text-lg font-medium ml-1">
                {field.label}
              </label>
              <input
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={
                  field.id === "firstName"
                    ? "given-name"
                    : field.id === "lastName"
                      ? "family-name"
                      : field.id === "email"
                        ? "email"
                        : "tel"
                }
                value={form[field.id as keyof typeof form]}
                onChange={(event) =>
                  updateField(field.id as keyof typeof form, event.target.value)
                }
                onInput={(event) =>
                  updateField(
                    field.id as keyof typeof form,
                    (event.target as HTMLInputElement).value
                  )
                }
                className="h-14 px-5 rounded-xl border border-[#d7cee8] bg-white text-[#1A1A1A] text-lg placeholder:text-gray-400 focus:ring-2 focus:ring-[#0a44b8] focus:border-[#0a44b8] outline-none shadow-sm"
              />
            </div>
          ))}

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[#1A1A1A] text-lg font-medium ml-1">
              Password
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                onInput={(event) =>
                  updateField("password", (event.target as HTMLInputElement).value)
                }
                className="h-14 w-full pl-5 pr-14 rounded-xl border border-[#d7cee8] bg-white text-[#1A1A1A] text-lg placeholder:text-gray-400 focus:ring-2 focus:ring-[#0a44b8] focus:border-[#0a44b8] outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 h-full px-4 flex items-center text-gray-500 hover:text-[#0a44b8]"
                aria-label="Toggle password visibility"
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={solidIconStyle}
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[#1A1A1A] text-lg font-medium ml-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                name="verifyPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                autoComplete="new-password"
                value={form.verifyPassword}
                onChange={(event) =>
                  updateField("verifyPassword", event.target.value)
                }
                onInput={(event) =>
                  updateField(
                    "verifyPassword",
                    (event.target as HTMLInputElement).value
                  )
                }
                className="h-14 w-full pl-5 pr-14 rounded-xl border border-[#d7cee8] bg-white text-[#1A1A1A] text-lg placeholder:text-gray-400 focus:ring-2 focus:ring-[#0a44b8] focus:border-[#0a44b8] outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-0 top-0 h-full px-4 flex items-center text-gray-500 hover:text-[#0a44b8]"
                aria-label="Toggle confirm password visibility"
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={solidIconStyle}
                >
                  {showConfirm ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Protected by reCAPTCHA v3.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 h-14 rounded-full bg-[#0a44b8] text-white text-xl font-bold shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-gray-300" />
          <span className="mx-4 text-gray-500">Or</span>
          <div className="flex-grow border-t border-gray-300" />
        </div>

        {/* Google (INLINE SVG kept) */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isSubmitting}
          className="h-14 rounded-full border border-gray-300 bg-white flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 active:scale-[0.98]"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>

          <span className="text-[#1A1A1A] text-lg font-medium">
            Sign up with Google
          </span>
        </button>

        {/* Footer */}
        <div className="mt-auto pt-8 pb-4 text-center">
          <p className="text-[#1A1A1A] text-base">
            Already a member?
            <Link href="/login" className="ml-1 text-[#0a44b8] font-bold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpContent />
    </Suspense>
  );
}
