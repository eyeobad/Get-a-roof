"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useToastError } from "@/hooks/useToastError";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

const formatNaira = (value?: number) => {
  if (value === undefined || value === null) return "—";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₦${value}`;
  }
};

function EditBtn({ href }: { href?: string }) {
  const cls =
    "inline-flex items-center gap-1 text-[#0a44b8] text-[14px] font-semibold hover:opacity-80";
  return href ? (
    <Link href={href} className={cls}>
      Edit
      <span className="material-symbols-outlined text-[18px]" style={solidIconStyle}>
        edit
      </span>
    </Link>
  ) : (
    <button type="button" className={cls}>
      Edit
      <span className="material-symbols-outlined text-[18px]" style={solidIconStyle}>
        edit
      </span>
    </button>
  );
}

function SectionTitle({
  title,
  editHref,
}: {
  title: string;
  editHref?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[16px] font-bold text-[#1A1A1A]">{title}</h2>
      <EditBtn href={editHref} />
    </div>
  );
}

function MiniChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] text-[#1A1A1A] shadow-sm">
      <span
        className="material-symbols-outlined text-[18px] text-black/55"
        style={solidIconStyle}
      >
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export default function ReviewPublishPage() {
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const draft = useAppStore((state) => state.landlordDraft);
  const publishLandlordDraft = useAppStore((state) => state.publishLandlordDraft);
  const clearLandlordDraft = useAppStore((state) => state.clearLandlordDraft);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useToastError(error);

  const address = useMemo(() => {
    const parts = [
      draft.address?.street,
      draft.address?.city,
      draft.address?.state,
      draft.address?.zip,
    ].filter(Boolean);
    return parts.join(", ");
  }, [draft.address]);

  const rentLabel = useMemo(
    () =>
      draft.monthlyPrice !== undefined
        ? formatNaira(draft.monthlyPrice * 12)
        : "—",
    [draft.monthlyPrice]
  );

  const propertyTypeLabel = useMemo(() => {
    if (!draft.propertyType) return "Not set";
    const spaced = draft.propertyType.replace(/([a-z])([A-Z])/g, "$1 $2");
    return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
  }, [draft.propertyType]);

  const preferenceChips = useMemo(() => {
    const prefs = draft.landlordRequirements?.idealTenantPreferences;
    if (!prefs) return [];
    const chips: { icon: string; label: string }[] = [];
    if (prefs.employmentStatus) chips.push({ icon: "work", label: prefs.employmentStatus });
    if (prefs.maritalStatus) chips.push({ icon: "favorite", label: prefs.maritalStatus });
    if (prefs.vehicles) chips.push({ icon: "directions_car", label: `Vehicle: ${prefs.vehicles}` });
    if (prefs.smokingHabits) chips.push({ icon: "smoking_rooms", label: prefs.smokingHabits });
    if (prefs.drinkingHabits) chips.push({ icon: "local_bar", label: prefs.drinkingHabits });
    if (prefs.religionPreference) chips.push({ icon: "church", label: prefs.religionPreference });
    if (prefs.educationLevel) chips.push({ icon: "school", label: prefs.educationLevel });
    if (prefs.socialHabits) chips.push({ icon: "celebration", label: prefs.socialHabits });
    if (prefs.hasChildren !== undefined) {
      chips.push({
        icon: "group",
        label: prefs.hasChildren ? "Has Children" : "No Children",
      });
    }
    return chips;
  }, [draft.landlordRequirements?.idealTenantPreferences]);

  const requirementSummary = useMemo(() => {
    const requirements = draft.landlordRequirements;
    const budget =
      requirements?.budgetRange?.max !== undefined
        ? formatNaira(requirements.budgetRange.max)
        : "Not set";
    const income =
      requirements?.annualIncome?.min !== undefined
        ? formatNaira(requirements.annualIncome.min)
        : "Not set";
    const pets =
      requirements?.petsAllowed === undefined
        ? "Not set"
        : requirements.petsAllowed
          ? "Allowed"
          : "Not allowed";
    const types: string[] = [];
    if (requirements?.nonOwnerOccupied) types.push("Non-owner");
    if (requirements?.sharedApartment) types.push("Shared Apartment");
    if (requirements?.shortlet) types.push("Shortlet");
    if (requirements?.selfCompound) types.push("Self Compound");
    if (requirements?.sharedCompound) types.push("Shared Compound");
    const typeLabel = types.length ? types.join(", ") : "Any";
    return { budget, income, pets, typeLabel };
  }, [draft.landlordRequirements]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    if (!authToken) {
      setError("Sign in to publish your listing.");
      setIsPublishing(false);
      return;
    }
    try {
      await publishLandlordDraft();
      clearLandlordDraft();
      router.push("/dashboard/properties");
    } catch (err) {
      setError((err as Error).message || "Unable to publish. Try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white/95 font-display text-[#1A1A1A] antialiased">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto flex-col bg-white/95 pb-36">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-black/5">
          <div className="px-4 py-4 flex items-center justify-between">
            <Link
              href="/add-property-preferences"
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

       
            <div className="w-10" />
          </div>
        </header>


        {/* Content */}
        <main className="px-5 pt-5 space-y-6">
          <div className="space-y-2">
            <div className="text-[#0a44b8] text-[13px] font-bold tracking-[0.18em] uppercase">
              STEP 5 OF 5
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight">
              Review &amp; Publish
            </h1>
            <p className="text-[13px] text-black/60 leading-relaxed max-w-[320px]">
              Please review your listing details below. You can edit any section
              before publishing.
            </p>
          </div>

          {/* Property Photos */}
          <section className="space-y-3">
            <SectionTitle title="Property Photos" editHref="/add-property-photos" />
            <div className="flex gap-4 overflow-x-auto pb-2 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(draft.images ?? []).length ? (
                (draft.images ?? []).map((src, index) => (
                  <div className="shrink-0" key={`${src}-${index}`}>
                    <div className="relative w-[210px] h-[132px] rounded-2xl overflow-hidden bg-black/10">
                      <Image
                        src={src}
                        alt={`Property photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {index === 0 ? (
                        <span className="absolute top-2 left-2 text-[11px] font-semibold text-white bg-black/55 backdrop-blur px-2 py-1 rounded-full">
                          Cover Photo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[13px] font-medium">
                      Photo {index + 1}
                    </p>
                  </div>
                ))
              ) : (
                <div className="shrink-0">
                  <div className="relative w-[210px] h-[132px] rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center text-sm text-black/40">
                    No photos yet
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* The Basics */}
          <section className="space-y-3">
            <SectionTitle title="The Basics" editHref="/add-property-details" />

            <div className="rounded-3xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="p-5 space-y-5">
                {/* Type */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#0a44b8]"
                      style={solidIconStyle}
                    >
                      apartment
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Type of Property
                    </div>
                    <div className="text-[15px] font-semibold mt-1">
                      {propertyTypeLabel}
                    </div>
                  </div>
                </div>

                {/* Rent */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF8EF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#1f8b4c]"
                      style={solidIconStyle}
                    >
                      payments
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Annual Rent
                    </div>
                    <div className="text-[15px] font-semibold mt-1">
                      {rentLabel}{" "}
                      <span className="text-[13px] font-medium text-black/45">
                        /year
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#0a44b8]"
                      style={solidIconStyle}
                    >
                      location_on
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Property Address
                    </div>
                    <div className="text-[13px] font-semibold mt-1">
                      {address || "Address not set"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-black/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#0a44b8]"
                      style={solidIconStyle}
                    >
                      description
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold tracking-widest text-black/45 uppercase">
                      Description
                    </div>
                    <p className="text-[13px] text-black/70 leading-relaxed mt-2">
                      {draft.description ||
                        "No description yet. Add details to help tenants understand your listing."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Requirements */}
          <section className="space-y-3">
            <SectionTitle title="Requirements" editHref="/add-property-requirements" />
            <div className="rounded-3xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-black/40"
                    style={solidIconStyle}
                  >
                    payments
                  </span>
                  <span className="text-[13px] font-medium">Budget</span>
                </div>
                <span className="text-[13px] font-semibold">
                  {requirementSummary.budget}
                </span>
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-black/40"
                    style={solidIconStyle}
                  >
                    workspace_premium
                  </span>
                  <span className="text-[13px] font-medium">Annual Income</span>
                </div>
                <span className="text-[13px] font-semibold">
                  {requirementSummary.income}
                </span>
              </div>

              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-black/40"
                    style={solidIconStyle}
                  >
                    pets
                  </span>
                  <span className="text-[13px] font-medium">Pets</span>
                </div>
                <span className="text-[13px] font-semibold">
                  {requirementSummary.pets}
                </span>
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-t border-black/5">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px] text-black/40"
                    style={solidIconStyle}
                  >
                    home_work
                  </span>
                  <span className="text-[13px] font-medium">Property Type</span>
                </div>
                <span className="text-[12px] font-semibold text-right max-w-[160px]">
                  {requirementSummary.typeLabel}
                </span>
              </div>
            </div>
          </section>

          {/* Ideal Tenant Match */}
          <section className="space-y-3 pb-2">
            <SectionTitle title="Ideal Tenant Match" editHref="/add-property-preferences" />
            <div className="rounded-3xl bg-white border border-black/5 shadow-sm p-5 space-y-4">
              <p className="text-[12px] text-black/50">
                These preferences help us find the best matches.
              </p>

              {preferenceChips.length ? (
                <div className="flex flex-col gap-3">
                  {preferenceChips.map((chip) => (
                    <MiniChip key={chip.label} icon={chip.icon} label={chip.label} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-black/45">
                  No preferences set yet.
                </p>
              )}
            </div>
          </section>
        </main>

        {/* Bottom publish bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-sm border-t border-black/5">
          <div className="px-5 pt-3 pb-7">
            <div className="flex items-center justify-between text-[12px] mb-3">
              <div className="text-black/55">
                Posting as <span className="font-semibold text-black/85">You</span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[#0a44b8] font-semibold"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={solidIconStyle}
                >
                  visibility
                </span>
                Preview
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handlePublish()}
              className="w-full h-14 rounded-full bg-[#0a44b8] text-white font-bold text-[15px] shadow-lg shadow-[#0a44b8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>{isPublishing ? "Publishing..." : "Publish Property"}</span>
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
    </div>
  );
}
