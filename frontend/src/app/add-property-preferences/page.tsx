"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useToastError } from "@/hooks/useToastError";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type Option = { key: string; label: string };

function Chip({
  label,
  selected,
  onClick,
  fullWidth = false,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-5 py-3 text-[14px] font-medium transition-all shadow-sm",
        "border bg-white",
        selected
          ? "border-[#0a44b8] bg-[#EAF1FF] text-[#0a44b8]"
          : "border-black/10 text-[#1A1A1A] hover:border-[#0a44b8]/40 active:bg-black/5",
        fullWidth ? "w-full text-left" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined text-[#0a44b8] text-[22px]"
          style={solidIconStyle}
        >
          {icon}
        </span>
        <h2 className="text-[16px] font-bold text-[#1A1A1A]">{title}</h2>
      </div>
      {subtitle ? (
        <p className="text-[12px] text-[#1A1A1A]/60 leading-snug">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function TenantPreferencesPage() {
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const draft = useAppStore((state) => state.landlordDraft);
  const setLandlordDraft = useAppStore((state) => state.setLandlordDraft);
  const saveLandlordDraft = useAppStore((state) => state.saveLandlordDraft);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useToastError(error);
  const employment: Option[] = useMemo(
    () => [
      { key: "employed", label: "Employed" },
      { key: "self", label: "Self-Employed" },
      { key: "student", label: "Student" },
      { key: "unemployed", label: "Unemployed" },
    ],
    []
  );

  const marital: Option[] = useMemo(
    () => [
      { key: "single", label: "Single" },
      { key: "married", label: "Married" },
      { key: "divorced", label: "Divorced" },
      { key: "widowed", label: "Widowed" },
    ],
    []
  );

  const vehicles: Option[] = useMemo(
    () => [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "any", label: "Any" },
    ],
    []
  );

  const smoking: Option[] = useMemo(
    () => [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "occasionally", label: "Occasionally" },
      { key: "socially", label: "Socially" },
    ],
    []
  );

  const drinking: Option[] = useMemo(
    () => [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "occasionally", label: "Occasionally" },
      { key: "socially", label: "Socially" },
    ],
    []
  );

  const religion: Option[] = useMemo(
    () => [
      { key: "none", label: "No Preference" },
      { key: "muslim", label: "Muslim" },
      { key: "christian", label: "Christian" },
      { key: "other", label: "Other" },
    ],
    []
  );

  const education: Option[] = useMemo(
    () => [
      { key: "hs", label: "High School" },
      { key: "bachelors", label: "Bachelors" },
      { key: "masters", label: "Masters" },
      { key: "phd", label: "PhD" },
    ],
    []
  );

  const social: Option[] = useMemo(
    () => [
      { key: "rarely", label: "Rarely" },
      { key: "occasionally", label: "Occasionally" },
      { key: "often", label: "Often" },
    ],
    []
  );

  const children: Option[] = useMemo(
    () => [
      { key: "have", label: "I have children" },
      { key: "dont", label: "I don't have children" },
      { key: "na", label: "Prefer not to say" },
    ],
    []
  );

  const gender: Option[] = useMemo(
    () => [
      { key: "male", label: "Male" },
      { key: "female", label: "Female" },
      { key: "na", label: "Prefer not to say" },
    ],
    []
  );

  const [employmentValue, setEmploymentValue] = useState("employed");
  const [maritalValue, setMaritalValue] = useState("married");
  const [vehicleValue, setVehicleValue] = useState("yes");
  const [smokingValue, setSmokingValue] = useState("no");
  const [drinkingValue, setDrinkingValue] = useState("occasionally");
  const [religionValue, setReligionValue] = useState("muslim");
  const [educationValue, setEducationValue] = useState("bachelors");
  const [socialValue, setSocialValue] = useState("occasionally");
  const [childrenValue, setChildrenValue] = useState("dont");
  const [genderValue, setGenderValue] = useState("na");

  const resolveOptionKey = (value: unknown, options: Option[], fallback: string) => {
    if (!value) return fallback;
    const normalized = String(value).toLowerCase();
    const match =
      options.find((o) => o.key.toLowerCase() === normalized) ||
      options.find((o) => o.label.toLowerCase() === normalized);
    return match?.key ?? fallback;
  };

  const resolveLabel = (options: Option[], key: string) =>
    options.find((o) => o.key === key)?.label ?? key;

  useEffect(() => {
    if (initialized) return;
    const prefs = draft.landlordRequirements?.idealTenantPreferences;
    setEmploymentValue(resolveOptionKey(prefs?.employmentStatus, employment, "employed"));
    setMaritalValue(resolveOptionKey(prefs?.maritalStatus, marital, "married"));
    setVehicleValue(resolveOptionKey(prefs?.vehicles, vehicles, "yes"));
    setSmokingValue(resolveOptionKey(prefs?.smokingHabits, smoking, "no"));
    setDrinkingValue(resolveOptionKey(prefs?.drinkingHabits, drinking, "occasionally"));
    setReligionValue(resolveOptionKey(prefs?.religionPreference, religion, "muslim"));
    setEducationValue(resolveOptionKey(prefs?.educationLevel, education, "bachelors"));
    setSocialValue(resolveOptionKey(prefs?.socialHabits, social, "occasionally"));
    if (prefs?.hasChildren === true) {
      setChildrenValue("have");
    } else if (prefs?.hasChildren === false) {
      setChildrenValue("dont");
    } else {
      setChildrenValue("na");
    }
    setGenderValue(resolveOptionKey((prefs as { gender?: string })?.gender, gender, "na"));
    setInitialized(true);
  }, [
    draft,
    initialized,
    employment,
    marital,
    vehicles,
    smoking,
    drinking,
    religion,
    education,
    social,
    gender,
  ]);

  const handleSave = async (nextPath?: string) => {
    setIsSaving(true);
    setError(null);
    if (!authToken) {
      setError("Sign in to save your draft.");
      setIsSaving(false);
      return;
    }
    const idealTenantPreferences: Record<string, string | boolean> = {
      employmentStatus: resolveLabel(employment, employmentValue),
      maritalStatus: resolveLabel(marital, maritalValue),
      vehicles: resolveLabel(vehicles, vehicleValue),
      smokingHabits: resolveLabel(smoking, smokingValue),
      drinkingHabits: resolveLabel(drinking, drinkingValue),
      religionPreference: resolveLabel(religion, religionValue),
      educationLevel: resolveLabel(education, educationValue),
      socialHabits: resolveLabel(social, socialValue),
      gender: resolveLabel(gender, genderValue),
    };

    if (childrenValue === "have") {
      idealTenantPreferences.hasChildren = true;
    } else if (childrenValue === "dont") {
      idealTenantPreferences.hasChildren = false;
    }

    Object.keys(idealTenantPreferences).forEach((key) => {
      if (idealTenantPreferences[key] === undefined) {
        delete idealTenantPreferences[key];
      }
    });

    setLandlordDraft({
      landlordRequirements: {
        idealTenantPreferences,
      },
    });

    try {
      await saveLandlordDraft();
      if (nextPath) {
        router.push(nextPath);
      }
    } catch (err) {
      setError((err as Error).message || "Unable to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white/95 font-display text-[#1A1A1A] antialiased">
      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-white/95 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-black/5">
          <div className="flex items-center justify-between px-4 py-4">
            <Link
              href="/add-property-requirements"
              aria-label="Go back"
              className="p-2 -ml-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={solidIconStyle}
              >
                arrow_back
              </span>
            </Link>

            <div className="text-[13px] font-semibold tracking-widest text-black/60 uppercase">
              STEP 4 OF 5
            </div>

            <button
              type="button"
              className="p-2 -mr-2 text-[#0a44b8] text-[13px] font-semibold hover:opacity-80"
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </header>

        {/* Progress */}
        <div className="w-full px-6 py-2">
          <div className="flex w-full flex-row items-center justify-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/40"></div>
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/40"></div>
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/40"></div>
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]"></div>
            <div className="h-1.5 flex-1 rounded-full bg-gray-300"></div>
          </div>

        </div>

        {/* Content */}
        <main className="flex-1 px-5 pt-5 pb-28 space-y-8">
          <div className="space-y-2">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              Tenant Preferences
            </h1>
            <p className="text-[12.5px] text-black/60 leading-relaxed">
              Specify your ideal tenant profile to help us find the best match
              for your property.
            </p>
          </div>

          {/* Employment */}
          <section className="space-y-3">
            <SectionHeader icon="work" title="Employment Status" />
            <div className="flex flex-wrap gap-3">
              {employment.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={employmentValue === o.key}
                  onClick={() => setEmploymentValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Marital */}
          <section className="space-y-3">
            <SectionHeader icon="favorite" title="Marital Status" />
            <div className="flex flex-wrap gap-3">
              {marital.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={maritalValue === o.key}
                  onClick={() => setMaritalValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Vehicles */}
          <section className="space-y-3">
            <SectionHeader icon="directions_car" title="Vehicles" subtitle="Do they own a vehicle?" />
            <div className="flex flex-wrap gap-3">
              {vehicles.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={vehicleValue === o.key}
                  onClick={() => setVehicleValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Smoking */}
          <section className="space-y-3">
            <SectionHeader icon="smoking_rooms" title="Smoking Habits" />
            <div className="flex flex-wrap gap-3">
              {smoking.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={smokingValue === o.key}
                  onClick={() => setSmokingValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Drinking */}
          <section className="space-y-3">
            <SectionHeader icon="wine_bar" title="Drinking Habits" />
            <div className="flex flex-wrap gap-3">
              {drinking.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={drinkingValue === o.key}
                  onClick={() => setDrinkingValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Religion */}
          <section className="space-y-3">
            <SectionHeader icon="mosque" title="Religion Preference" />
            <div className="flex flex-wrap gap-3">
              {religion.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={religionValue === o.key}
                  onClick={() => setReligionValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Education */}
          <section className="space-y-3">
            <SectionHeader
              icon="school"
              title="Education Level"
              subtitle="Minimum preferred education level:"
            />
            <div className="flex flex-wrap gap-3">
              {education.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={educationValue === o.key}
                  onClick={() => setEducationValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Social */}
          <section className="space-y-3">
            <SectionHeader icon="nightlife" title="Social Habits" subtitle="How often do they go out?" />
            <div className="flex flex-wrap gap-3">
              {social.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={socialValue === o.key}
                  onClick={() => setSocialValue(o.key)}
                />
              ))}
            </div>
          </section>

          {/* Children */}
          <section className="space-y-3">
            <SectionHeader icon="group" title="Children" />
            <div className="flex flex-col gap-3">
              {children.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={childrenValue === o.key}
                  onClick={() => setChildrenValue(o.key)}
                  fullWidth
                />
              ))}
            </div>
          </section>

          {/* Gender */}
          <section className="space-y-3">
            <SectionHeader icon="wc" title="Gender" subtitle="Preferred tenant gender" />
            <div className="flex flex-wrap gap-3">
              {gender.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={genderValue === o.key}
                  onClick={() => setGenderValue(o.key)}
                />
              ))}
            </div>
          </section>
        </main>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-20 max-w-md mx-auto p-5 pb-8 bg-gradient-to-t from-white/95 via-white/95 to-transparent">
          <button
            type="button"
            onClick={() => void handleSave("/add-property-review")}
            className="w-full h-14 rounded-full bg-[#0a44b8] text-white font-bold text-[15px] shadow-lg shadow-[#0a44b8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>{isSaving ? "Saving..." : "Continue"}</span>
            <span
              className="material-symbols-outlined text-[20px]"
              style={solidIconStyle}
            >
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
