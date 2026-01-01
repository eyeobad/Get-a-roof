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
      <div className="flex flex-col items-center justify-center p-6 gap-2 animate-enter z-10">
        <div className="relative flex items-center justify-center mb-6 mt-20">
          <svg
            className="text-[#0a44b8]"
            fill="none"
            height={200}
            viewBox="0 0 24 24"
            width={200}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 3L2 12H5L12 5.66L19 12H22L12 3Z"
              fill="currentColor"
            ></path>
            <path
              d="M17 6V9.33L19 11.13V6H17Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <div className="flex flex-col items-center gap-1 -mt-2">
          <h1 className="text-[#0a44b8] tracking-tight text-[32px] md:text-[36px] font-bold leading-tight text-center">
            Get a Roof
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">
            THE REAL ESTATE APP
          </p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f9f8fc] to-transparent pointer-events-none opacity-50" />
    </div>
  );
}
