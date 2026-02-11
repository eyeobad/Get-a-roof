"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { PROPERTY_TYPE_OPTIONS } from "@/lib/propertyTypes";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

export default function AddPropertyDetailsPage() {
  const router = useRouter();
  const authToken = useAppStore((state) => state.authToken);
  const draft = useAppStore((state) => state.landlordDraft);
  const setLandlordDraft = useAppStore((state) => state.setLandlordDraft);
  const saveLandlordDraft = useAppStore((state) => state.saveLandlordDraft);
  const uploadLandlordProof = useAppStore((state) => state.uploadLandlordProof);
  const [initialized, setInitialized] = useState(false);
  const [location, setLocation] = useState("");
  const [rent, setRent] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [desc, setDesc] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [beds, setBeds] = useState<number | null>(null);
  const [baths, setBaths] = useState<number | null>(null);
  const [sqft, setSqft] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [amenityInput, setAmenityInput] = useState("");
  const [proofName, setProofName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = useMemo(() => desc.length, [desc]);
  const bedOptions = useMemo(() => [1, 2, 3, 4, 5], []);
  const bathOptions = useMemo(() => [1, 2, 3, 4], []);
  const sqftOptions = useMemo(() => [500, 750, 1000, 1500, 2000], []);
  const amenityOptions = useMemo(
    () => [
      { label: "Local Laundry Service", icon: "local_laundry_service" },
      { label: "AC Unit", icon: "ac_unit" },
      { label: "Directions Car", icon: "directions_car" },
      { label: "Elevator", icon: "elevator" },
      { label: "Security", icon: "security" },
      { label: "Gym", icon: "fitness_center" },
      { label: "Pool", icon: "pool" },
      { label: "Generator", icon: "bolt" },
    ],
    []
  );
  const propertyTypeLookup = useMemo(
    () =>
      new Map(
        PROPERTY_TYPE_OPTIONS.map((option) => [
          option.value.toLowerCase().replace(/[\s_-]/g, ""),
          option.value,
        ])
      ),
    []
  );

  useEffect(() => {
    if (initialized) return;
    setLocation(draft.address?.street ?? "");
    setRent(
      draft.monthlyPrice !== undefined
        ? String(Math.round(draft.monthlyPrice * 12))
        : ""
    );
    const rawType = draft.propertyType ?? "";
    const normalizedType = rawType
      ? rawType.toLowerCase().replace(/[\s_-]/g, "")
      : "";
    if (!rawType) {
      setPropertyType("");
    } else {
      setPropertyType(propertyTypeLookup.get(normalizedType) ?? "other");
    }
    setDesc(draft.description ?? "");
    setLat(
      draft.address?.lat !== undefined ? String(draft.address.lat) : ""
    );
    setLng(
      draft.address?.lng !== undefined ? String(draft.address.lng) : ""
    );
    setBeds(draft.bedCount ?? null);
    setBaths(draft.bathCount ?? null);
    setSqft(draft.sqFt !== undefined ? String(draft.sqFt) : "");
    setAmenities(draft.amenities ?? []);
    if (draft.proofOfOwnership) {
      setProofName("Document uploaded");
    }
    setInitialized(true);
  }, [draft, initialized, propertyTypeLookup]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
      },
      () => {
        setError("Unable to access your location.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSave = async (nextPath?: string) => {
    setIsSaving(true);
    setError(null);
    if (!authToken) {
      setError("Sign in to save your draft.");
      setIsSaving(false);
      return;
    }
    const rentValue = rent ? Number(rent) : undefined;
    const latValue = lat ? Number(lat) : undefined;
    const lngValue = lng ? Number(lng) : undefined;
    const sqftValue = sqft ? Number(sqft) : undefined;

    const monthlyPrice =
      typeof rentValue === "number" && !Number.isNaN(rentValue)
        ? Math.round(rentValue / 12)
        : undefined;

    setLandlordDraft({
      monthlyPrice,
      propertyType: propertyType || undefined,
      description: desc || undefined,
      bedCount: beds ?? undefined,
      bathCount: baths ?? undefined,
      sqFt: Number.isNaN(sqftValue) ? undefined : sqftValue,
      amenities: amenities.length ? amenities : undefined,
      address: {
        street: location || undefined,
        lat: Number.isNaN(latValue) ? undefined : latValue,
        lng: Number.isNaN(lngValue) ? undefined : lngValue,
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

  const handleProofUpload = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!authToken) {
      setError("Sign in to upload proof documents.");
      return;
    }
    const uploadedUrl = await uploadLandlordProof(file.name);
    if (!uploadedUrl) {
      setError("Proof upload failed. Please try again.");
      return;
    }
    setProofName(file.name);
    setLandlordDraft({ proofOfOwnership: uploadedUrl });
  };

  const toggleAmenity = (label: string) => {
    setAmenities((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleAddAmenity = () => {
    const trimmed = amenityInput.trim();
    if (!trimmed) return;
    setAmenities((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setAmenityInput("");
  };

  return (
    <div className="min-h-screen bg-white/95  text-[#1A1A1A] font-display antialiased overflow-x-hidden selection:bg-[#0a44b8]/30">
      <style>{`
        .input-active-ring:focus-within {
          box-shadow: 0 0 0 2px #0a44b8;
          border-color: #0a44b8;
        }
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: none;
        }
      `}</style>

      <div className="relative w-full max-w-md mx-auto ">
        {/* Header */}
        <header className="flex items-center justify-between p-4 pb-2 sticky top-0 z-10 ">
          <Link
            href="/add-property-photos"
            aria-label="Go back"
            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={solidIconStyle}
            >
              arrow_back
            </span>
          </Link>

          <h2 className="text-[#0a44b8] text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
            Add Property
          </h2>
        </header>

        {/* Progress */}
        <div className="w-full px-6 py-2">
          <div className="flex w-full flex-row items-center justify-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/40"></div>
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]"></div>
            <div className="h-1.5 flex-1 rounded-full bg-gray-300"></div>
            <div className="h-1.5 flex-1 rounded-full bg-gray-300"></div>
            <div className="h-1.5 flex-1 rounded-full bg-gray-300"></div>
          </div>

          <p className="text-center text-xs font-medium text-gray-500 mt-2 uppercase">
            STEP 2 OF 5
          </p>
        </div>

        {/* Content */}
        <main className="flex-1 flex flex-col px-5 pb-32 w-full">
          <h1 className="text-[#0a44b8] text-[28px] font-bold leading-tight pt-4 pb-6">
            Tell us about your place
          </h1>

          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            {/* Location */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold pl-1" htmlFor="location">
                Where is it located?
              </label>

              <div className="group relative flex items-center w-full input-active-ring rounded-full bg-white border border-[#0A1F33]/20 transition-all duration-200">
                <div className="pl-4 pr-2 text-[#0a44b8] flex items-center justify-center pointer-events-none">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={solidIconStyle}
                  >
                    location_on
                  </span>
                </div>

                <input
                  id="location"
                  type="text"
                  placeholder="123 Main St, Springfield"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] placeholder:text-gray-400 text-lg py-4 pr-6 rounded-r-full outline-none"
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold pl-1" htmlFor="lat">
                Pin Location (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="group relative flex items-center w-full input-active-ring rounded-full bg-white border border-[#0A1F33]/20 transition-all duration-200">
                  <div className="pl-4 pr-2 text-[#0a44b8] flex items-center justify-center pointer-events-none">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={solidIconStyle}
                    >
                      north
                    </span>
                  </div>
                  <input
                    id="lat"
                    type="text"
                    inputMode="decimal"
                    placeholder="Latitude"
                    value={lat}
                    onChange={(event) => setLat(event.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] placeholder:text-gray-400 text-lg py-4 pr-6 rounded-r-full outline-none"
                  />
                </div>
                <div className="group relative flex items-center w-full input-active-ring rounded-full bg-white border border-[#0A1F33]/20 transition-all duration-200">
                  <div className="pl-4 pr-2 text-[#0a44b8] flex items-center justify-center pointer-events-none">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={solidIconStyle}
                    >
                      east
                    </span>
                  </div>
                  <input
                    id="lng"
                    type="text"
                    inputMode="decimal"
                    placeholder="Longitude"
                    value={lng}
                    onChange={(event) => setLng(event.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] placeholder:text-gray-400 text-lg py-4 pr-6 rounded-r-full outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseLocation}
                className="self-start text-sm font-semibold text-[#0a44b8] hover:opacity-80"
              >
                Use my current location
              </button>
            </div>

            {/* Rent */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold pl-1" htmlFor="rent">
                Annual Rent
              </label>

              <div className="group relative flex items-center w-full input-active-ring rounded-full bg-white border border-[#0A1F33]/20 transition-all duration-200">
                <div className="pl-4 pr-1 text-[#0a44b8] flex items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold">₦</span>
                </div>

                <input
                  id="rent"
                  inputMode="numeric"
                  placeholder="0"
                  type="number"
                  value={rent}
                  onChange={(event) => setRent(event.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] placeholder:text-gray-400 text-lg py-4 pr-6 rounded-r-full outline-none"
                />
              </div>

              <p className="text-sm text-gray-500 pl-4">
                Suggested: ₦1,200,000 per year based on area
              </p>
            </div>

            {/* Property Type */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold pl-1" htmlFor="property-type">
                Type of Property
              </label>

              <div className="group relative flex items-center w-full input-active-ring rounded-full bg-white border border-[#0A1F33]/20 transition-all duration-200">
                <div className="pl-4 pr-2 text-[#0a44b8] flex items-center justify-center pointer-events-none">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={solidIconStyle}
                  >
                    home_work
                  </span>
                </div>

                <select
                  id="property-type"
                  className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] text-lg py-4 pr-10 rounded-r-full cursor-pointer outline-none"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value)}
                >
                  <option value="" disabled>
                    Select property type
                  </option>
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#0a44b8]">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={solidIconStyle}
                  >
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Property Specs */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-base font-semibold pl-1">Beds</label>
                <div className="flex flex-wrap gap-3">
                  {bedOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBeds(value)}
                      className={[
                        "rounded-full px-5 py-3 text-[14px] font-medium transition-all shadow-sm border",
                        beds === value
                          ? "border-[#0a44b8] bg-[#EAF1FF] text-[#0a44b8]"
                          : "border-black/10 text-[#1A1A1A] hover:border-[#0a44b8]/40 active:bg-black/5",
                      ].join(" ")}
                    >
                      {value}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    placeholder="Custom"
                    value={beds ?? ""}
                    onChange={(event) =>
                      setBeds(event.target.value ? Number(event.target.value) : null)
                    }
                    className="w-28 rounded-full border border-black/10 bg-white px-4 py-3 text-[14px] text-[#1A1A1A] outline-none focus:border-[#0a44b8]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-base font-semibold pl-1">Baths</label>
                <div className="flex flex-wrap gap-3">
                  {bathOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBaths(value)}
                      className={[
                        "rounded-full px-5 py-3 text-[14px] font-medium transition-all shadow-sm border",
                        baths === value
                          ? "border-[#0a44b8] bg-[#EAF1FF] text-[#0a44b8]"
                          : "border-black/10 text-[#1A1A1A] hover:border-[#0a44b8]/40 active:bg-black/5",
                      ].join(" ")}
                    >
                      {value}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    placeholder="Custom"
                    value={baths ?? ""}
                    onChange={(event) =>
                      setBaths(event.target.value ? Number(event.target.value) : null)
                    }
                    className="w-28 rounded-full border border-black/10 bg-white px-4 py-3 text-[14px] text-[#1A1A1A] outline-none focus:border-[#0a44b8]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-base font-semibold pl-1">Square Footage</label>
                <div className="flex flex-wrap gap-3">
                  {sqftOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSqft(String(value))}
                      className={[
                        "rounded-full px-5 py-3 text-[14px] font-medium transition-all shadow-sm border",
                        sqft === String(value)
                          ? "border-[#0a44b8] bg-[#EAF1FF] text-[#0a44b8]"
                          : "border-black/10 text-[#1A1A1A] hover:border-[#0a44b8]/40 active:bg-black/5",
                      ].join(" ")}
                    >
                      {value.toLocaleString()} sqft
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    placeholder="Custom"
                    value={sqft}
                    onChange={(event) => setSqft(event.target.value)}
                    className="w-32 rounded-full border border-black/10 bg-white px-4 py-3 text-[14px] text-[#1A1A1A] outline-none focus:border-[#0a44b8]"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-col gap-3">
              <label className="text-base font-semibold pl-1">Amenities</label>
              <div className="grid grid-cols-2 gap-3">
                {amenityOptions.map((amenity) => {
                  const selected = amenities.includes(amenity.label);
                  return (
                    <button
                      key={amenity.label}
                      type="button"
                      onClick={() => toggleAmenity(amenity.label)}
                      className={[
                        "flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all",
                        selected
                          ? "border-[#0a44b8] bg-[#EAF1FF] text-[#0a44b8]"
                          : "border-black/10 text-[#1A1A1A] hover:border-[#0a44b8]/40 active:bg-black/5",
                      ].join(" ")}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {amenity.icon}
                      </span>
                      <span>{amenity.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Add custom amenity"
                  value={amenityInput}
                  onChange={(event) => setAmenityInput(event.target.value)}
                  className="flex-1 rounded-full border border-black/10 bg-white px-4 py-3 text-[14px] text-[#1A1A1A] outline-none focus:border-[#0a44b8]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddAmenity();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="rounded-full bg-[#0a44b8] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Add
                </button>
              </div>

              {amenities.length ? (
                <div className="flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className="rounded-full border border-[#0a44b8]/20 bg-[#EAF1FF] px-4 py-2 text-xs font-semibold text-[#0a44b8]"
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold pl-1" htmlFor="description">
                Description
              </label>

              <div className="relative w-full input-active-ring rounded-3xl bg-white border border-[#0A1F33]/20 transition-all duration-200 p-1">
                <textarea
                  id="description"
                  placeholder="A cozy 2-bedroom apartment with a renovated kitchen and lots of natural light..."
                  rows={5}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] placeholder:text-gray-400 text-lg p-4 rounded-3xl resize-none outline-none"
                />

                <div className="absolute bottom-4 right-5 text-xs text-gray-400 bg-white pl-2 rounded-lg">
                  {Math.min(count, 500)}/500
                </div>
              </div>

              <p className="text-sm text-gray-500 pl-4">
                Mention sunlight, amenities, or nearby parks.
              </p>
            </div>

            {/* Proof upload */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold pl-1" htmlFor="proof-upload">
                Proof of Ownership (Optional)
              </label>

              <div className="group relative w-full input-active-ring rounded-3xl bg-white border border-[#0A1F33]/20 transition-all duration-200 hover:border-[#0a44b8]/50">
                <input
                  id="proof-upload"
                  accept="image/*,.pdf"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void handleProofUpload(file);
                  }}
                />

                <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                  <div className="mb-3 p-3 rounded-full bg-blue-50 text-[#0a44b8] group-hover:scale-105 transition-transform duration-200">
                    <span
                      className="material-symbols-outlined text-3xl"
                      style={solidIconStyle}
                    >
                      add_a_photo
                    </span>
                  </div>

                  <p className="text-[#1A1A1A] font-medium text-lg">
                    {proofName || "Upload document"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 max-w-[200px]">
                    Utility bill, deed, or tax record
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500 pl-4">
                Verified owners get 3x more inquiries.
              </p>
            </div>
          </form>
        </main>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 bg-[#f8f6f6]/95 backdrop-blur-sm border-t border-gray-200 p-4 pb-8 z-20">
          <button
            type="button"
            onClick={() => void handleSave("/add-property-requirements")}
            className="w-full bg-[#0a44b8] hover:bg-[#083691] active:scale-[0.98] transition-all text-white text-xl font-bold py-4 rounded-full shadow-lg shadow-[#0a44b8]/20 flex items-center justify-center gap-2 group"
          >
            <span>{isSaving ? "Saving..." : "Next Step"}</span>
            <span
              className="material-symbols-outlined group-hover:translate-x-1 transition-transform"
              style={solidIconStyle}
            >
              arrow_forward
            </span>
          </button>
          {error ? (
            <p className="text-sm text-red-600 font-medium mt-3">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
