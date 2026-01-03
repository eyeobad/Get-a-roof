"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [profile, setProfile] = useState<ProfileState>(() => ({
    fullName: "Sarah Jenkins",
    email: "sarah.jenkins@example.com",
    phone: "+1 (555) 123-4567",
    photoUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCx6DzMNOzrYCXX4YWcckEWTfaCn19D0_qoed1dl1Curkg6F6_abZMP-Fkks-2jNdJQDQKSjndOSwj1bst8t-IvK6BtQACV3RgFMJob8FIAlMa4rrtHC3-S_HnYCKLlgvE0yCWIezjLP33utbei9KW4Dym6Py3HRxziATGkK0nJ7jQA695G1T4PyoKSQ0AutCOUuFhGhPNOh_vFgpYIDxb9iAns66XAR8yUGIqaeTxCUmmzpF_a4OgfwDa8hsP21nEciC__k3wmOHBq",
    annualEarnings: 85000,
    commuteRadius: 15,
    preferences: {
      employment: "Employed",
      marital: "Married",
      vehicle: "Yes",
      smoking: "No",
      drinking: "Occasionally",
      religion: "Muslim",
      education: "Bachelors",
      social: "Occasionally",
    },
    apartmentPrefs: {
      "Pets Allowed": true,
      "Non-owner-occupied": false,
      "Shared Apartment": false,
      Shortlet: false,
      "Self Compound": false,
      "Shared Compound": false,
    },
  }));

  // ---- MODAL + DRAFT STATE ----
  const [activeModal, setActiveModal] = useState<ModalType>("none");
  const [draft, setDraft] = useState<ProfileState>(profile);

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

          <button className="text-right text-primary font-bold tracking-tight">Logout</button>
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
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Preferences</p>
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

            {/* Preferences section (read view) */}
            <section className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-primary">Preferences</h3>
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
                    ${profile.annualEarnings.toLocaleString()}
                  </span>
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={300000}
                    step={5000}
                    value={profile.annualEarnings}
                    className="w-full accent-primary"
                    readOnly
                  />
                  <div className="mt-2 flex justify-between text-sm text-slate-400 font-medium">
                    <span>$0</span>
                    <span>$150k</span>
                    <span>$300k+</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Apartment Preference toggles */}
            <section className="mt-8 space-y-3">
              <h3 className="text-2xl font-bold text-primary">Apartment Preference</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {apartmentChecks.map((check) => {
                  const active = !!profile.apartmentPrefs[check.label];
                  return (
                    <div
                      key={check.label}
                      className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5"
                    >
                      <div>
                        <p className="text-lg font-bold text-slate-900">{check.label}</p>
                        <p className="text-sm text-slate-500">{check.description}</p>
                      </div>

                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={active}
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
                        <span className="inline-flex h-8 w-14 items-center rounded-full bg-gray-200 transition peer-checked:bg-primary">
                          <span className="ml-1 h-7 w-7 rounded-full bg-white transition peer-checked:translate-x-6" />
                        </span>
                      </label>
                    </div>
                  );
                })}
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
                    className="w-full accent-primary"
                    readOnly
                  />
                  <div className="mt-2 flex justify-between text-sm text-slate-400 font-medium">
                    <span>0 mi</span>
                    <span>25 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>

        {/* Footer (mobile sticky) */}
        <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-background-light/95 px-4 py-4 backdrop-blur-sm lg:static lg:bg-transparent lg:border-0 lg:px-0 lg:py-0">
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-xl font-bold text-white shadow-lg transition-transform active:scale-95 lg:max-w-md lg:ml-auto">
            <span className="material-symbols-outlined">save</span>
            Save Profile
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
          {[
            { key: "fullName", label: "Full Name", icon: "person", type: "text" as const },
            { key: "email", label: "Email", icon: "mail", type: "email" as const },
            { key: "phone", label: "Phone Number", icon: "phone", type: "tel" as const },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-bold text-slate-900">{field.label}</label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <span className="material-symbols-outlined text-slate-400">{field.icon}</span>
                <input
                  type={field.type}
                  value={(draft as any)[field.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value } as any))}
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Preferences (single-select per group, state-based) */}
      <Modal
        open={activeModal === "preferences"}
        title="Edit Preferences"
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
              Save Preferences
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
