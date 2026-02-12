"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
type Tab = "license" | "passport" | "nin";
type UploadKey = "licenseFront" | "licenseBack" | "passport";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

function VerifyIdentityContent() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params?.get("userId") ?? "";
  const [tab, setTab] = useState<Tab>("license");
  const [uploads, setUploads] = useState<Record<UploadKey, File | null>>({
    licenseFront: null,
    licenseBack: null,
    passport: null,
  });

  const updateUpload = (key: UploadKey, file: File | null) => {
    setUploads((prev) => ({ ...prev, [key]: file }));
  };

  const copy = useMemo(() => {
    if (tab === "passport") {
      return {
        title: "Passport Verification",
        desc:
          "Please upload the main page of your passport (the page with your photo and personal details). We keep this on file for the facial match step that comes next.",
      };
    }
    if (tab === "nin") {
      return {
        title: "Enter Your NIN",
        desc:
          "Please enter your 11-digit National Identification Number (NIN). This helps cross-check government records when we move to the next screening stage.",
      };
    }
    return {
      title: "Verify Your Identity",
      desc:
        "We need at least one government ID document before moving on to the facial verification step. Upload the requested files below.",
    };
  }, [tab]);

  const handleSubmit = () => {
    if (!uploads.passport) return;
    const query = new URLSearchParams(userId ? { userId } : {});
    router.push(`/facial-verification?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F2EA] font-display text-[#1A1A1A] antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden lg:px-8 lg:py-10">
        <div className="flex min-h-screen w-full flex-col lg:min-h-0 lg:max-w-[960px] lg:mx-auto">
          <header className="flex items-center justify-between p-6 pb-2 lg:px-8 lg:pt-8 lg:pb-4">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            >
              <span
                className="material-symbols-outlined text-[32px]"
                style={solidIconStyle}
              >
                arrow_back
              </span>
            </button>
            <span className="text-sm font-bold tracking-widest text-[#0a44b8] uppercase">
              Step 1 of 3
            </span>
            <div className="w-12" />
          </header>

          <main className="flex flex-1 flex-col px-6 pb-6 lg:px-8 lg:pb-10">
            <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
              <div className="flex flex-col lg:flex-1">
                <div className="mb-8 pt-2">
                  <h1 className="text-[32px] font-bold leading-tight tracking-tight mb-4">
                    {copy.title}
                  </h1>
                  <p className="text-lg font-normal leading-relaxed opacity-90">
                    {copy.desc}
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex h-14 w-full items-center rounded-full bg-white p-1.5 shadow-sm border border-[#E0E0E0]">
                    <TabPill
                      label={"Driver's\nLicense"}
                      active={tab === "license"}
                      onClick={() => setTab("license")}
                    />
                    <TabPill
                      label="Passport"
                      active={tab === "passport"}
                      onClick={() => setTab("passport")}
                    />
                    <TabPill
                      label="NIN"
                      active={tab === "nin"}
                      onClick={() => setTab("nin")}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-6 flex-1">
                  {tab === "license" && (
                    <>
                      <UploadCard
                        title="Front of ID"
                        subtitle="Tap to upload"
                        inputId="license-front"
                        file={uploads.licenseFront}
                        onFileChange={(file) => updateUpload("licenseFront", file)}
                      />
                      <UploadCard
                        title="Back of ID"
                        subtitle="Tap to upload"
                        inputId="license-back"
                        file={uploads.licenseBack}
                        onFileChange={(file) => updateUpload("licenseBack", file)}
                      />
                    </>
                  )}

                  {tab === "passport" && (
                    <UploadCard
                      title="Passport Photo Page"
                      subtitle="Tap to upload the page with your photo"
                      bigger
                      inputId="passport-photo"
                      file={uploads.passport}
                      onFileChange={(file) => updateUpload("passport", file)}
                    />
                  )}

                  {tab === "nin" && (
                    <div className="flex flex-col gap-4">
                      <p className="text-[32px] font-bold tracking-tight mb-6">
                        NIN Number
                      </p>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40">
                          <span
                            className="material-symbols-outlined text-[26px]"
                            style={solidIconStyle}
                          >
                            badge
                          </span>
                        </span>
                        <input
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="Ex: 12345678901"
                          className="w-full h-[76px] rounded-2xl border-2 border-[#DADADA] bg-white pl-16 pr-6 text-[32px] font-semibold tracking-wide text-[#1A1A1A]/50 placeholder:text-[#1A1A1A]/25 outline-none"
                        />
                      </div>
                      <p className="mt-6 text-lg opacity-70 leading-relaxed">
                        Provide your NIN sticker or slip—it complements the next facial
                        verification step.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10 mt-10 flex flex-col items-center gap-5 lg:mt-0 lg:w-full lg:items-stretch lg:pt-4">
                <div className="flex items-center gap-2 rounded-xl bg-black/5 px-4 py-3 text-[#1A1A1A]/70">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={solidIconStyle}
                  >
                    lock
                  </span>
                  <span className="text-sm font-semibold tracking-wide">
                    Your data is encrypted and secure
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!uploads.passport}
                  className="pointer-events-auto w-full rounded-full bg-[#0a44b8] h-[64px] text-white text-xl font-bold tracking-wide shadow-xl shadow-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Facial Verification
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function VerifyIdentityPage() {
  return (
    <Suspense fallback={null}>
      <VerifyIdentityContent />
    </Suspense>
  );
}

function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex h-full flex-1 items-center justify-center overflow-hidden rounded-full px-1 text-center transition-all",
        active ? "bg-[#0a44b8] text-white shadow-md" : "text-[#1A1A1A]/60",
      ].join(" ")}
    >
      <span className="text-sm font-bold leading-tight whitespace-pre-line">
        {label}
      </span>
    </button>
  );
}

function UploadCard({
  title,
  subtitle,
  bigger,
  inputId,
  file,
  onFileChange,
}: {
  title: string;
  subtitle: string;
  bigger?: boolean;
  inputId: string;
  file?: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={[
        "group relative flex flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-[#0a44b8]/30 bg-white transition-all hover:border-[#0a44b8] active:scale-[0.99] shadow-sm",
        bigger ? "gap-6 p-8 flex-1 max-h-[420px]" : "gap-4 p-8",
      ].join(" ")}
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-[#E7EBF4] text-[#0a44b8] transition-colors">
        <span
          className={
            bigger ? "material-symbols-outlined text-[48px]" : "material-symbols-outlined text-[40px]"
          }
          style={solidIconStyle}
        >
          photo_camera
        </span>
      </div>

      <div className="text-center px-4">
        <p className="text-2xl font-bold mb-1">{title}</p>
        <p className="text-lg opacity-70 leading-normal">{subtitle}</p>
        {file && (
          <div className="hidden lg:flex items-center justify-center gap-2 mt-4 text-xs font-semibold text-[#0a44b8]">
            <span
              className="material-symbols-outlined text-[18px]"
              style={solidIconStyle}
            >
              check_circle
            </span>
            <span className="max-w-[220px] truncate">{file.name}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          onFileChange(nextFile);
        }}
      />
    </button>
  );
}
