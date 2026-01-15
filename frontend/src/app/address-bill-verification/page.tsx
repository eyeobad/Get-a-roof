"use client";

import { useRouter } from "next/navigation";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

export default function AddressBillVerificationPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-display antialiased text-[#131118]">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto flex-col overflow-hidden bg-[#FDFBF7]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#FDFBF7]/95 backdrop-blur-sm px-5 py-4 flex items-center gap-4">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 transition-colors hover:bg-gray-50"
          >
            <span
              className="material-symbols-outlined text-[#131118]"
              style={{ ...solidIconStyle, fontSize: 28 }}
            >
              arrow_back
            </span>
          </button>

          <div className="flex-1 text-center pr-12">
            <span className="text-sm font-semibold text-[#0a44b8] uppercase tracking-wider">
              Step 2 of 3
            </span>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 flex flex-col px-5 pb-40 overflow-y-auto">
          <div className="py-4">
            <h1 className="text-[28px] leading-[2.125rem] font-bold text-[#131118] mb-3">
              Enter Your Address &amp; Upload Bill
            </h1>
            <p className="text-[18px] leading-7 text-[#4A4553]">
              We need this to verify you are the property owner. Your information
              is kept private.
            </p>
          </div>

          <div className="flex flex-col gap-5 mt-4">
            {/* Street Address */}
            <div className="flex flex-col gap-2">
              <label className="text-[18px] leading-7 font-semibold" htmlFor="street">
                Street Address
              </label>
              <div className="relative">
                <input
                  id="street"
                  type="text"
                  placeholder="e.g. 123 Maple Avenue"
                  className="w-full h-14 rounded-xl border border-gray-300 bg-white px-4 py-4 text-[18px] leading-7 text-[#131118] placeholder:text-gray-400 focus:border-[#0a44b8] focus:ring-[#0a44b8] transition-all shadow-sm pr-12"
                />
                <span
                  className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  style={{ ...solidIconStyle, fontSize: 24 }}
                >
                  home
                </span>
              </div>
            </div>

            {/* City */}
            <div className="flex flex-col gap-2">
              <label className="text-[18px] leading-7 font-semibold" htmlFor="city">
                City
              </label>
              <input
                id="city"
                type="text"
                placeholder="e.g. Springfield"
                className="w-full h-14 rounded-xl border border-gray-300 bg-white px-4 py-4 text-[18px] leading-7 text-[#131118] placeholder:text-gray-400 focus:border-[#0a44b8] focus:ring-[#0a44b8] transition-all shadow-sm"
              />
            </div>

            {/* State + Zip */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[18px] leading-7 font-semibold" htmlFor="state">
                  State
                </label>
                <div className="relative">
                  <select
                    id="state"
                    className="w-full h-14 appearance-none rounded-xl border border-gray-300 bg-white px-4 py-4 text-[18px] leading-7 text-[#131118] focus:border-[#0a44b8] focus:ring-[#0a44b8] transition-all shadow-sm pr-10"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="CA">CA</option>
                    <option value="NY">NY</option>
                    <option value="TX">TX</option>
                    <option value="FL">FL</option>
                  </select>

                  <span
                    className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    style={solidIconStyle}
                  >
                    expand_more
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[18px] leading-7 font-semibold" htmlFor="zip">
                  Zip Code
                </label>
                <input
                  id="zip"
                  inputMode="numeric"
                  placeholder="12345"
                  className="w-full h-14 rounded-xl border border-gray-300 bg-white px-4 py-4 text-[18px] leading-7 text-[#131118] placeholder:text-gray-400 focus:border-[#0a44b8] focus:ring-[#0a44b8] transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Proof of Residence */}
          <div className="mt-8 mb-4">
            <h2 className="text-xl font-bold mb-3">Proof of Residence</h2>

            <div className="relative group cursor-pointer">
              <input
                aria-label="Upload utility bill"
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
              />

              <div className="w-full bg-white border-2 border-dashed border-[#0a44b8]/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group-hover:border-[#0a44b8] group-hover:bg-[#0a44b8]/5 shadow-sm min-h-[180px]">
                <div className="size-16 rounded-full bg-[#0a44b8]/10 flex items-center justify-center mb-4">
                  <span
                    className="material-symbols-outlined text-[#0a44b8]"
                    style={{ ...solidIconStyle, fontSize: 32 }}
                  >
                    cloud_upload
                  </span>
                </div>

                <p className="text-lg font-semibold mb-1">Upload Utility Bill</p>
                <p className="text-base text-[#4A4553] max-w-[240px]">
                  Photo of a recent water, electric, or gas bill.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom fixed bar */}
        <div className="absolute bottom-0 left-0 w-full bg-[#FDFBF7] pt-4 pb-8 px-5 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] border-t border-black/5">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-80">
            <span
              className="material-symbols-outlined text-green-600"
              style={{ ...solidIconStyle, fontSize: 20 }}
            >
              lock
            </span>
            <span className="text-sm font-medium text-[#4A4553]">
              Your data is encrypted and secure
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/facial-verification")}
            className="w-full bg-[#0a44b8] hover:bg-[#0a44b8]/90 text-white font-bold text-xl h-16 rounded-full shadow-lg shadow-[#0a44b8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <span>Submit for Verification</span>
            <span
              className="material-symbols-outlined"
              style={{ ...solidIconStyle, fontSize: 24 }}
            >
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
