"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

// --- Types ---
type Option = { label: string };
type PreferenceGroup = {
  key: string;
  title: string;
  icon?: string;
  options: Option[];
};

type ApartmentCheck = { label: string; description: string };

const preferenceGroups: PreferenceGroup[] = [
  {
    key: "gender",
    title: "Gender",
    icon: "wc",
    options: [{ label: "Male" }, { label: "Female" }, { label: "Prefer not to say" }],
  },
  {
    key: "employment",
    title: "Employment",
    icon: "work",
    options: [
      { label: "Employed" },
      { label: "Self-Employed" },
      { label: "Student" },
      { label: "Unemployed" },
    ],
  },
  {
    key: "marital",
    title: "Marital Status",
    icon: "favorite",
    options: [{ label: "Single" }, { label: "Married" }, { label: "Divorced" }, { label: "Widowed" }],
  },
  {
    key: "vehicle",
    title: "Vehicle",
    icon: "directions_car",
    options: [{ label: "Yes" }, { label: "No" }, { label: "Any" }],
  },
  {
    key: "smoking",
    title: "Smoking",
    icon: "smoking_rooms",
    options: [{ label: "Yes" }, { label: "No" }, { label: "Occasionally" }, { label: "Socially" }],
  },
  {
    key: "drinking",
    title: "Drinking",
    icon: "local_bar",
    options: [{ label: "Yes" }, { label: "No" }, { label: "Occasionally" }, { label: "Socially" }],
  },
  {
    key: "religion",
    title: "Religion",
    icon: "church",
    options: [{ label: "No Preference" }, { label: "Muslim" }, { label: "Christian" }, { label: "Other" }],
  },
  {
    key: "education",
    title: "Education",
    icon: "school",
    options: [{ label: "High School" }, { label: "Bachelors" }, { label: "Masters" }, { label: "PHD" }],
  },
  {
    key: "social",
    title: "Social Habits",
    icon: "groups",
    options: [{ label: "Rarely" }, { label: "Occasionally" }, { label: "Often" }],
  },
];

const apartmentChecks: ApartmentCheck[] = [
  { label: "Pets Allowed", description: "Cats, dogs, etc." },
  { label: "Non-owner-occupied", description: "Landlord lives off-site" },
  { label: "Shared Apartment", description: "Unit shared with others" },
  { label: "Shortlet", description: "Short-term stays allowed" },
  { label: "Self Compound", description: "Private compound access" },
  { label: "Shared Compound", description: "Compound shared with others" },
];

type ProfileState = {
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string;
  annualEarnings: number;
  commuteRadius: number;
  preferences: Record<string, string>; // groupKey -> selected label (single select)
  apartmentPrefs: Record<string, boolean>; // check label -> bool
};

type ModalType = "none" | "photo" | "contact" | "preferences";

type ApiTenantPreferences = {
  lookingFor?: string[];
  petFriendlyRequired?: boolean;
  gender?: string;
  employmentStatus?: string;
  maritalStatus?: string;
  vehicles?: string;
  smokingHabits?: string;
  drinkingHabits?: string;
  religionPreference?: string;
  educationLevel?: string;
  socialHabits?: string;
  annualEarnings?: number;
  maxCommuteRadius?: number;
};

type ApiUser = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  preferences?: { tenant?: ApiTenantPreferences };
};

type ContactFieldKey = keyof Pick<ProfileState, "fullName" | "email" | "phone">;
type ContactField = {
  key: ContactFieldKey;
  label: string;
  icon: string;
  type: "text" | "email" | "tel";
};

const defaultProfile: ProfileState = {
  fullName: "",
  email: "",
  phone: "",
  photoUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDfCV60c8Lx3OwS6F6pZlph9DX90dUTo4gA-2YMIEaOfPWkF0OHDzVIPspyJrie7yszZDJ8i3bhK9EnT2M8zTDYy8P4IKH2cs9FIy0PJW0j7AukRcImec7aji1iXCosy05vO23XbOMn2NC5IzoLg_4wAEMKJaEeUhUnvhl1H4GoUSg30PBswRZsVoscA5v1ZuxEZ1pALXC3zJGeTCY1-4rsmKIaTCim5Sr4qpQRoBvLxb1TWRGOIuIaZJ3oxRP0qomRnhWGfzJhIm8P",
  annualEarnings: 0,
  commuteRadius: 0,
  preferences: {},
  apartmentPrefs: {},
};

const mapUserToProfile = (user: ApiUser | null | undefined): ProfileState => {
  if (!user) return { ...defaultProfile };
  const tenant = user.preferences?.tenant ?? {};
  const lookingFor = Array.isArray(tenant.lookingFor) ? tenant.lookingFor : [];
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  const apartmentPrefs: Record<string, boolean> = {
    "Pets Allowed": Boolean(tenant.petFriendlyRequired),
    "Non-owner-occupied": lookingFor.includes("NonOwnerOccupied"),
    "Shared Apartment": lookingFor.includes("SharedApartment"),
    Shortlet: lookingFor.includes("Shortlet"),
    "Self Compound": lookingFor.includes("SelfCompound"),
    "Shared Compound": lookingFor.includes("SharedCompound"),
  };

  return {
    fullName: fullName || defaultProfile.fullName,
    email: user.email ?? defaultProfile.email,
    phone: user.phoneNumber ?? defaultProfile.phone,
    photoUrl: user.photoUrl ?? defaultProfile.photoUrl,
    annualEarnings: tenant.annualEarnings ?? defaultProfile.annualEarnings,
    commuteRadius: tenant.maxCommuteRadius ?? defaultProfile.commuteRadius,
    preferences: {
      gender: tenant.gender ?? "",
      employment: tenant.employmentStatus ?? "",
      marital: tenant.maritalStatus ?? "",
      vehicle: tenant.vehicles ?? "",
      smoking: tenant.smokingHabits ?? "",
      drinking: tenant.drinkingHabits ?? "",
      religion: tenant.religionPreference ?? "",
      education: tenant.educationLevel ?? "",
      social: tenant.socialHabits ?? "",
    },
    apartmentPrefs,
  };
};

// --- Components ---

function ToggleRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white px-6 py-5 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex flex-col">
        <span className="text-lg font-bold text-slate-900">{title}</span>
        <span className="text-sm text-slate-500 font-medium">{subtitle}</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex items-center w-14 h-8 rounded-full transition-colors shadow-inner",
          checked ? "bg-primary" : "bg-slate-200",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-[4px] left-[4px] h-6 w-6 rounded-full bg-white border border-gray-300 transition-transform",
            checked ? "translate-x-6" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">tune</span>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>

        {footer && <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">{footer}</div>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  // ---- SOURCE OF TRUTH (enterprise pattern) ----
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const userId = useAppStore((state) => state.userId);
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const updateUser = useAppStore((state) => state.updateUser);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const uploadProfilePhoto = useAppStore((state) => state.uploadProfilePhoto);
  const deleteAccount = useAppStore((state) => state.deleteAccount);
  
  const [confirmInput, setConfirmInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profile, setProfile] = useState<ProfileState>(() => ({ ...defaultProfile }));

  // ---- MODAL + DRAFT STATE ----
  const [activeModal, setActiveModal] = useState<ModalType>("none");
  const [draft, setDraft] = useState<ProfileState>(profile);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const contactFields: ContactField[] = useMemo(
    () => [
      { key: "fullName", label: "Full Name", icon: "person", type: "text" },
      { key: "email", label: "Email", icon: "mail", type: "email" },
      { key: "phone", label: "Phone Number", icon: "phone", type: "tel" },
    ],
    []
  );

  const openModal = (type: ModalType) => {
    setDraft(profile); // snapshot current data into draft
    setActiveModal(type);
  };

  const closeModal = () => setActiveModal("none");

  const saveDraft = () => {
    setProfile(draft);
    setActiveModal("none");
  };

  const singleSelectSummary = useMemo(() => {
    return preferenceGroups.map((g) => ({
      key: g.key,
      title: g.title,
      value: profile.preferences[g.key] || "—",
    }));
  }, [profile.preferences]);

  useEffect(() => {
    if (!authToken || !userId) {
      router.replace("/login");
    }
  }, [authToken, userId, router]);

  useEffect(() => {
    if (!authToken || !userId) return;
    let mounted = true;
    setIsLoading(true);
    fetchUserProfile()
      .then((user) => {
        if (!mounted || !user) return;
        const nextProfile = mapUserToProfile(user);
        setProfile(nextProfile);
        setDraft(nextProfile);
      })
      .catch(() => {
        if (mounted) setProfile((prev) => ({ ...prev }));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [authToken, userId, fetchUserProfile]);

  const handleSaveProfile = async () => {
    if (!authToken || !userId) {
      router.push("/login");
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    const nameParts = profile.fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");

    const lookingForMap: Record<string, string> = {
      "Non-owner-occupied": "NonOwnerOccupied",
      "Shared Apartment": "SharedApartment",
      Shortlet: "Shortlet",
      "Self Compound": "SelfCompound",
      "Shared Compound": "SharedCompound",
    };
    const lookingFor = Object.entries(lookingForMap)
      .filter(([label]) => profile.apartmentPrefs[label])
      .map(([, value]) => value);

    const tenantPayload: Record<string, unknown> = {
      gender: profile.preferences.gender || undefined,
      employmentStatus: profile.preferences.employment || undefined,
      maritalStatus: profile.preferences.marital || undefined,
      vehicles: profile.preferences.vehicle || undefined,
      smokingHabits: profile.preferences.smoking || undefined,
      drinkingHabits: profile.preferences.drinking || undefined,
      religionPreference: profile.preferences.religion || undefined,
      educationLevel: profile.preferences.education || undefined,
      socialHabits: profile.preferences.social || undefined,
      annualEarnings: profile.annualEarnings,
      maxCommuteRadius: profile.commuteRadius,
      petFriendlyRequired: profile.apartmentPrefs["Pets Allowed"] || false,
      lookingFor,
    };

    Object.keys(tenantPayload).forEach((key) => {
      const value = tenantPayload[key];
      if (
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete tenantPayload[key];
      }
    });

    try {
      await updateUser({
        firstName,
        lastName,
        email: profile.email,
        phoneNumber: profile.phone,
        photoUrl: profile.photoUrl,
      });
      await updatePreferences({ tenant: tenantPayload });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file || !uploadProfilePhoto) {
      event.target.value = "";
      return;
    }
    setIsUploadingPhoto(true);
    setPhotoUploadError(null);
    try {
      const photoUrl = await uploadProfilePhoto(file);
      if (photoUrl) {
        const nextProfile = { ...profile, photoUrl };
        setProfile(nextProfile);
        setDraft((prev) => ({ ...prev, photoUrl }));
      }
    } catch (err) {
      setPhotoUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccount || !authToken || !userId) {
      return;
    }
    // Logic now handled by the UI button enabling
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const success = await deleteAccount();
      if (success) {
        clearAuth();
        router.push("/login");
      } else {
        setDeleteError("Unable to delete account");
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background-light text-slate-900">
      {/* Responsive container */}
      <div className="mx-auto w-full max-w-md lg:max-w-6xl lg:px-6">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-background-light px-4 py-3 lg:px-0">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-full p-2 text-primary transition-colors hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>

          <h2 className="flex-1 text-center text-2xl font-bold tracking-tight text-primary">My Profile</h2>

          <button
            onClick={() => {
              clearAuth();
              router.push("/login");
            }}
            className="text-right text-primary font-bold tracking-tight"
          >
            Logout
          </button>
        </header>

        {/* Layout: mobile = single column, desktop = two columns */}
        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:py-6">
          {/* LEFT rail (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[76px] space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Profile</p>
                  <button
                    onClick={() => openModal("photo")}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-slate-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit Photo
                  </button>
                </div>

                <div className="mt-5 flex flex-col items-center">
                  <div className="relative">
                    <div
                      className="h-32 w-32 rounded-full border-4 border-white bg-cover bg-center shadow-lg"
                      style={{ backgroundImage: `url('${profile.photoUrl}')` }}
                    />
                    <button
                      onClick={() => openModal("photo")}
                      className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md hover:brightness-110 transition"
                      aria-label="Edit photo"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    </button>
                  </div>

                  <p className="mt-4 text-xl font-bold text-primary">{profile.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
                  <p className="text-sm text-slate-500">{profile.phone}</p>

                  <button
                    onClick={() => openModal("contact")}
                    className="mt-5 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Edit Contact Details
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">My Profile</p>
                  <button
                    onClick={() => openModal("preferences")}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-slate-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {singleSelectSummary.map((row) => (
                    <div key={row.key} className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600">{row.title}</span>
                      <span className="text-sm font-bold text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN content */}
          <main className="flex-1 overflow-visible px-4 pb-28 pt-6 lg:px-0 lg:pb-10 lg:pt-0">
            {/* Mobile photo section */}
            <section className="flex flex-col items-center gap-4 lg:hidden">
              <div className="relative">
                <div
                  className="h-32 w-32 rounded-full border-4 border-white bg-cover bg-center shadow-lg"
                  style={{ backgroundImage: `url('${profile.photoUrl}')` }}
                />
                <button
                  onClick={() => openModal("photo")}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md hover:brightness-110 transition"
                  aria-label="Edit photo"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
              </div>
              <button
                onClick={() => openModal("photo")}
                className="text-xl font-bold text-primary hover:underline"
              >
                Edit Photo
              </button>
            </section>

            {/* Contact section */}
            <section className="mt-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-primary">Contact Details</h3>
                <button
                  onClick={() => openModal("contact")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit
                </button>
              </div>

              {[
                { label: "Full Name", icon: "person", value: profile.fullName },
                { label: "Email", icon: "mail", value: profile.email },
                { label: "Phone Number", icon: "phone", value: profile.phone },
              ].map((field) => (
                <div key={field.label} className="space-y-2">
                  <label className="text-lg font-bold text-primary">{field.label}</label>
                  <div className="flex items-center gap-3 rounded-full border-2 border-slate-200 bg-white px-4 py-3">
                    <span className="material-symbols-outlined text-slate-400 text-[24px]">
                      {field.icon}
                    </span>
                    <input
                      className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
                      value={field.value}
                      readOnly
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* My Profile section (read view) - UPDATED: Hidden on Desktop */}
            <section className="mt-8 space-y-6 lg:hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-primary">My Profile</h3>
                <button
                  onClick={() => openModal("preferences")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {preferenceGroups.map((group) => (
                  <div key={group.key} className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">
                        {group.icon || "star"}
                      </span>
                      <p className="text-lg font-bold text-primary">{group.title}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.options.map((opt) => {
                        const active = profile.preferences[group.key] === opt.label;
                        return (
                          <span
                            key={opt.label}
                            className={`rounded-full px-4 py-2 text-base font-semibold border transition-colors ${
                              active
                                ? "border-2 border-primary bg-blue-50 text-primary"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {opt.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Annual earnings */}
            <section className="mt-8 space-y-5">
              <h3 className="text-2xl font-bold text-primary">Annual Earnings</h3>
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">Total Yearly Income</span>
                      <span className="rounded-lg bg-slate-100 px-3 py-1 text-xl font-bold text-primary">
                        ₦{new Intl.NumberFormat("en-NG").format(profile.annualEarnings)}
                      </span>
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min={1500000}
                    max={20000000}
                    step={50000}
                    value={profile.annualEarnings}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, annualEarnings: Number(e.target.value) }))
                    }
                    className="w-full accent-primary"
                  />
                  <div className="mt-2 flex justify-between text-sm text-slate-400 font-medium">
                    <span>₦1.5m</span>
                    <span>₦10m</span>
                    <span>₦20m+</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Apartment Preference toggles - UPDATED WITH TOGGLE LOGIC */}
            <section className="mt-8 space-y-3">
              <h3 className="text-2xl font-bold text-primary">Apartment Preference</h3>
              
              <div className="space-y-4">
                {apartmentChecks.map((check) => (
                  <ToggleRow
                    key={check.label}
                    title={check.label}
                    subtitle={check.description}
                    checked={!!profile.apartmentPrefs[check.label]}
                    onChange={() =>
                      setProfile((p) => ({
                        ...p,
                        apartmentPrefs: {
                          ...p.apartmentPrefs,
                          [check.label]: !p.apartmentPrefs[check.label],
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </section>

            {/* Commute radius */}
            <section className="mt-8 space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">Max Commute Radius</span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xl font-bold text-primary">
                    {profile.commuteRadius} mi
                  </span>
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={profile.commuteRadius}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, commuteRadius: Number(e.target.value) }))
                    }
                    className="w-full accent-primary"
                  />
                  <div className="mt-2 flex justify-between text-sm text-slate-400 font-medium">
                    <span>0 mi</span>
                    <span>25 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Delete Account Section - UPDATED WITH DANGER ZONE */}
            <section className="mt-12 border-t border-gray-100 pt-10">
              <div className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm ring-1 ring-red-50">
                <div className="flex flex-col gap-8 p-6 md:flex-row md:items-start md:justify-between">
                  
                  {/* Left Side: The Warning */}
                  <div className="max-w-md space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <span className="material-symbols-outlined">warning</span>
                      <h3 className="text-lg font-bold text-gray-900">Danger Zone</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-500">
                      Permanently delete your account and all matching history. This action 
                      <span className="font-semibold text-gray-900"> cannot be undone</span>.
                    </p>
                  </div>

                  {/* Right Side: The Input & Action */}
                  <div className="w-full max-w-sm rounded-xl bg-red-50/50 p-5 border border-red-100">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      To confirm, type <span className="font-mono font-bold text-red-600">delete</span> below
                    </label>
                    
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        placeholder="delete"
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        className="w-full rounded-lg border-red-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />

                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || confirmInput !== "delete"}
                        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                      >
                        {isDeleting ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          // Icon changes based on whether the input matches
                          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">
                            {confirmInput === "delete" ? "delete_forever" : "lock"}
                          </span>
                        )}
                        {isDeleting ? "Deleting..." : "Delete Account"}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Error Message */}
                {deleteError && (
                  <div className="border-t border-red-100 bg-red-50 px-6 py-3">
                    <p className="flex items-center gap-2 text-xs font-medium text-red-600">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {deleteError}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>

        {/* Footer (mobile sticky) */}
        <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-background-light/95 px-4 py-4 backdrop-blur-sm lg:static lg:bg-transparent lg:border-0 lg:px-0 lg:py-0">
          {saveError && (
            <p className="text-center text-sm font-medium text-red-600 mb-3">
              {saveError}
            </p>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={isSaving || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95 lg:max-w-md lg:ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">save</span>
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </footer>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* Edit Photo (state-based) */}
      <Modal
        open={activeModal === "photo"}
        title="Edit Photo"
        onClose={closeModal}
        footer={
          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              className="flex-[2] rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition"
            >
              Save Photo
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="h-16 w-16 rounded-full border-2 border-white bg-cover bg-center shadow-sm"
              style={{ backgroundImage: `url('${draft.photoUrl}')` }}
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">Preview</p>
              <p className="text-xs text-slate-500 truncate">{draft.photoUrl}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">Photo URL</label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <span className="material-symbols-outlined text-slate-400">link</span>
              <input
                value={draft.photoUrl}
                onChange={(e) => setDraft((d) => ({ ...d, photoUrl: e.target.value }))}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Paste image URL…"
              />
            </div>
            <p className="text-xs text-slate-500">
              Tip: use a direct image URL (ends with .jpg/.png) for best results.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">Upload from device</label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-primary hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                {isUploadingPhoto ? "Uploading…" : "Choose a file"}
              </button>
              <p className="text-xs text-slate-500">
                Files are uploaded securely and stored privately unless you update
                permissions.
              </p>
              {photoUploadError && (
                <p className="text-xs font-medium text-red-600">{photoUploadError}</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoFileChange}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Contact (state-based) */}
      <Modal
        open={activeModal === "contact"}
        title="Edit Contact Details"
        onClose={closeModal}
        footer={
          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              className="flex-[2] rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition"
            >
              Save Changes
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {contactFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-bold text-slate-900">{field.label}</label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <span className="material-symbols-outlined text-slate-400">{field.icon}</span>
                <input
                  type={field.type}
                  value={draft[field.key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                  }
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Profile (single-select per group, state-based) */}
      <Modal
        open={activeModal === "preferences"}
        title="Edit Profile"
        onClose={closeModal}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => {
                // quick reset to empty selections (still single-select model)
                setDraft((d) => ({
                  ...d,
                  preferences: preferenceGroups.reduce<Record<string, string>>((acc, g) => {
                    acc[g.key] = "";
                    return acc;
                  }, {}),
                }));
              }}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
            >
              Reset
            </button>
            <button
              onClick={saveDraft}
              className="flex-[2] rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition"
            >
              Save Profile
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {preferenceGroups.map((group) => (
            <div key={group.key} className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">{group.icon || "star"}</span>
                <p className="text-sm font-bold text-slate-900">{group.title}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const active = draft.preferences[group.key] === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          preferences: { ...d.preferences, [group.key]: opt.label },
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-bold border transition-colors ${
                        active
                          ? "border-primary bg-blue-50 text-primary"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Selected:{" "}
                <span className="font-bold text-slate-700">{draft.preferences[group.key] || "—"}</span>
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
