"use client";

import { useRouter } from "next/navigation";

const tips = [
  { icon: "crop_free", text: "Make sure your ID is on a flat surface." },
  { icon: "wb_sunny", text: "Avoid glare from overhead lights." },
];

export default function VerificationFailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900 overflow-x-hidden">
      <div className="mx-auto w-full max-w-md px-6 pt-14 pb-10 flex min-h-screen flex-col">
        {/* Hero Icon */}
        <div className="flex justify-center pt-2">
          <div className="relative flex items-center justify-center">
            {/* outer halo ring */}
            <div className="absolute h-44 w-44 rounded-full border border-red-200/80" />
            {/* inner soft circle */}
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-red-500/10">
              <span
                className="material-symbols-outlined text-red-600"
                style={{
                  fontSize: 64,
                  fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48",
                }}
              >
                gpp_bad
              </span>
            </div>
          </div>
        </div>

        {/* Title + subtitle */}
        <div className="mt-8 text-center">
          <h1 className="text-[34px] font-extrabold tracking-tight leading-tight">
            Verification Failed
          </h1>
          <p className="mt-3 text-lg font-medium text-slate-600 leading-relaxed">
            We were unable to verify your identity documents.
          </p>
        </div>

        {/* Reason card */}
        <div className="mt-8">
          <div className="rounded-3xl border border-red-200/80 bg-white/40 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-red-600"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold">Reason:</p>
                <p className="mt-1 text-lg text-slate-700">
                  The image provided was too blurry.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-10">
          <h2 className="text-xl font-extrabold">Tips for next time</h2>

          <div className="mt-4 flex flex-col gap-4">
            {tips.map((tip) => (
              <div
                key={tip.icon}
                className="flex items-start gap-4 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm"
              >
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                  <span className="material-symbols-outlined text-slate-700">
                    {tip.icon}
                  </span>
                </div>
                <p className="text-lg font-medium text-slate-700 leading-snug">
                  {tip.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="pt-10">
          <button
            onClick={() => router.push("/auth/verification-pending")}
            className="flex h-14 w-full items-center justify-center rounded-full bg-primary text-white text-lg font-extrabold shadow-lg shadow-primary/20 transition active:scale-[0.98]"
          >
            Retry Verification
          </button>

          <button
            onClick={() => router.push("/support")}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full text-primary text-lg font-bold hover:bg-black/5 transition"
          >
            Need help? Contact Support
          </button>
        </div>
      </div>

      <style jsx global>{`
        /* Hide scrollbar (match the clean look) */
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
