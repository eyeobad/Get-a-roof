"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getApiErrorMessage, hasShownErrorToast, showToast } from "@/lib/alerts";
import { getGoogleIdToken } from "@/lib/firebase";
import { markTutorialFlow } from "@/lib/tutorialFlow";

export default function OrgSignupPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showVerifyPassword, setShowVerifyPassword] = useState(false);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        password: "",
        verifyPassword: "",
        orgName: "",
        registrationNumber: "",
        website: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const registerOrganisation = useAppStore((s) => s.registerOrganisation);
    const googleLogin = useAppStore((s) => s.googleLogin);
    const captureUserLocation = useAppStore((s) => s.captureUserLocation);
    const clearAuth = useAppStore((s) => s.clearAuth);
    const router = useRouter();
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

    const updateField = (key: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        if (
            !form.email ||
            !form.password ||
            !form.firstName ||
            !form.lastName ||
            !form.orgName
        ) {
            showToast({ title: "Please complete all required fields.", variant: "error" });
            return;
        }
        if (form.password.length < 8) {
            showToast({ title: "Password must be at least 8 characters.", variant: "error" });
            return;
        }
        if (form.password !== form.verifyPassword) {
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
                                ?.execute(siteKey, { action: "org_signup" })
                                .then(resolve)
                                .catch(() => reject(new Error("reCAPTCHA failed")));
                        });
                    }).catch(() => "");
                }
            }

            const result = await registerOrganisation({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                phoneNumber: form.phoneNumber.trim(),
                password: form.password,
                orgName: form.orgName.trim(),
                registrationNumber: form.registrationNumber.trim() || undefined,
                website: form.website.trim() || undefined,
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

            const query = new URLSearchParams({
                userId,
                email: form.email.trim(),
                ...(verificationToken ? { verificationToken } : {}),
            });

            showToast({
                title: "Continue verification",
                text: "Enter the verification code on the next step.",
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
                showToast({ title: "Sign up failed", text: friendly, variant: "error" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignup = async () => {
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);
            const firebaseIdToken = await getGoogleIdToken();
            const result = await googleLogin(firebaseIdToken, "Organisation");
            if (!result?.user) {
                showToast({ title: "Google sign-up failed.", variant: "error" });
                return;
            }
            captureUserLocation().catch(() => { });
            markTutorialFlow("landlord");
            router.push("/landlord-dashboard");
        } catch (err) {
            if (!hasShownErrorToast(err)) {
                showToast({ title: getApiErrorMessage(err), variant: "error" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const textField = (
        id: keyof typeof form,
        label: string,
        placeholder: string,
        type = "text",
        autoComplete = "off"
    ) => (
        <div className="flex flex-col gap-2" key={id}>
            <label className="text-lg font-medium text-[#1A1A1A]" htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                name={id}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                value={form[id]}
                onChange={(e) => updateField(id, e.target.value)}
                className="form-input w-full h-14 rounded-[1.25rem] border border-gray-300 bg-white px-5 text-lg text-[#1A1A1A] transition focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]/20"
            />
        </div>
    );

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
                    <div className="rounded-full flex items-center justify-center">
                        <Image
                            src="/logo2.svg"
                            alt="Get a Roof Logo"
                            width={204}
                            height={204}
                            className="object-contain"
                        />
                    </div>
                    <h1 className="text-[#0a44b8] text-3xl font-bold leading-tight tracking-tight">
                        Register your
                        <br />
                        organisation.
                    </h1>
                    <p className="text-lg font-medium text-[#4d4d4d]">
                        Manage properties as a real estate agency
                    </p>
                </div>

                <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
                    {/* Personal Details */}
                    <div className="border-b border-gray-100 pb-1">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Owner Details
                        </p>
                    </div>
                    {textField("firstName", "First Name", "Enter your first name", "text", "given-name")}
                    {textField("lastName", "Last Name", "Enter your last name", "text", "family-name")}
                    {textField("email", "Email Address", "name@example.com", "email", "email")}
                    {textField("phoneNumber", "Phone Number", "+234 800 000 0000", "tel", "tel")}

                    {/* Org Details */}
                    <div className="border-b border-gray-100 pb-1 mt-4">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Organisation Details
                        </p>
                    </div>
                    {textField("orgName", "Organisation Name", "e.g. Prestige Realtors")}
                    {textField("registrationNumber", "Registration Number (optional)", "e.g. RC-123456")}
                    {textField("website", "Website (optional)", "https://example.com", "url")}

                    {/* Passwords */}
                    {[
                        { id: "password" as const, label: "Password", placeholder: "Create a password" },
                        { id: "verifyPassword" as const, label: "Verify Password", placeholder: "Confirm your password" },
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
                                        autoComplete="new-password"
                                        value={form[field.id]}
                                        onChange={(e) => updateField(field.id, e.target.value)}
                                        className="form-input w-full h-14 rounded-[1.25rem] border border-gray-300 bg-white px-5 text-lg text-[#1A1A1A] transition focus:border-[#0a44b8] focus:ring-2 focus:ring-[#0a44b8]/20"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 mr-5 flex items-center text-[#0a44b8]"
                                        onClick={toggle}
                                        aria-label="Toggle password visibility"
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {visible ? "visibility_off" : "visibility"}
                                        </span>
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
                        {isSubmitting ? "Creating account..." : "Register Organisation"}
                        <span className="material-symbols-outlined">arrow_forward</span>
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
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
