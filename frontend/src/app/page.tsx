"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="bg-white min-h-screen w-full flex flex-col items-center justify-center overflow-hidden antialiased font-display relative">
      <div className="flex flex-col items-center justify-center p-6 gap-2 animate-enter z-10 text-center">
        <div className="flex flex-col gap-3 -mt-2">
          <h1 className="text-[#0a44b8] tracking-tight text-[32px] md:text-[36px] font-bold leading-tight">
            Get a Roof
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">
            THE REAL ESTATE APP
          </p>
        </div>
        <button
          type="button"
          className="mt-8 flex items-center gap-3 rounded-full bg-black text-white px-6 py-3 text-sm font-semibold uppercase tracking-widest shadow-lg hover:bg-[#101010] transition"
        >
          <span className="material-symbols-outlined text-[18px]">music_note</span>
          Follow us on TikTok
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f9f8fc] to-transparent pointer-events-none opacity-50" />
    </div>
  );
}
