"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getApiErrorMessage, hasShownErrorToast, showToast } from "@/lib/alerts";
import { getGoogleIdToken, getRedirectResultToken } from "@/lib/firebase";

export default function TenantSignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    verifyPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registerTenant = useAppStore((state) => state.registerTenant);
  const googleLogin = useAppStore((state) => state.googleLogin);
  const captureUserLocation = useAppStore((state) => state.captureUserLocation);
  const sendEmailOtp = useAppStore((state) => state.sendEmailOtp);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

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

    try {
      clearAuth();
      setIsSubmitting(true);

      let recaptchaToken = "";
      if (siteKey) {
        const w = window as typeof window & {
          grecaptcha?: {
            ready: (cb: () => void) => void;
            execute: (key: string, opts: { action: string }) => Promise<string>;
          };
        };
        if (w.grecaptcha) {
          recaptchaToken = await new Promise<string>((resolve, reject) => {
            w.grecaptcha?.ready(() => {
              w.grecaptcha
                ?.execute(siteKey, { action: "tenant_signup" })
                .then(resolve)
                .catch(() => reject(new Error("reCAPTCHA failed")));
            });
          }).catch(() => "");
        }
      }

      const result = await registerTenant({
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

  const completeGoogleSignup = useCallback(async (firebaseIdToken: string) => {
    const result = await googleLogin(firebaseIdToken, "Tenant");
    if (!result?.user) {
      showToast({ title: "Google sign-up failed.", variant: "error" });
      return;
    }
    captureUserLocation().catch(() => { });
    const tenantPreferences = (
      result.user.preferences as { tenant?: { lookingFor?: string[] } } | undefined
    )?.tenant;
    const needsTenantOnboarding =
      !tenantPreferences ||
      !tenantPreferences.lookingFor ||
      tenantPreferences.lookingFor.length === 0;
    router.push(needsTenantOnboarding ? "/tenant-onboarding" : "/explore");
  }, [googleLogin, captureUserLocation, router]);

  // Handle mobile Google redirect result on page load
  useEffect(() => {
    let mounted = true;
    getRedirectResultToken().then(async (token) => {
      if (!token || !mounted) return;
      setIsSubmitting(true);
      try {
        await completeGoogleSignup(token);
      } catch (err) {
        if (!hasShownErrorToast(err)) {
          showToast({ title: getApiErrorMessage(err), variant: "error" });
        }
      } finally {
        if (mounted) setIsSubmitting(false);
      }
    });
    return () => { mounted = false; };
  }, [completeGoogleSignup]);

  const handleGoogleSignup = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const firebaseIdToken = await getGoogleIdToken();
      if (!firebaseIdToken) return; // mobile redirect
      await completeGoogleSignup(firebaseIdToken);
    } catch (err) {
      if (!hasShownErrorToast(err)) {
        showToast({ title: getApiErrorMessage(err), variant: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-[#1A1A1A] font-display antialiased">
      {siteKey ? (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="afterInteractive"
        />
      ) : null}
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className=" rounded-full 10 flex items-center justify-center">
            <Image
              src="/logo2.svg"
              alt="Get a Roof Logo"
              width={204}
              height={204}
              className="object-contain"
            />
          </div>
          <h1 className="text-[#0a44b8] text-3xl font-bold leading-tight tracking-tight">
            Let&apos;s find your
            <br />
            new home.
          </h1>
          <p className="text-lg font-medium text-[#4d4d4d]">
            Create your tenant account
          </p>
        </div>
        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
          {[
            { id: "firstName", label: "First Name", placeholder: "Enter your first name", type: "text" },
            { id: "lastName", label: "Last Name", placeholder: "Enter your last name", type: "text" },
            { id: "email", label: "Email Address", placeholder: "name@example.com", type: "email" },
          ].map((field) => (
            <div key={field.id} className="flex flex-col gap-2">
              <label className="text-lg font-medium text-[#1A1A1A]" htmlFor={field.id}>
                {field.label}
              </label>
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={
                  field.id === "firstName"
                    ? "given-name"
                    : field.id === "lastName"
                      ? "family-name"
                      : "email"
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
                className="form-input w-full h-14 rounded-[1.25rem] border border-gray-300 bg-white px-5 text-lg text-[#1A1A1A] transition focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]/20"
              />
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium text-[#1A1A1A]" htmlFor="phone">
              Phone Number
            </label>
            <div className="relative">
              <input
                id="phone"
                name="phoneNumber"
                type="tel"
                placeholder="(555) 000-0000"
                autoComplete="tel"
                value={form.phoneNumber}
                onChange={(event) => updateField("phoneNumber", event.target.value)}
                onInput={(event) =>
                  updateField("phoneNumber", (event.target as HTMLInputElement).value)
                }
                className="form-input w-full h-14 rounded-[1.25rem] border border-gray-300 bg-white px-5 text-lg text-[#1A1A1A] transition focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]/20"
              />
              <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center">
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.06-.2 11.36 11.36 0 003.56.57 1 1 0 011 1v3.5a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.2 1.06l-2.25 2.23z"
                    fill="#757575"
                  />
                </svg>
              </div>
            </div>
          </div>
          {[
            { id: "password", label: "Password", placeholder: "Create a password" },
            { id: "verifyPassword", label: "Verify Password", placeholder: "Confirm your password" },
          ].map((field) => {
            const isVerify = field.id === "verifyPassword";
            const visible = isVerify ? showVerifyPassword : showPassword;
            const toggle = isVerify
              ? () => setShowVerifyPassword((prev) => !prev)
              : () => setShowPassword((prev) => !prev);

            return (
              <div key={field.id} className="flex flex-col gap-2">
                <label className="text-lg font-medium text-[#1A1A1A]" htmlFor={field.id}>
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    id={field.id}
                    name={field.id}
                    type={visible ? "text" : "password"}
                    placeholder={field.placeholder}
                    autoComplete={isVerify ? "new-password" : "new-password"}
                    value={
                      field.id === "password" ? form.password : form.verifyPassword
                    }
                    onChange={(event) =>
                      updateField(
                        field.id === "password" ? "password" : "verifyPassword",
                        event.target.value
                      )
                    }
                    onInput={(event) =>
                      updateField(
                        field.id === "password" ? "password" : "verifyPassword",
                        (event.target as HTMLInputElement).value
                      )
                    }
                    className="form-input w-full h-14 rounded-[1.25rem] border border-gray-300 bg-white px-5 text-lg text-[#1A1A1A] transition focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]/20"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 mr-5 flex items-center text-[#0a44b8]"
                    onClick={toggle}
                    aria-label="Toggle password visibility"
                  >
                    {visible ? (
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
                {field.id === "password" && (
                  <p className="text-sm text-gray-500">Must be at least 8 characters</p>
                )}
              </div>
            );
          })}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-14 items-center justify-center gap-2 rounded-[2rem] bg-[#0a44b8] text-lg font-bold text-white shadow-lg transition hover:bg-[#082485] active:scale-[0.98]"
          >
            {isSubmitting ? "Signing up..." : "Sign Up"}
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"
                fill="white"
              />
            </svg>
          </button>
        </form>
        <div className="my-6 flex items-center gap-3 text-gray-500">
          <span className="h-px flex-1 bg-gray-300" />
          <span className="text-base font-medium">Or continue with</span>
          <span className="h-px flex-1 bg-gray-300" />
        </div>
        <button
          type="button"
          onClick={handleGoogleSignup}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-[2rem] border border-gray-300 bg-white text-lg font-semibold text-[#1A1A1A] shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
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
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign up with Google
        </button>
        <p className="mt-8 text-center text-lg text-gray-600">
          Already a member?
          <Link href="/login" className="ml-1 font-bold text-[#0a44b8] hover:underline">
            Log In
          </Link>
        </p>
      </main>
    </div>
  );
}
