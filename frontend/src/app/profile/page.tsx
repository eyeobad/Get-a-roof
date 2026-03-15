"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import TenantProfileTutorial from "@/components/TenantProfileTutorial";
import { useToastError } from "@/hooks/useToastError";
import { NIGERIA_STATES } from "@/lib/nigeriaLocations";

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
  preferredState: string;
  annualEarnings: number;
  commuteRadius: number;
  preferences: Record<string, string>; // groupKey -> selected label (single select)
  apartmentPrefs: Record<string, boolean>; // check label -> bool
};

type ModalType = "none" | "photo" | "preferences" | "delete";

type ApiTenantPreferences = {
  lookingFor?: string[];
  petFriendlyRequired?: boolean;
  hasSeenExploreTutorial?: boolean;
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
  preferredState?: string;
  maxCommuteRadius?: number;
  preferredDistance?: number;
};

type ApiUser = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  preferences?: { tenant?: ApiTenantPreferences };
};

const defaultProfile: ProfileState = {
  fullName: "",
  email: "",
  phone: "",
  photoUrl: "",
  preferredState: "",
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
    preferredState: tenant.preferredState ?? defaultProfile.preferredState,
    annualEarnings: tenant.annualEarnings ?? defaultProfile.annualEarnings,
    commuteRadius:
      typeof tenant.preferredDistance === "number" &&
      Number.isFinite(tenant.preferredDistance)
        ? tenant.preferredDistance
        : tenant.maxCommuteRadius ?? defaultProfile.commuteRadius,
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

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function AvatarCircle({ photoUrl, size }: { photoUrl: string; size: string }) {
  if (photoUrl) {
    return (
      <div
        className={`${size} rounded-full border-4 border-white bg-cover bg-center shadow-lg`}
        style={{ backgroundImage: `url('${photoUrl}')` }}
      />
    );
  }
  return (
    <div className={`${size} rounded-full border-4 border-white bg-slate-100 shadow-lg flex items-center justify-center`}>
      <span className="material-symbols-outlined text-slate-400 text-[48px]">person</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <>
      {/* Mobile photo skeleton */}
      <section className="flex flex-col items-center gap-4 lg:hidden">
        <Shimmer className="h-32 w-32 rounded-full" />
        <Shimmer className="h-4 w-24 rounded-full" />
      </section>

      {/* Contact skeleton */}
      <section className="mt-6 space-y-5">
        <Shimmer className="h-7 w-40 rounded-lg" />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Shimmer className="h-3 w-20 rounded" />
              <Shimmer className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </section>

      {/* Preferences skeleton */}
      <section className="mt-8 space-y-6 lg:hidden">
        <Shimmer className="h-7 w-32 rounded-lg" />
        <div className="grid grid-cols-1 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5">
              <Shimmer className="h-5 w-24 rounded" />
              <div className="mt-4 flex flex-wrap gap-2">
                {[1, 2, 3].map((j) => (
                  <Shimmer key={j} className="h-9 w-20 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings skeleton */}
      <section className="mt-8 space-y-5">
        <Shimmer className="h-7 w-40 rounded-lg" />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Shimmer className="h-6 w-full rounded" />
          <Shimmer className="mt-4 h-4 w-full rounded" />
        </div>
      </section>
    </>
  );
}

function DesktopSidebarSkeleton() {
  return (
                <div className="sticky top-[76px] space-y-6">
                  <div data-tour="tenant-profile-photo" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-16 rounded" />
          <Shimmer className="h-9 w-28 rounded-full" />
        </div>
        <div className="mt-5 flex flex-col items-center">
          <Shimmer className="h-32 w-32 rounded-full" />
          <Shimmer className="mt-4 h-5 w-36 rounded" />
          <Shimmer className="mt-2 h-3 w-44 rounded" />
          <Shimmer className="mt-1 h-3 w-28 rounded" />
        </div>
      </div>
                  <div data-tour="tenant-profile-details" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-20 rounded" />
          <Shimmer className="h-9 w-20 rounded-full" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Shimmer className="h-3 w-20 rounded" />
              <Shimmer className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-col">
        <span className="text-base font-bold text-slate-900">{title}</span>
        <span className="text-xs font-medium text-slate-500">{subtitle}</span>
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
  const captureUserLocation = useAppStore((state) => state.captureUserLocation);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const uploadProfilePhoto = useAppStore((state) => state.uploadProfilePhoto);
  const deleteAccount = useAppStore((state) => state.deleteAccount);

  const [confirmInput, setConfirmInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydratedSession, setHasHydratedSession] = useState(false);

  const [profile, setProfile] = useState<ProfileState>(() => ({ ...defaultProfile }));
  const [hasServerPhone, setHasServerPhone] = useState(false);

  // ---- MODAL + DRAFT STATE ----
  const [activeModal, setActiveModal] = useState<ModalType>("none");
  const [draft, setDraft] = useState<ProfileState>(profile);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<unknown>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  useToastError(saveError);
  useToastError(photoUploadError);
  useToastError(deleteError);

  const openModal = (type: ModalType) => {
    setDraft(profile); // snapshot current data into draft
    setActiveModal(type);
  };

  const closeModal = () => setActiveModal("none");

  const saveDraft = () => {
    setProfile(draft);
    setActiveModal("none");
  };

  const handleSavePhoto = async () => {
    if (!authToken || !userId) {
      router.push("/login");
      return;
    }
    setSaveError(null);
    try {
      await updateUser({ photoUrl: draft.photoUrl });
      setProfile((prev) => ({ ...prev, photoUrl: draft.photoUrl }));
      setDraft((prev) => ({ ...prev, photoUrl: draft.photoUrl }));
      setActiveModal("none");
    } catch (err) {
      setSaveError(err);
    }
  };

  const singleSelectSummary = useMemo(() => {
    return preferenceGroups.map((g) => ({
      key: g.key,
      title: g.title,
      value: profile.preferences[g.key] || "—",
    }));
  }, [profile.preferences]);

  useEffect(() => {
    setHasHydratedSession(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedSession) return;
    if (!authToken || !userId) {
      router.replace("/login");
    }
  }, [authToken, hasHydratedSession, userId, router]);

  useEffect(() => {
    if (!authToken) return;
    void captureUserLocation();
  }, [authToken, captureUserLocation]);

  useEffect(() => {
    if (!hasHydratedSession || !authToken || !userId) return;
    let mounted = true;
    setIsLoading(true);
    fetchUserProfile()
      .then((user) => {
        if (!mounted || !user) return;
        const nextProfile = mapUserToProfile(user);
        setProfile(nextProfile);
        setDraft(nextProfile);
        setHasServerPhone(!!user.phoneNumber);
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
  }, [authToken, hasHydratedSession, userId, fetchUserProfile]);

  const handleSaveProfile = async () => {
    if (!authToken || !userId) {
      router.push("/login");
      return;
    }
    setIsSaving(true);
    setSaveError(null);

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
      preferredState: profile.preferredState || undefined,
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
      preferredDistance: profile.commuteRadius,
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
      // If user added a phone number (e.g. Google signup had none), persist it
      const storedPhone = profile.phone.trim();
      if (storedPhone) {
        await updateUser({ phoneNumber: storedPhone });
      }
      await updatePreferences({ tenant: tenantPayload });
    } catch (err) {
      setSaveError(err);
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
        setDraft((prev) => ({ ...prev, photoUrl }));
      }
    } catch (err) {
      setPhotoUploadError(err);
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
      setDeleteError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      {/* Responsive container */}
      <div className="mx-auto w-full max-w-md px-4 lg:max-w-7xl lg:px-6">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-slate-50/95 py-3 backdrop-blur-sm">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-full p-2 text-primary transition-colors hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>

          <h2 className="flex-1 text-center text-2xl font-bold tracking-tight text-primary">My Profile</h2>

          <button
            onClick={handleSignOut}
            aria-label="Logout"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-[24px]">logout</span>
          </button>
        </header>

        {/* Layout: mobile = single column, desktop = two columns */}
        <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-8 lg:py-6">
          {/* LEFT rail (desktop) */}
          <aside className="hidden lg:block">
            {isLoading ? <DesktopSidebarSkeleton /> : (
              <div className="sticky top-[76px] space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Profile</p>
                    <button
                      onClick={() => openModal("photo")}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      Edit Photo
                    </button>
                  </div>

                  <div className="mt-5 flex flex-col items-center">
                    <div className="relative">
                      <AvatarCircle photoUrl={profile.photoUrl} size="h-32 w-32" />
                      <button
                        onClick={() => openModal("photo")}
                        className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md hover:brightness-110 transition"
                        aria-label="Edit photo"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    </div>

                    <p className="mt-4 text-xl font-bold text-primary">{profile.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
                    <p className="text-sm text-slate-500">{profile.phone}</p>

                    <p className="mt-4 text-xs font-medium text-slate-500">
                      Name and email are read-only. Phone can be added if missing.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            )}
          </aside>

          {/* MAIN content */}
          <main className="flex-1 overflow-visible pb-28 pt-6 lg:pb-10 lg:pt-0">
            {isLoading ? <ProfileSkeleton /> : (<>
              {/* Mobile photo section */}
              <section className="flex flex-col items-center gap-4 lg:hidden">
                <div className="relative">
                  <AvatarCircle photoUrl={profile.photoUrl} size="h-32 w-32" />
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
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Update photo
                </button>
              </section>

              <section className="mt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-primary">Contact Details</h3>
                  {profile.phone ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      Read-only
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                      Phone missing
                    </span>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-4">
                    {/* Full Name — always read-only */}
                    {[
                      { label: "Full Name", icon: "person", value: profile.fullName },
                      { label: "Email", icon: "mail", value: profile.email },
                    ].map((field) => (
                      <div key={field.label} className="space-y-2">
                        <label className="text-sm font-semibold text-slate-500">{field.label}</label>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="material-symbols-outlined text-slate-400 text-[20px]">
                            {field.icon}
                          </span>
                          <input
                            className="w-full bg-transparent text-base font-medium text-slate-800 outline-none"
                            value={field.value}
                            readOnly
                          />
                        </div>
                      </div>
                    ))}

                    {/* Phone — editable when missing */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-500">Phone Number</label>
                      <div
                        className={[
                          "flex items-center gap-3 rounded-xl border px-4 py-3 transition",
                          profile.phone && hasServerPhone
                            ? "border-slate-200 bg-slate-50"
                            : "border-blue-200 bg-blue-50 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-300",
                        ].join(" ")}
                      >
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">phone</span>
                        <input
                          className="w-full bg-transparent text-base font-medium text-slate-800 outline-none placeholder:text-slate-400"
                          value={profile.phone}
                          readOnly={hasServerPhone}
                          placeholder={hasServerPhone ? undefined : "Add phone number"}
                          onChange={(e) =>
                            setProfile((prev) => ({ ...prev, phone: e.target.value }))
                          }
                        />
                        {!hasServerPhone && (
                          <span className="material-symbols-outlined text-blue-400 text-[18px]">edit</span>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
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
                              className={`rounded-full px-4 py-2 text-base font-semibold border transition-colors ${active
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
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">Preferred Area (State)</span>
                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-xl font-bold text-primary">
                      {profile.preferredState || "Not set"}
                    </span>
                  </div>

                  <div className="mt-4">
                    <select
                      value={profile.preferredState}
                      onChange={(event) =>
                        setProfile((prev) => ({
                          ...prev,
                          preferredState: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Any state</option>
                      {NIGERIA_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Commute radius */}
              <section className="mt-8 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">Max Commute Radius (km)</span>
                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-xl font-bold text-primary">
                      {profile.commuteRadius} km
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
                      <span>0 km</span>
                      <span>25 km</span>
                      <span>50 km</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3 pt-4">
                <button
                  onClick={() => {
                    setConfirmInput("");
                    openModal("delete");
                  }}
                  className="w-full py-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 font-bold hover:bg-red-100 active:bg-red-200 transition-colors"
                >
                  Delete Account
                </button>
              </section>
            </>)}
          </main>
        </div>

        {/* Footer (mobile sticky) */}
        <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-background-light/95 px-4 py-4 backdrop-blur-sm lg:static lg:bg-transparent lg:border-0 lg:px-0 lg:py-0">
            <button
              data-tour="tenant-profile-save"
              onClick={handleSaveProfile}
              disabled={isSaving || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95 lg:max-w-md lg:ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">save</span>
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </footer>
        </div>

        <TenantProfileTutorial ready={Boolean(authToken && !isLoading)} />

      {/* ---------------- MODALS ---------------- */}

      {/* Edit Photo */}
      <Modal
        open={activeModal === "photo"}
        title="Update Profile Photo"
        onClose={closeModal}
        footer={
          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePhoto}
              className="flex-[2] rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition"
            >
              Save Photo
            </button>
          </div>
        }
      >
        <div className="space-y-5">



          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {isUploadingPhoto ? "Uploading..." : "Upload from device"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              JPG, PNG, WEBP recommended
            </p>
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
                      className={`rounded-full px-4 py-2 text-sm font-bold border transition-colors ${active
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

      {activeModal === "delete" && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={closeModal} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Delete Account</h3>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 p-4 rounded-2xl flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600">warning</span>
                <p className="text-sm text-red-800 leading-relaxed">
                  This action is permanent and cannot be undone. All your listings, matches, and messages will be permanently removed.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Type <span className="font-mono text-red-600">delete</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="delete"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmInput.trim() !== "delete" || isDeleting}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
