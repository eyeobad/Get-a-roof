"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

export default function AddPropertyDetailsPage() {
  const [desc, setDesc] = useState("");

  const count = useMemo(() => desc.length, [desc]);

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
                  className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] placeholder:text-gray-400 text-lg py-4 pr-6 rounded-r-full outline-none"
                />
              </div>
            </div>

            {/* Rent */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold pl-1" htmlFor="rent">
                Monthly Rent
              </label>

              <div className="group relative flex items-center w-full input-active-ring rounded-full bg-white border border-[#0A1F33]/20 transition-all duration-200">
                <div className="pl-4 pr-1 text-[#0a44b8] flex items-center justify-center pointer-events-none">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={solidIconStyle}
                  >
                    attach_money
                  </span>
                </div>

                <input
                  id="rent"
                  inputMode="numeric"
                  placeholder="0"
                  type="number"
                  className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] placeholder:text-gray-400 text-lg py-4 pr-6 rounded-r-full outline-none"
                />
              </div>

              <p className="text-sm text-gray-500 pl-4">
                Suggested: $1,200 based on area
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
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select property type
                  </option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="other">Other</option>
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
                    Upload document
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
          <Link
            href="/add-property-requirements"
            className="w-full bg-[#0a44b8] hover:bg-[#083691] active:scale-[0.98] transition-all text-white text-xl font-bold py-4 rounded-full shadow-lg shadow-[#0a44b8]/20 flex items-center justify-center gap-2 group"
          >
            <span>Next Step</span>
            <span
              className="material-symbols-outlined group-hover:translate-x-1 transition-transform"
              style={solidIconStyle}
            >
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
