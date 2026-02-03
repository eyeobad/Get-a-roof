"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

const propertyLabelMap: Record<string, string> = {
  NonOwnerOccupied: "Non-owner-occupied",
  SharedApartment: "Shared apartment",
  Shortlet: "Shortlet",
  SelfCompound: "Self compound",
  SharedCompound: "Shared compound",
};

export default function TenantReview() {
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  type TenantPreferences = {
    lookingFor?: string[];
    petFriendlyRequired?: boolean;
    employmentStatus?: string;
    annualEarnings?: number;
    maritalStatus?: string;
    vehicles?: string;
    hasPets?: boolean;
    smokingHabits?: string;
    drinkingHabits?: string;
    religionPreference?: string;
    educationLevel?: string;
    socialHabits?: string;
    hasChildren?: boolean;
    gender?: string;
  };

  type UserProfile = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    preferences?: { tenant?: TenantPreferences };
  };

  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchUserProfile()
      .then((user) => {
        if (mounted) setProfile(user);
      })
      .catch(() => {
        if (mounted) setProfile(null);
      });
    return () => {
      mounted = false;
    };
  }, [fetchUserProfile]);

  const preferenceTags = useMemo(() => {
    const lookingFor: string[] = profile?.preferences?.tenant?.lookingFor ?? [];
    const tags = lookingFor.map((type) => propertyLabelMap[type] || type);
    if (profile?.preferences?.tenant?.petFriendlyRequired) {
      tags.push("Pets allowed");
    }
    return tags.length ? tags : ["No preferences set"];
  }, [profile]);

  const personal = useMemo(() => {
    const tenant = profile?.preferences?.tenant ?? {};
    const currency = (value?: number) =>
      value !== undefined && value !== null
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(value)
        : "Not set";

    const pets = tenant.hasPets === undefined ? "Not set" : tenant.hasPets ? "Yes" : "No";
    const children =
      tenant.hasChildren === undefined ? "Not set" : tenant.hasChildren ? "Yes" : "No";

    return [
      ["Gender", tenant.gender ?? "Not set"],
      ["Employment", tenant.employmentStatus ?? "Not set"],
      ["Annual Earnings", currency(tenant.annualEarnings)],
      ["Marital Status", tenant.maritalStatus ?? "Not set"],
      ["Vehicle", tenant.vehicles ?? "Not set"],
      ["Pets", pets],
      ["Smoking", tenant.smokingHabits ?? "Not set"],
      ["Drinking", tenant.drinkingHabits ?? "Not set"],
      ["Religion", tenant.religionPreference ?? "Not set"],
      ["Education", tenant.educationLevel ?? "Not set"],
      ["Social Habits", tenant.socialHabits ?? "Not set"],
      ["Children", children],
    ];
  }, [profile]);

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100 font-display antialiased transition-colors duration-200">
      <main className="max-w-md mx-auto min-h-screen relative pb-36">
        <header className="pt-8 pb-4 px-6">
          <div aria-label="Progress" className="mb-6" role="region">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-primary dark:text-blue-400 tracking-wide">
                Step 3 of 3
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Review</span>
            </div>
              <div aria-label="Progress" className="mb-6" role="region">
            <div
              aria-label="Onboarding progress"
              aria-valuemax={5}
              aria-valuemin={1}
              aria-valuenow={2}
              className="w-full bg-slate-200 rounded-full h-2 overflow-hidden"
              role="progressbar"
            >
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: "100%" }}
              />
            </div>
          </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900  mb-2 tracking-tight">
            Review Your Profile
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Please double-check your details below. You can edit any section before finalizing.
          </p>
        </header>

        <div className="px-6 space-y-6">
          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-200 shadow-lg">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-primary text-xl">person</span>
                <h2 className="text-xl font-bold text-slate-800 ">Account Details</h2>
              </div>
              <button className="touch-target text-primary hover:text-blue-700 dark:text-blue-400 font-bold text-sm px-3 py-1 rounded-lg hover:bg-blue-50  transition-colors flex items-center" type="button">
                Edit
              </button>
            </div>
            <div className="space-y-4">
              {[
                [
                  "Full Name",
                  `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
                    "Not set",
                ],
                ["Email Address", profile?.email ?? "Not set"],
                ["Phone Number", profile?.phoneNumber ?? "Not set"],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-slate-50  pb-3 last:border-0">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-1">{label}</p>
                  <p className="text-lg font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-200 shadow-lg">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-primary text-xl">apartment</span>
                <h2 className="text-xl font-bold text-slate-800 ">Apartment Preferences</h2>
              </div>
              <button className="touch-target text-primary hover:text-blue-700 dark:text-blue-400 font-bold text-sm px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors flex items-center" type="button">
                Edit
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferenceTags.map((tag) => (
                <span key={tag} className="inline-flex items-center px-4 py-2 rounded-xl text-base font-medium bg-blue-50  text-primary ">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-200 shadow-lg">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-primary text-xl">tune</span>
                <h2 className="text-xl font-bold text-slate-800 ">About You</h2>
              </div>
              <button className="touch-target text-primary hover:text-blue-700 dark:text-blue-400 font-bold text-sm px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors flex items-center" type="button">
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-y-4">
              {personal.map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-200 shadow-sm p-4 rounded-sm">
                  <dt className="text-slate-500 font-medium">{label}</dt>
                  <dd className="text-slate-900 font-semibold text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="text-center text-sm text-slate-400 mt-4 px-4">
            By clicking &quot;Create Profile&quot;, you agree to our{" "}
            <a className="text-primary underline" href="#">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="text-primary underline" href="#">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-slate-200  z-10 flex justify-center">
          <div className="max-w-md w-full">
           <Link href={'/explore'}
              className=" w-full bg-primary hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-full shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
              type="button"
            >
             Create Profile
              <span className="material-icons-round text-2xl">check_circle</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
