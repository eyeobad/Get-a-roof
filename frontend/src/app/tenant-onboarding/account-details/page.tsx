"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiErrorMessage, showToast } from "@/lib/alerts";
import { useAppStore } from "@/store/useAppStore";

type AccountForm = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

const initialForm: AccountForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
};

export default function TenantAccountDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const updateUser = useAppStore((state) => state.updateUser);

  const [form, setForm] = useState<AccountForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnPath = useMemo(() => {
    const returnTo = searchParams?.get("returnTo") ?? "review";
    if (returnTo === "review") return "/tenant-onboarding/review";
    return "/tenant-onboarding/review";
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    fetchUserProfile()
      .then((user) => {
        if (!mounted) return;
        setForm({
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
          email: user?.email ?? "",
          phoneNumber: user?.phoneNumber ?? "",
        });
      })
      .catch(() => {
        if (!mounted) return;
        setError("Unable to load your account details.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [fetchUserProfile]);

  const updateField = (key: keyof AccountForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setError(null);

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const phoneNumber = form.phoneNumber.trim();

    if (!firstName || !lastName || !email) {
      setError("First name, last name, and email are required.");
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateUser({
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || undefined,
      });
      if (!updated) {
        throw new Error("Unable to update account details.");
      }
      showToast({ title: "Account details updated", variant: "success" });
      router.push(returnPath);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      showToast({ title: message, variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 font-display antialiased">
      <main className="mx-auto w-full max-w-md px-6 py-8">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => router.push(returnPath)}
            className="mb-4 inline-flex items-center text-primary font-semibold"
          >
            <span className="material-icons-round text-2xl mr-1">arrow_back</span>
            Back
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Account Details</h1>
          <p className="mt-2 text-slate-500">
            Update your basic account information and continue your onboarding.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {[
            { key: "firstName", label: "First Name", type: "text" },
            { key: "lastName", label: "Last Name", type: "text" },
            { key: "email", label: "Email Address", type: "email" },
            { key: "phoneNumber", label: "Phone Number", type: "tel" },
          ].map((field) => (
            <label key={field.key} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">
                {field.label}
              </span>
              <input
                type={field.type}
                value={form[field.key as keyof AccountForm]}
                onChange={(event) =>
                  updateField(field.key as keyof AccountForm, event.target.value)
                }
                disabled={isLoading || isSaving}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              />
            </label>
          ))}

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="mt-4 w-full rounded-full bg-primary py-4 text-lg font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save and Return"}
          </button>
        </form>
      </main>
    </div>
  );
}

