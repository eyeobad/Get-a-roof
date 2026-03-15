"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToastError } from "@/hooks/useToastError";
import { markTutorialFlow } from "@/lib/tutorialFlow";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

export default function FacialVerificationPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<"idle" | "checking" | "matched" | "failed">("idle");
  useToastError(permissionError);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((error) => {
        console.error("camera error", error);
        setPermissionError(
          "We couldn’t access your camera. Please allow access or try another device."
        );
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toDataURL("image/jpeg");
    setMatchState("checking");
    setTimeout(() => {
      setMatchState("matched");
    }, 1500);
  };

  const badgeLabel = {
    idle: "No selfie yet",
    checking: "Checking match...",
    matched: "Match confirmed",
    failed: "Match failed",
  }[matchState];

  const badgeClass = {
    idle: "bg-gray-200 text-[#1A1A1A]",
    checking: "bg-yellow-100 text-[#a06a00]",
    matched: "bg-green-100 text-[#1b7c00]",
    failed: "bg-red-100 text-[#a00d0d]",
  }[matchState];

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col text-[#1A1A1A] font-display antialiased">
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

      <header className="px-6 pt-6 pb-2">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/50 text-[#1A1A1A] hover:bg-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined text-3xl" style={solidIconStyle}>
              arrow_back
            </span>
          </button>

          <div className="flex items-center gap-2 text-[#0a44b8]/80">
            <span className="material-symbols-outlined text-sm" style={solidIconStyle}>
              lock
            </span>
            <span className="text-sm font-medium tracking-wide uppercase">Secure</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-4 pb-8 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <span className="block text-[#0a44b8] font-bold tracking-wider text-sm uppercase mb-2">
            Step 3 of 3
          </span>
          <h1 className="text-[28px] font-bold leading-tight mb-3">Verify Your Identity</h1>
          <p className="text-[18px] leading-relaxed font-normal text-[#1A1A1A]/80">
            This helps us keep the Get a Roof community safe and trusted.
          </p>
        </div>

        <div className="relative w-full max-w-[320px] aspect-square mb-8">
          <div className="absolute inset-0 rounded-full border-[6px] border-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden bg-gradient-to-b from-[#fdf8f0] to-[#f4f1e7]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover bg-black rounded-full"
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] h-[75%] border-2 border-dashed border-white/70 rounded-[45%]" />
            </div>

            <div className="absolute left-0 right-0 h-1 bg-[#0a44b8]/50 shadow-[0_0_15px_rgba(10,68,184,0.6)] scan-line pointer-events-none" />

            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white text-xs font-medium tracking-wide">Live Camera</span>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="text-center mb-auto">
          <h2 className="text-[#0a44b8] text-xl font-bold mb-2">Center your face</h2>
          <p className="text-base text-[#1A1A1A]/70">
            Ensure your face is well-lit and not obstructed by accessories.
          </p>
        </div>
      </main>

      <footer className="p-6 pt-0 w-full max-w-md mx-auto">
        <div className={`rounded-full px-3 py-1 text-sm font-semibold text-center mb-4 ${badgeClass}`}>
          {badgeLabel}
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCapture}
            disabled={matchState === "checking"}
            className="w-full bg-[#0a44b8] hover:bg-[#0a44b8]/90 active:scale-[0.98] transition-all text-white h-16 rounded-full shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait"
          >
            <span className="material-symbols-outlined text-[28px]" style={solidIconStyle}>
              photo_camera
            </span>
            <span className="text-[20px] font-bold tracking-wide">
              {matchState === "checking" ? "Checking..." : "Capture Selfie"}
            </span>
          </button>
          {matchState === "matched" && (
            <button
              type="button"
              onClick={() => {
                markTutorialFlow("landlord");
                router.push("/auth/verification-success");
              }}
              className="w-full text-center text-[#0a44b8] text-base font-medium underline underline-offset-4 decoration-[#0a44b8]/30"
            >
              Continue after verification
            </button>
          )}
        </div>

        <button className="w-full text-center mt-6" type="button">
          <span className="text-[#0a44b8] text-base font-medium underline underline-offset-4 decoration-[#0a44b8]/30">
            Having trouble? Contact Support
          </span>
        </button>
      </footer>
    </div>
  );
}
