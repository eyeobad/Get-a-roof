"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const options = [
  {
    value: "NonOwnerOccupied",
    label: "Non-owner occupied",
    icon: "apartment",
    accent: "text-primary",
  },
  { value: "SharedApartment", label: "Shared apartment", icon: "groups", accent: "text-primary" },
  { value: "Shortlet", label: "Shortlet", icon: "luggage", accent: "text-orange-600" },
  { value: "SelfCompound", label: "Self compound", icon: "fence", accent: "text-green-600" },
  {
    value: "SharedCompound",
    label: "Shared compound",
    icon: "holiday_village",
    accent: "text-purple-600",
    wide: true,
  },
];

function TenantOnboardingContent() {
  const [selectedValues, setSelectedValues] = useState<string[]>(["SharedApartment"]);
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const authToken = useAppStore((state) => state.authToken);
  const userId = useAppStore((state) => state.userId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") ?? "";

  useEffect(() => {
    if (!authToken || !userId) return;
    let mounted = true;
    fetchUserProfile()
      .then((user) => {
        if (!mounted) return;
        const lookingFor = (
          user?.preferences as { tenant?: { lookingFor?: string[] } } | undefined
        )?.tenant?.lookingFor;
        if (Array.isArray(lookingFor)) {
          const allowedValues = new Set(options.map((option) => option.value));
          const nextSelections = lookingFor.filter((item) => allowedValues.has(item));
          if (nextSelections.length) {
            setSelectedValues(nextSelections);
          } else {
            setSelectedValues([]);
          }
        }
      })
      .catch(() => {
        // Ignore prefill errors and keep defaults.
      });

    return () => {
      mounted = false;
    };
  }, [authToken, userId, fetchUserProfile]);

  const toggleSelection = (value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]
    );
  };

  const handleNext = async () => {
    const lookingFor = selectedValues;
    await updatePreferences({ tenant: { lookingFor } });
    if (returnTo === "review") {
      router.push("/tenant-onboarding/review");
      return;
    }
    router.push("/tenant-onboarding/more-about-you");
  };

  return (
    <div className="min-h-screen bg-background-light text-text-main-light dark:bg-background-dark dark:text-text-main-dark font-display antialiased">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-4">
        <div
          role="progressbar"
          aria-label="Onboarding Progress"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={1}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
            <span>Step 1 of 3</span>
            <span className="text-primary dark:text-blue-400">33% Complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background-light dark:bg-surface-dark">
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
                style={{ width: "33%" }}
              /></div>
            </div>
        </div>

        <div className="flex items-center gap-2 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2 rounded-full text-text-main-light transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-text-main-dark dark:hover:bg-gray-800 dark:focus:ring-offset-background-dark"
          >
            <span className="material-icons-round text-3xl">arrow_back</span>
          </button>
        </div>

        <main className="flex flex-col gap-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold leading-tight text-text-main-light dark:text-text-main-dark mb-3">
              What are you looking for?
            </h1>
            <p className="text-lg leading-relaxed text-text-sub-light dark:text-text-sub-dark">
              Select one or more living arrangements that suit your needs best. You can adjust this
              later in profile settings.
            </p>
          </div>

          <div role="group" className="grid grid-cols-2 gap-4 mb-8">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => toggleSelection(option.value)}
                  className={`
                    relative group flex rounded-2xl border-2 transition-all duration-200 outline-none
                    ${option.wide ? "col-span-2 flex-row justify-start gap-4 px-6 py-6" : "flex-col gap-3 px-6 py-6 h-40"}
                    ${isSelected
                      ? "border-primary bg-blue-50/50 dark:bg-blue-900/20 shadow-soft ring-1 ring-primary"
                      : "border-gray-200 bg-surface-light dark:border-gray-700 dark:bg-surface-dark hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(10,68,184,0.1)]"}
                  `}
                >
                  {isSelected && (
                    <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                      <span className="material-icons-round text-sm">check</span>
                    </div>
                  )}
                  <div
                    className={`flex h-12 w-12 ${option.wide ? "mr-4 " : "mx-auto"} items-center justify-center rounded-full bg-blue-50 text-3xl ${option.accent} transition-transform duration-200 group-hover:scale-110`}
                  >
                    <span className="material-icons-round "
                    >{option.icon}</span>
                  </div>
                  <span className={`text-lg font-semibold ${option.wide ? "mt-3 ms-2" : ""}  leading-tight text-text-main-light dark:text-text-main-dark`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        <div className="mt-4 pt-4 pb-2">
          <button
            type="button"
            onClick={handleNext}
            className="block text-center w-full bg-primary hover:bg-primary-hover text-white text-xl font-bold py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-[0.98] focus:outline-none"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantOnboarding() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-light" />}>
      <TenantOnboardingContent />
    </Suspense>
  );
}
