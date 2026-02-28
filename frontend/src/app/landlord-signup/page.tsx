"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getApiErrorMessage, hasShownErrorToast, showToast } from "@/lib/alerts";
import { useAppStore } from "@/store/useAppStore";

const inputClassName =
  "h-14 w-full rounded-2xl border border-[#dbe4f5] bg-white px-4 text-base text-[#0c141d] outline-none transition focus:border-[#0a44b8] focus:ring-4 focus:ring-[#0a44b8]/15";

export default function LandlordSignupPage() {
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
  const sendEmailOtp = useAppStore((state) => state.sendEmailOtp);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const router = useRouter();

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      verifyPassword: String(formData.get("verifyPassword") ?? form.verifyPassword),
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

    try {
      clearAuth();
      setIsSubmitting(true);
      const result = await registerLandlord({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        password: payload.password,
      });
      const isPending =
        (result as { status?: string })?.status === "PENDING_VERIFICATION";
      const userId = isPending
        ? String((result as { userId?: string }).userId ?? "")
        : ((result as { id?: string; _id?: string })?.id ||
          (result as { id?: string; _id?: string })?._id);
      const verificationToken = isPending
        ? String((result as { verificationToken?: string }).verificationToken ?? "")
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
        next: "/verify-identity",
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
        const friendly = message.toLowerCase().includes("already in use")
          ? "Account already exists. Log in instead."
          : message;
        showToast({ title: "Sign up failed", text: friendly, variant: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0c141d] font-display antialiased">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        <header className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo2.svg"
            alt="Get a Roof Logo"
            width={172}
            height={172}
            className="h-28 w-28 object-contain"
          />
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0a44b8]">
            Create Landlord Account
          </h1>
          <p className="mt-2 text-sm text-[#5b6780]">
            Step 1 of 2: account details. Step 2: verify email before listing.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-[#e3eaf7] bg-white p-5 shadow-[0_20px_40px_-28px_rgba(12,20,29,0.35)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-sm font-semibold text-[#2b3957]">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                onInput={(event) =>
                  updateField("firstName", (event.target as HTMLInputElement).value)
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-sm font-semibold text-[#2b3957]">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                onInput={(event) =>
                  updateField("lastName", (event.target as HTMLInputElement).value)
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-[#2b3957]">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              onInput={(event) =>
                updateField("email", (event.target as HTMLInputElement).value)
              }
              className={inputClassName}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phoneNumber" className="text-sm font-semibold text-[#2b3957]">
              Phone Number <span className="font-normal text-[#8b96ad]">(optional)</span>
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
              placeholder="+234..."
              value={form.phoneNumber}
              onChange={(event) => updateField("phoneNumber", event.target.value)}
              onInput={(event) =>
                updateField("phoneNumber", (event.target as HTMLInputElement).value)
              }
              className={inputClassName}
            />
            <p className="text-xs text-[#7b88a3]">
              Used for property communication and urgent verification.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-[#2b3957]">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                onInput={(event) =>
                  updateField("password", (event.target as HTMLInputElement).value)
                }
                className={`${inputClassName} pr-12`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 text-[#0a44b8]"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
              >
                <span className="material-symbols-outlined text-[22px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <p className="text-xs text-[#7b88a3]">At least 8 characters.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="verifyPassword" className="text-sm font-semibold text-[#2b3957]">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="verifyPassword"
                name="verifyPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={form.verifyPassword}
                onChange={(event) => updateField("verifyPassword", event.target.value)}
                onInput={(event) =>
                  updateField("verifyPassword", (event.target as HTMLInputElement).value)
                }
                className={`${inputClassName} pr-12`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 text-[#0a44b8]"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label="Toggle confirm password visibility"
              >
                <span className="material-symbols-outlined text-[22px]">
                  {showConfirm ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-[#0a44b8] text-base font-bold text-white shadow-lg shadow-[#0a44b8]/25 transition hover:bg-[#083796] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <div className="flex items-center gap-3 py-1 text-[#8b96ad]">
            <span className="h-px flex-1 bg-[#dbe4f5]" />
            <span className="text-xs font-semibold uppercase tracking-wide">or continue with</span>
            <span className="h-px flex-1 bg-[#dbe4f5]" />
          </div>

          <button
            type="button"
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full border border-[#dbe4f5] bg-white text-base font-semibold text-[#243353] transition hover:bg-[#f7faff]"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#5b6780]">
          Already have an account?
          <Link href="/login" className="ml-1 font-bold text-[#0a44b8] hover:underline">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
