"use client";

import { useRouter } from "next/navigation";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

export default function FacialVerificationPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col text-[#1A1A1A] font-display antialiased">
      {/* Local styles for scan animation */}
      <style>{`
        .scan-line {
          animation: scan 3s infinite linear;
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <header className="px-6 pt-6 pb-2">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/50 text-[#1A1A1A] hover:bg-gray-200 transition-colors"
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={solidIconStyle}
            >
              arrow_back
            </span>
          </button>

          <div className="flex items-center gap-2 text-[#0a44b8]/80">
            <span
              className="material-symbols-outlined text-sm"
              style={solidIconStyle}
            >
              lock
            </span>
            <span className="text-sm font-medium tracking-wide uppercase">
              Secure
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6 pt-4 pb-8 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <span className="block text-[#0a44b8] font-bold tracking-wider text-sm uppercase mb-2">
            Step 3 of 3
          </span>

          <h1 className="text-[28px] font-bold leading-tight mb-3">
            Verify Your Identity
          </h1>

          <p className="text-[18px] leading-relaxed font-normal text-[#1A1A1A]/80">
            This helps us keep our community safe and trusted.
          </p>
        </div>

        {/* Camera circle */}
        <div className="relative w-full max-w-[320px] aspect-square mb-8">
          <div className="absolute inset-0 rounded-full border-[6px] border-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden bg-gray-200 relative">
            <img
              alt="Portrait placeholder"
              className="w-full h-full object-cover opacity-80 mix-blend-overlay"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4_cyJPu5A_OmrpxOths6GNH4e2tbp7rvWy2FK54vsJbxN7C17PyF_d_CXgPWWO1HTPCEjak-PePDCxThiKgFwy2iBCEqXHBsSALKKJwjII2zzPZGuc7ISfV-t7ehgI4BAVZtiqFA3g7cnbnNOXeqWB7TF5ipaDq8HmJ8cAB0T-ykw4f7SErHpSrCW0TvuLtQOFN9EIwdNZ4bgUKA5FjxMr4yHxxNdWwl8G05NNgvWQffnrPz2f5RKJ_5jPsvMhCZIy6d9U7cGfj9b"
            />

            {/* Face guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] h-[75%] border-2 border-dashed border-white/70 rounded-[45%]" />
            </div>

            {/* Scan line */}
            <div className="absolute left-0 right-0 h-1 bg-[#0a44b8]/50 shadow-[0_0_15px_rgba(10,68,184,0.6)] scan-line pointer-events-none" />

            {/* Live camera chip */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white text-xs font-medium tracking-wide">
                Live Camera
              </span>
            </div>
          </div>

          {/* Outer pulse ring */}
          <div className="absolute -inset-4 rounded-full border-2 border-[#0a44b8]/20 animate-pulse" />
        </div>

        {/* Instructions */}
        <div className="text-center mb-auto">
          <h2 className="text-[#0a44b8] text-xl font-bold mb-2">
            Center your face
          </h2>
          <p className="text-base text-[#1A1A1A]/70">
            Make sure your face is well-lit and not covered by accessories.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 pt-0 w-full max-w-md mx-auto">
        <button className="w-full bg-[#0a44b8] hover:bg-[#0a44b8]/90 active:scale-[0.98] transition-all text-white h-16 rounded-full shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 mb-6">
          <span
            className="material-symbols-outlined text-[28px]"
            style={solidIconStyle}
          >
            photo_camera
          </span>
          <span className="text-[20px] font-bold tracking-wide">
            Start Verification
          </span>
        </button>

        <button className="w-full text-center" type="button">
          <span className="text-[#0a44b8] text-base font-medium underline underline-offset-4 decoration-[#0a44b8]/30">
            Having trouble? Contact Support
          </span>
        </button>
      </footer>
    </div>
  );
}
