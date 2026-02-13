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

  const bedOptions = useMemo(() => [1, 2, 3, 4, 5], []);
  const bathOptions = useMemo(() => [1, 2, 3, 4], []);
  
  const amenityOptions = useMemo(() => [
    { label: "Local Laundry Service", icon: "local_laundry_service" },
    { label: "AC Unit", icon: "ac_unit" },
    { label: "Parking Space", icon: "directions_car" },
    { label: "Elevator", icon: "elevator" },
    { label: "Security", icon: "security" },
    { label: "Gym", icon: "fitness_center" },
    { label: "Pool", icon: "pool" },
    { label: "Generator", icon: "bolt" },
  ], []);

  // Sync Draft to Local State on mount
  useEffect(() => {
    if (initialized) return;

    if (draft.address?.street) setLocation(draft.address.street);
    if (draft.monthlyPrice) setRent(String(Math.round(draft.monthlyPrice * 12)));
    if (draft.propertyType) setPropertyType(draft.propertyType);
    if (draft.description) setDesc(draft.description);
    if (draft.address?.lat) setLat(String(draft.address.lat));
    if (draft.address?.lng) setLng(String(draft.address.lng));
    if (draft.bedCount !== undefined) setBeds(draft.bedCount);
    if (draft.bathCount !== undefined) setBaths(draft.bathCount);
    if (draft.sqFt) setSqft(String(draft.sqFt));
    if (draft.amenities) setAmenities(draft.amenities);
    if (draft.proofOfOwnership) setProofName("Document uploaded");

    setInitialized(true);
  }, [draft, initialized]);

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
      (err) => {
        setError(err.code === 1 ? "Please enable location permissions." : "Unable to access location.");
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

    const rentValue = parseFloat(rent);
    const monthlyPrice = !isNaN(rentValue) ? Math.round(rentValue / 12) : undefined;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const sqftNum = parseInt(sqft);

    // Update Store
    setLandlordDraft({
      monthlyPrice,
      propertyType: propertyType || undefined,
      description: desc || undefined,
      bedCount: beds ?? undefined,
      bathCount: baths ?? undefined,
      sqFt: isNaN(sqftNum) ? undefined : sqftNum,
      amenities: amenities.length ? amenities : undefined,
      address: {
        street: location || undefined,
        lat: isNaN(latNum) ? undefined : latNum,
        lng: isNaN(lngNum) ? undefined : lngNum,
      },
    });

    try {
      await saveLandlordDraft();
      if (nextPath) router.push(nextPath);
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
    try {
      const uploadedUrl = await uploadLandlordProof(file);
      if (!uploadedUrl) throw new Error("Upload failed.");
      setProofName(file.name);
      setLandlordDraft({ proofOfOwnership: uploadedUrl });
    } catch {
      setError("Proof upload failed. Please try again.");
    }
  };

  const toggleAmenity = (label: string) => {
    setAmenities((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleAddAmenity = () => {
    const trimmed = amenityInput.trim();
    if (!trimmed) return;
    if (!amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
    }
    setAmenityInput("");
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] font-sans antialiased selection:bg-[#0a44b8]/20">
      <style>{`
        .input-active-ring:focus-within {
          box-shadow: 0 0 0 2px #0a44b8;
          border-color: #0a44b8;
        }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>

      <div className="relative w-full max-w-md mx-auto">
        <header className="flex items-center justify-between p-4 sticky top-0 z-10 bg-white/80 backdrop-blur-md">
          <Link href="/add-property-photos" className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <span className="material-symbols-outlined text-2xl" style={solidIconStyle}>arrow_back</span>
          </Link>
          <h2 className="text-[#0a44b8] text-lg font-bold flex-1 text-center pr-10">Add Property</h2>
        </header>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className={`h-1.5 flex-1 rounded-full ${step < 2 ? 'bg-[#0a44b8]/40' : step === 2 ? 'bg-[#0a44b8]' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-center text-[10px] font-bold text-gray-400 mt-2 tracking-widest uppercase">Step 2 of 5</p>
        </div>

        <main className="px-5 pb-40">
          <h1 className="text-[#0a44b8] text-3xl font-extrabold tracking-tight pt-4 pb-6">Tell us about your place</h1>

          <form className="flex flex-col gap-8" onSubmit={(e) => e.preventDefault()}>
            
            {/* Location Section */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">Location</label>
              <div className="group relative flex items-center input-active-ring rounded-2xl bg-gray-50 border border-gray-200 transition-all">
                <span className="pl-4 pr-2 text-[#0a44b8] material-symbols-outlined text-2xl" style={solidIconStyle}>location_on</span>
                <input
                  type="text"
                  placeholder="Street address, City"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent py-4 pr-4 outline-none text-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="group relative flex items-center input-active-ring rounded-2xl bg-gray-50 border border-gray-200">
                  <span className="pl-4 pr-2 text-[#0a44b8]/50 material-symbols-outlined text-xl">north</span>
                  <input
                    type="number"
                    placeholder="Lat"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-transparent py-3 pr-4 outline-none text-sm"
                  />
                </div>
                <div className="group relative flex items-center input-active-ring rounded-2xl bg-gray-50 border border-gray-200">
                  <span className="pl-4 pr-2 text-[#0a44b8]/50 material-symbols-outlined text-xl">east</span>
                  <input
                    type="number"
                    placeholder="Lng"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full bg-transparent py-3 pr-4 outline-none text-sm"
                  />
                </div>
              </div>
              <button type="button" onClick={handleUseLocation} className="text-sm font-bold text-[#0a44b8] hover:underline flex items-center gap-1 ml-1">
                <span className="material-symbols-outlined text-sm">my_location</span> Use current location
              </button>
            </div>

            {/* Rent Section */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">Annual Rent</label>
              <div className="group relative flex items-center input-active-ring rounded-2xl bg-gray-50 border border-gray-200">
                <span className="pl-5 pr-2 text-xl font-black text-[#0a44b8]">₦</span>
                <input
                  type="number"
                  placeholder="Total price per year"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className="w-full bg-transparent py-4 pr-4 outline-none text-xl font-bold"
                />
              </div>
            </div>

            {/* Property Type */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">Property Type</label>
              <div className="relative input-active-ring rounded-2xl bg-gray-50 border border-gray-200">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-transparent py-4 px-5 outline-none text-lg font-medium cursor-pointer"
                >
                  <option value="" disabled>Select Type</option>
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none text-gray-400">expand_more</span>
              </div>
            </div>

            {/* Specs (Beds/Baths) */}
            <div className="flex flex-col gap-6">
              {[
                { label: "Beds", options: bedOptions, val: beds, setter: setBeds },
                { label: "Baths", options: bathOptions, val: baths, setter: setBaths },
              ].map((spec) => (
                <div key={spec.label} className="flex flex-col gap-3">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">{spec.label}</label>
                  <div className="flex flex-wrap gap-2">
                    {spec.options.map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => spec.setter(num)}
                        className={`min-w-[50px] py-3 px-4 rounded-xl font-bold border transition-all ${
                          spec.val === num ? "bg-[#0a44b8] border-[#0a44b8] text-white" : "bg-white border-gray-200"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <input
                      type="number"
                      placeholder="Custom"
                      className="w-24 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#0a44b8]"
                      value={spec.options.includes(spec.val as number) ? "" : (spec.val ?? "")}
                      onChange={(e) => spec.setter(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Amenities */}
            <div className="flex flex-col gap-4">
              <label className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">Amenities</label>
              <div className="grid grid-cols-2 gap-2">
                {amenityOptions.map((amn) => (
                  <button
                    key={amn.label}
                    type="button"
                    onClick={() => toggleAmenity(amn.label)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                      amenities.includes(amn.label) ? "bg-[#EAF1FF] border-[#0a44b8] text-[#0a44b8]" : "bg-white border-gray-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{amn.icon}</span>
                    {amn.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add other (e.g. Borehole)"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAmenity())}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#0a44b8]"
                />
                <button type="button" onClick={handleAddAmenity} className="bg-gray-100 px-4 rounded-xl font-bold text-sm">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {amenities.map(a => (
                   <span key={a} className="bg-[#0a44b8] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                     {a} <button onClick={() => toggleAmenity(a)}>×</button>
                   </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">Description</label>
              <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-1">
                <textarea
                  rows={4}
                  placeholder="Tell us what makes this place special..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value.slice(0, 500))}
                  className="w-full bg-transparent p-4 outline-none resize-none text-lg"
                />
                <div className="text-[10px] text-right p-2 font-bold text-gray-400">{desc.length}/500</div>
              </div>
            </div>

            {/* Proof Upload */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-1">Verify Ownership (Optional)</label>
              <div className="relative h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleProofUpload(e.target.files?.[0] ?? null)}
                />
                <span className="material-symbols-outlined text-3xl text-[#0a44b8] mb-1">upload_file</span>
                <p className="text-sm font-bold">{proofName || "Upload Proof"}</p>
                <p className="text-[10px] text-gray-400">PDF or Images accepted</p>
              </div>
            </div>
          </form>
        </main>

        {/* Footer CTA */}
        <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-lg border-t border-gray-100 p-4 pb-10 z-30">
          {error && <p className="text-center text-red-500 text-xs font-bold mb-3">{error}</p>}
          <button
            onClick={() => handleSave("/add-property-requirements")}
            disabled={isSaving}
            className="w-full bg-[#0a44b8] text-white py-4 rounded-2xl text-lg font-black shadow-xl shadow-[#0a44b8]/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Next Step"}
          </button>
        </footer>
      </div>
    </div>
  );
}
