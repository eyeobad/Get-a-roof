"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

type SectionKey =
  | "gender"
  | "employment"
  | "marital"
  | "vehicles"
  | "pets"
  | "smoking"
  | "drinking"
  | "religion"
  | "education"
  | "social"
  | "children";

type SectionConfig = {
  key: SectionKey;
  title: string;
  icon: string;
  buttonLabels: readonly string[];
  primaryIndex: number;
  note?: string;
  fullWidth?: boolean;
};

const sections: readonly SectionConfig[] = [
  {
    key: "gender",
    title: "Gender",
    icon: "wc",
    buttonLabels: ["Male", "Female", "Prefer not to say"],
    primaryIndex: 2,
    fullWidth: true,
  },
  {
    key: "employment",
    title: "Employment Status",
    icon: "work",
    buttonLabels: ["Employed", "Self-Employed", "Student", "Unemployed"],
    primaryIndex: 0,
  },
  {
    key: "marital",
    title: "Marital Status",
    icon: "favorite",
    buttonLabels: ["Single", "Married", "Divorced", "Widowed"],
    primaryIndex: 1,
  },
  {
    key: "vehicles",
    title: "Vehicles",
    icon: "directions_car",
    buttonLabels: ["Yes", "No", "Any"],
    primaryIndex: 0,
  },
  {
    key: "pets",
    title: "Pets",
    icon: "pets",
    buttonLabels: ["I have pets", "I don't have pets"],
    primaryIndex: 1,
    fullWidth: true,
  },
  {
    key: "smoking",
    title: "Smoking Habits",
    icon: "smoking_rooms",
    buttonLabels: ["Yes", "No", "Occasionally", "Socially"],
    primaryIndex: 1,
  },
  {
    key: "drinking",
    title: "Drinking Habits",
    icon: "local_bar",
    buttonLabels: ["Yes", "No", "Occasionally", "Socially"],
    primaryIndex: 2,
  },
  {
    key: "religion",
    title: "Religion Preference",
    icon: "church",
    buttonLabels: ["No Preference", "Muslim", "Christian", "Other"],
    primaryIndex: 1,
  },
  {
    key: "education",
    title: "Education Level",
    icon: "school",
    buttonLabels: ["High School", "Bachelors", "Masters", "PHD"],
    primaryIndex: 1,
    note: "Minimum preferred education level:",
  },
  {
    key: "social",
    title: "Social Habits",
    icon: "celebration",
    buttonLabels: ["Rarely", "Occasionally", "Often"],
    primaryIndex: 1,
    note: "How often do they go out?",
  },
  {
    key: "children",
    title: "Children",
    icon: "family_restroom",
    buttonLabels: ["I have children", "I don't have children", "Prefer not to say"],
    primaryIndex: 1,
    fullWidth: true,
  },
];

type Selections = Record<SectionKey, number>;
type SectionWithSelection = SectionConfig & { selectedIndex: number };

function TenantMoreAboutYouContent() {
  const [earnings, setEarnings] = useState(85000);
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const authToken = useAppStore((state) => state.authToken);
  const userId = useAppStore((state) => state.userId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") ?? "";
  const [hydrated, setHydrated] = useState(false);

  const [selections, setSelections] = useState<Selections>(() => {
    const initial = {} as Selections;
    for (const s of sections) initial[s.key] = s.primaryIndex ?? 0;
    return initial;
  });

  useEffect(() => {
    if (!authToken || !userId) return;
    if (hydrated) return;
    let mounted = true;

    const findLabelIndex = (key: SectionKey, rawValue?: string) => {
      if (!rawValue) return undefined;
      const section = sections.find((item) => item.key === key);
      if (!section) return undefined;
      const index = section.buttonLabels.findIndex(
        (label) => label.toLowerCase() === rawValue.toLowerCase()
      );
      return index >= 0 ? index : undefined;
    };

    fetchUserProfile()
      .then((user) => {
        if (!mounted) return;
        const tenant = (user?.preferences as { tenant?: Record<string, unknown> } | undefined)
          ?.tenant;
        if (!tenant) {
          setHydrated(true);
          return;
        }
        setSelections((prev) => {
          const nextSelections = { ...prev };
          const setIfNumber = (key: SectionKey, index?: number) => {
            if (typeof index === "number") {
              nextSelections[key] = index;
            }
          };

          setIfNumber("gender", findLabelIndex("gender", String(tenant.gender ?? "")));
          setIfNumber(
            "employment",
            findLabelIndex("employment", String(tenant.employmentStatus ?? ""))
          );
          setIfNumber("marital", findLabelIndex("marital", String(tenant.maritalStatus ?? "")));
          setIfNumber("vehicles", findLabelIndex("vehicles", String(tenant.vehicles ?? "")));
          setIfNumber("smoking", findLabelIndex("smoking", String(tenant.smokingHabits ?? "")));
          setIfNumber(
            "drinking",
            findLabelIndex("drinking", String(tenant.drinkingHabits ?? ""))
          );
          setIfNumber(
            "religion",
            findLabelIndex("religion", String(tenant.religionPreference ?? ""))
          );
          setIfNumber(
            "education",
            findLabelIndex("education", String(tenant.educationLevel ?? ""))
          );
          setIfNumber("social", findLabelIndex("social", String(tenant.socialHabits ?? "")));

          if (typeof tenant.hasPets === "boolean") {
            setIfNumber("pets", tenant.hasPets ? 0 : 1);
          }
          if (typeof tenant.hasChildren === "boolean") {
            setIfNumber("children", tenant.hasChildren ? 0 : 1);
          }

          return nextSelections;
        });

        const annualEarnings = tenant.annualEarnings;
        if (typeof annualEarnings === "number" && Number.isFinite(annualEarnings)) {
          setEarnings(annualEarnings);
        }

        setHydrated(true);
      })
      .catch(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, [authToken, userId, fetchUserProfile, hydrated, returnTo, router]);

  const handleSelect = (key: SectionKey, index: number) => {
    setSelections((prev) => ({ ...prev, [key]: index }));
  };

  const sectionData = useMemo<SectionWithSelection[]>(() => {
    return sections.map((section) => ({
      ...section,
      selectedIndex: selections[section.key],
    }));
  }, [selections]);

  const handleNext = async () => {
    const pickLabel = (key: SectionKey) =>
      sections.find((section) => section.key === key)?.buttonLabels[
        selections[key]
      ];

    const petsLabel = pickLabel("pets");
    const childrenLabel = pickLabel("children");
    const genderLabel = pickLabel("gender");

    const payload: Record<string, unknown> = {
      gender: genderLabel,
      employmentStatus: pickLabel("employment"),
      maritalStatus: pickLabel("marital"),
      vehicles: pickLabel("vehicles"),
      hasPets: petsLabel ? petsLabel === "I have pets" : undefined,
      smokingHabits: pickLabel("smoking"),
      drinkingHabits: pickLabel("drinking"),
      religionPreference: pickLabel("religion"),
      educationLevel: pickLabel("education"),
      socialHabits: pickLabel("social"),
      annualEarnings: earnings,
    };

    if (childrenLabel === "I have children") {
      payload.hasChildren = true;
    } else if (childrenLabel === "I don't have children") {
      payload.hasChildren = false;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    await updatePreferences({ tenant: payload });
    if (returnTo === "review") {
      router.push("/tenant-onboarding/review");
      return;
    }
    router.push("/tenant-onboarding/review");
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 font-display antialiased">
      <main className="max-w-md mx-auto min-h-screen relative pb-32">
        <header className="pt-8 pb-4 px-6">
          <div aria-label="Progress" className="mb-6" role="region">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-primary tracking-wide">
                Step 2 of 3
              </span>
              <span className="text-xs font-semibold text-slate-400">67%</span>
            </div>

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
                style={{ width: "67%" }}
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2 tracking-tight">More About You</h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            Help us find the best match for your property needs.
          </p>
        </header>

        <form className="px-6 space-y-8">
          {sectionData.map((section) => (
            <section key={section.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons-round text-primary text-2xl">
                  {section.icon}
                </span>
                <h2 className="text-xl font-bold text-slate-800">{section.title}</h2>
              </div>

              {section.note ? (
                <p className="text-slate-500 text-sm mb-3 ml-8">{section.note}</p>
              ) : null}

              <div className={`flex ${section.fullWidth ? "flex-col" : "flex-wrap"} gap-3`}>
                {section.buttonLabels.map((label, index) => {
                  const isSelected = section.selectedIndex === index;
                  const base = section.fullWidth ? "w-full text-left pl-6" : "px-6";

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleSelect(section.key, index)}
                      className={`${base} py-3 text-base font-medium rounded-full border-2 transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-50 border-primary text-primary font-bold shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-primary"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons-round text-primary text-2xl">paid</span>
              <h2 className="text-xl font-bold text-slate-700">Annual Earnings</h2>
            </div>

            <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <label className="text-lg font-medium text-slate-600" htmlFor="earnings">
                  Yearly Income
                </label>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  ₦{new Intl.NumberFormat("en-NG").format(earnings)}
                </span>
              </div>

              <input
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                id="earnings"
                max={50000000}
                min={1000000}
                step={100000}
                type="range"
                value={earnings}
                onChange={(event) => setEarnings(Number(event.target.value))}
              />

              <div className="flex justify-between mt-3 text-sm font-medium text-slate-500">
                <span>₦1m</span>
                <span>₦50m+</span>
              </div>
            </div>
          </section>
        </form>

        <div className="fixed bottom-0 left-0 w-full p-4 bg-background-light/90 backdrop-blur-md border-t border-slate-200 z-10 flex justify-center">
          <div className="max-w-md w-full">
            <button
              type="button"
              onClick={handleNext}
              className="w-full bg-primary hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-full shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              Next Step
              <span className="material-icons-round text-xl">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TenantMoreAboutYou() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-light" />}>
      <TenantMoreAboutYouContent />
    </Suspense>
  );
}
