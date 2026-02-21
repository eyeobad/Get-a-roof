"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useToastError } from "@/hooks/useToastError";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-NG").format(n);
}

function formatNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₦${formatMoney(n)}`;
  }
}

export default function AddPropertyRequirementsPage() {
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const draft = useAppStore((state) => state.landlordDraft);
  const setLandlordDraft = useAppStore((state) => state.setLandlordDraft);
  const saveLandlordDraft = useAppStore((state) => state.saveLandlordDraft);
  const [initialized, setInitialized] = useState(false);
  const [budget, setBudget] = useState(100000);
  const [income, setIncome] = useState("80000");

  const [pets, setPets] = useState(true);
  const [nonOwner, setNonOwner] = useState(false);
  const [sharedApt, setSharedApt] = useState(false);
  const [shortlet, setShortlet] = useState(false);
  const [selfCompound, setSelfCompound] = useState(false);
  const [sharedCompound, setSharedCompound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useToastError(error);

  const budgetLabel = useMemo(() => formatNaira(budget), [budget]);

  useEffect(() => {
    if (initialized) return;
    if (draft.landlordRequirements?.budgetRange?.max !== undefined) {
      setBudget(draft.landlordRequirements.budgetRange.max);
    }
    if (draft.landlordRequirements?.annualIncome?.min !== undefined) {
      setIncome(String(draft.landlordRequirements.annualIncome.min));
    }
    setPets(draft.landlordRequirements?.petsAllowed ?? true);
    setNonOwner(draft.landlordRequirements?.nonOwnerOccupied ?? false);
    setSharedApt(draft.landlordRequirements?.sharedApartment ?? false);
    setShortlet(draft.landlordRequirements?.shortlet ?? false);
    setSelfCompound(draft.landlordRequirements?.selfCompound ?? false);
    setSharedCompound(draft.landlordRequirements?.sharedCompound ?? false);
    setInitialized(true);
  }, [draft, initialized]);

  const handleSave = async (nextPath?: string) => {
    setIsSaving(true);
    setError(null);
    if (!authToken) {
      setError("Sign in to save your draft.");
      setIsSaving(false);
      return;
    }
    const incomeValue = income ? Number(income) : undefined;
    setLandlordDraft({
      landlordRequirements: {
        budgetRange: { max: budget },
        annualIncome: Number.isNaN(incomeValue)
          ? undefined
          : { min: incomeValue },
        petsAllowed: pets,
        nonOwnerOccupied: nonOwner,
        sharedApartment: sharedApt,
        shortlet,
        selfCompound,
        sharedCompound,
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

  const incomeSuggestions = [
    { label: "₦100k", value: "100000" },
    { label: "₦250k", value: "250000" },
    { label: "₦500k", value: "500000" },
    { label: "₦1m", value: "1000000" },
    { label: "₦2m", value: "2000000" },
    { label: "₦5m", value: "5000000" },
    { label: "₦10m", value: "10000000" },
    { label: "₦15m", value: "15000000" },
    { label: "₦20m", value: "20000000" },
  ];

  return (
    <div className="min-h-screen font-display  bg-white/95 text-[#1A1A1A] antialiased selection:bg-[#0a44b8]/30">
      <style>{`
        /* Slider track + thumb (pixel-ish) */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          background: #E7E5E4; /* stone-200 */
          border-radius: 999px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 999px;
          background-color: #0a44b8;
          cursor: pointer;
          margin-top: -8px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.12);
        }
        input[type="range"]::-moz-range-track {
          height: 8px;
          background: #E7E5E4;
          border-radius: 999px;
        }
        input[type="range"]::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 999px;
          background-color: #0a44b8;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.12);
        }
      `}</style>

      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto  bg-white/95 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-6 pb-2">
          <Link
            href="/add-property-details"
            aria-label="Go back"
            className="flex size-12 items-center justify-center rounded-full hover:bg-black/5 transition-colors text-[#1A1A1A]"
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={solidIconStyle}
            >
              arrow_back
            </span>
          </Link>

          <div className="text-[#1A1A1A] text-sm font-semibold tracking-wide uppercase opacity-70">
            STEP 3 OF 5
          </div>

          <div className="size-12" />
        </header>

        {/* Progress */}
        <div className="w-full px-6 py-2">
          <div className="flex w-full flex-row items-center justify-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/40"></div>
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/40"></div>
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]"></div>
            <div className="h-1.5 flex-1 rounded-full bg-gray-300"></div>
            <div className="h-1.5 flex-1 rounded-full bg-gray-300"></div>
          </div>

         
        </div>

        {/* Body */}
        <main className="flex-1 overflow-y-auto px-6 pb-32">
          <div className="pt-4 pb-8">
            <h1 className="text-[#0A2463] text-3xl font-extrabold leading-tight tracking-tight mb-3">
              The Ideal Match
            </h1>
            <p className="text-[#1A1A1A]/70 text-lg font-medium leading-relaxed">
              Set your hidden requirements to find the perfect tenant
              automatically.
            </p>
          </div>

          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            {/* Budget */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
              <div className="flex items-center justify-between mb-6">
                <label className="text-lg font-bold text-[#0A2463]" htmlFor="budget">
                  Budget
                </label>
                <span className="text-xl font-bold text-[#0a44b8] bg-[#0a44b8]/10 px-4 py-1.5 rounded-full">
                  {budgetLabel}
                </span>
              </div>

              <div className="relative w-full h-12 flex items-center">
                <input
                  id="budget"
                  type="range"
                  min={100000}
                  max={15000000}
                  step={50000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex justify-between text-sm font-medium text-stone-500 mt-1">
                <span>₦100k</span>
                <span>₦15m+</span>
              </div>
            </div>

            {/* Annual Income */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
              <label className="block text-lg font-bold text-[#0A2463] mb-3" htmlFor="income">
                Annual Income
              </label>

              <div className="relative flex items-center">
                <span className="absolute left-6 text-stone-500 text-xl font-bold">
                  ₦
                </span>
                <input
                  id="income"
                  type="text"
                  inputMode="numeric"
                  list="income-suggestions"
                  value={income}
                  onChange={(e) => setIncome(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="80,000"
                  className="w-full bg-white/95 text-[#1A1A1A] text-xl font-bold py-4 pl-12 pr-4 rounded-full border-2 border-transparent focus:border-[#0a44b8] focus:ring-0 transition-all placeholder:text-stone-400 outline-none"
                />
                <datalist id="income-suggestions">
                  {incomeSuggestions.map((suggestion) => (
                    <option key={suggestion.value} value={suggestion.value} label={suggestion.label} />
                  ))}
                </datalist>
              </div>

              <p className="text-stone-500 text-sm mt-3 font-medium">
                Recommended: 3x annual rent
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {incomeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.value}
                    type="button"
                    onClick={() => setIncome(suggestion.value)}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-[#0A2463] shadow-sm transition-colors hover:border-[#0a44b8] hover:text-[#0a44b8]"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles list */}
            <div className="space-y-4">
              <ToggleRow
                title="Pets Allowed"
                subtitle="Cats, dogs, etc."
                checked={pets}
                onChange={setPets}
              />
              <ToggleRow
                title="Non-owner-occupied"
                subtitle="Landlord lives off-site"
                checked={nonOwner}
                onChange={setNonOwner}
              />
              <ToggleRow
                title="Shared Apartment"
                subtitle="Unit shared with others"
                checked={sharedApt}
                onChange={setSharedApt}
              />
              <ToggleRow
                title="Shortlet"
                subtitle="Short-term stays allowed"
                checked={shortlet}
                onChange={setShortlet}
              />
              <ToggleRow
                title="Self Compound"
                subtitle="Private compound access"
                checked={selfCompound}
                onChange={setSelfCompound}
              />
              <ToggleRow
                title="Shared Compound"
                subtitle="Compound shared with others"
                checked={sharedCompound}
                onChange={setSharedCompound}
              />
            </div>
          </form>
        </main>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-10 p-6 pb-8 max-w-md mx-auto bg-gradient-to-t from-white/95 via-white/95 to-transparent">
          <button
            type="button"
            onClick={() => void handleSave("/add-property-preferences")}
            className="w-full bg-[#0a44b8] hover:bg-[#083691] text-white text-xl font-bold py-5 rounded-full shadow-lg shadow-[#0a44b8]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>{isSaving ? "Saving..." : "Next Step"}</span>
            <span
              className="material-symbols-outlined text-2xl"
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
    <div className="flex items-center justify-between bg-white px-6 py-5 rounded-xl shadow-sm border border-stone-200">
      <div className="flex flex-col">
        <span className="text-lg font-bold text-[#0A2463]">{title}</span>
        <span className="text-sm text-stone-500 font-medium">{subtitle}</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex items-center w-14 h-8 rounded-full transition-colors shadow-inner",
          checked ? "bg-[#0a44b8]" : "bg-stone-200",
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
