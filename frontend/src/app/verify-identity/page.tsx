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
  const [nin, setNin] = useState("");
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

  const canContinue = useMemo(() => {
    if (tab === "passport") {
      return Boolean(uploads.passport);
    }
    if (tab === "nin") {
      return /^\d{11}$/.test(nin.trim());
    }
    return Boolean(uploads.licenseFront && uploads.licenseBack);
  }, [nin, tab, uploads.licenseBack, uploads.licenseFront, uploads.passport]);

  const handleSubmit = () => {
    if (!canContinue) return;
    const query = new URLSearchParams(userId ? { userId } : {});
    router.push(`/facial-verification?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white font-display text-[#1A1A1A] antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col lg:max-w-xl">
          <header className="flex items-center justify-between p-4 pb-2">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            >
              <span
                className="material-symbols-outlined text-[28px]"
                style={solidIconStyle}
              >
                arrow_back
              </span>
            </button>
            <span className="text-xs font-bold tracking-[0.18em] text-[#0a44b8] uppercase">
              Step 1 of 3
            </span>
            <div className="w-11" />
          </header>

          <main className="flex flex-1 flex-col px-4 pb-44">
            <div className="flex flex-col">
              <div className="mb-6 pt-2">
                <h1 className="mb-3 text-[30px] font-bold leading-tight tracking-tight">
                  {copy.title}
                </h1>
                <p className="text-base font-normal leading-relaxed opacity-90">
                  {copy.desc}
                </p>
              </div>

              <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-black/5 px-4 py-3 text-center text-[#1A1A1A]/70">
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

              <div className="mb-6">
                <div className="flex h-12 w-full items-center rounded-full border border-[#E0E0E0] bg-white p-1 shadow-sm">
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

              <div className="flex flex-1 flex-col gap-4">
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
                    <p className="mb-4 text-[30px] font-bold tracking-tight">
                      NIN Number
                    </p>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40">
                        <span
                          className="material-symbols-outlined text-[24px]"
                          style={solidIconStyle}
                        >
                          badge
                        </span>
                      </span>
                      <input
                        inputMode="numeric"
                        maxLength={11}
                        value={nin}
                        onChange={(event) =>
                          setNin(event.target.value.replace(/\D/g, "").slice(0, 11))
                        }
                        placeholder="Ex: 12345678901"
                        className="h-[68px] w-full rounded-2xl border-2 border-[#DADADA] bg-white pl-14 pr-4 text-[28px] font-semibold tracking-wide text-[#1A1A1A] placeholder:text-[24px] placeholder:text-[#1A1A1A]/25 outline-none"
                      />
                    </div>
                    <p className="mt-4 text-base leading-relaxed opacity-70">
                      Provide your NIN sticker or slip. It complements the next facial
                      verification step.
                    </p>
                  </div>
                )}
              </div>

              <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-4 pb-5 pt-3 backdrop-blur-sm">
                <div className="mx-auto w-full max-w-md">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canContinue}
                    className="pointer-events-auto h-[58px] w-full rounded-full bg-[#0a44b8] text-base font-bold tracking-wide text-white shadow-xl shadow-blue-900/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue to Facial Verification
                  </button>
                </div>
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
        "relative flex h-full flex-1 items-center justify-center overflow-hidden rounded-full px-0.5 text-center transition-all lg:px-1",
        active ? "bg-[#0a44b8] text-white shadow-md" : "text-[#1A1A1A]/60",
      ].join(" ")}
    >
      <span className="whitespace-pre-line text-[11px] font-bold leading-tight lg:text-sm">
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
        bigger ? "flex-1 max-h-[420px] gap-5 p-6 lg:gap-6 lg:p-8" : "gap-4 p-6 lg:p-8",
      ].join(" ")}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-[#E7EBF4] text-[#0a44b8] transition-colors lg:size-20">
        <span
          className={
            bigger
              ? "material-symbols-outlined text-[40px] lg:text-[48px]"
              : "material-symbols-outlined text-[34px] lg:text-[40px]"
          }
          style={solidIconStyle}
        >
          photo_camera
        </span>
      </div>

      <div className="px-3 text-center lg:px-4">
        <p className="mb-1 text-xl font-bold lg:text-2xl">{title}</p>
        <p className="text-base leading-normal opacity-70 lg:text-lg">{subtitle}</p>
        {file && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#0a44b8] lg:mt-4">
            <span
              className="material-symbols-outlined text-[18px]"
              style={solidIconStyle}
            >
              check_circle
            </span>
            <span className="max-w-[200px] truncate lg:max-w-[220px]">{file.name}</span>
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

