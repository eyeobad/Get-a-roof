"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { showToast } from "@/lib/alerts";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAppStore((state) => state.login);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      const rawRole = result?.user?.role;
      const roles = Array.isArray(rawRole) ? rawRole : rawRole ? [rawRole] : [];
      const isAdmin = roles.some(
        (value) => value?.toString().toLowerCase() === "admin"
      );
      if (!isAdmin) {
        clearAuth();
        showToast({
          title: "This account is not allowed to access admin.",
          variant: "error",
        });
        return;
      }
      router.replace("/admin");
    } catch {
      showToast({ title: "Invalid credentials.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Image src="/logo2.svg" alt="Get a Roof" width={74} height={74} />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Get a Roof
          </p>
          <h1 className="mt-1 text-3xl font-bold">Admin Login</h1>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin email"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Authorized administrators only.
        </p>
      </div>
    </div>
  );
}
