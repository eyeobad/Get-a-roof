"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

type Photo = {
  id: string;
  src: string;
  alt: string;
};

function AddPropertyPhotosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get("propertyId") ?? "";
  const authToken = useAppStore((state) => state.authToken);
  const draft = useAppStore((state) => state.landlordDraft);
  const setLandlordDraft = useAppStore((state) => state.setLandlordDraft);
  const saveLandlordDraft = useAppStore((state) => state.saveLandlordDraft);
  const uploadLandlordImage = useAppStore((state) => state.uploadLandlordImage);
  const loadLandlordDraftById = useAppStore((state) => state.loadLandlordDraftById);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const photos = useMemo<Photo[]>(
    () =>
      (draft.images ?? []).map((src, index) => ({
        id: `${index}-${src}`,
        src,
        alt: `Property photo ${index + 1}`,
      })),
    [draft.images]
  );

  const handleAddFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    if (!authToken) {
      setError("Sign in to upload photos.");
      return;
    }
    const uploads = await Promise.all(
      Array.from(files).map(async (file) => {
        try {
          return await uploadLandlordImage(file);
        } catch (err) {
          setError((err as Error).message || "Upload failed. Please try again.");
          return null;
        }
      })
    );
    const validUrls = uploads.filter((url): url is string => Boolean(url));
    if (!validUrls.length) {
      setError("Upload failed. Please try again.");
      return;
    }
    const nextImages = [...(draft.images ?? []), ...validUrls];
    setLandlordDraft({ images: nextImages });
  };

  const handleRemove = (src: string) => {
    const nextImages = (draft.images ?? []).filter((url) => url !== src);
    setLandlordDraft({ images: nextImages });
  };

  useEffect(() => {
    if (propertyId && propertyId !== draft.id) {
      void loadLandlordDraftById(propertyId);
    }
  }, [propertyId, draft.id, loadLandlordDraftById]);

  const handleSave = async (nextPath?: string) => {
    setIsSaving(true);
    setError(null);
    if (!authToken) {
      setError("Sign in to save your draft.");
      setIsSaving(false);
      return;
    }
    try {
      await saveLandlordDraft();
      if (nextPath) {
        router.push(nextPath);
      }
    } catch (err) {
      setError((err as Error).message || "Unable to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen font-display antialiased text-[#1b100d]">
      <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto overflow-x-hidden ">
        {/* Top bar */}
        <div className="sticky top-0 z-50 flex items-center bg-white/95 backdrop-blur-sm p-4 pb-2 justify-between">
          <button
            aria-label="Cancel"
            className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-black/5 transition-colors"
            type="button"
            onClick={() => router.push("/dashboard/properties")}
          >
            <span
              className="material-symbols-outlined"
              style={{ ...solidIconStyle, fontSize: 28 }}
            >
              close
            </span>
          </button>

          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
            Add Property
          </h2>

          <div className="flex w-12 items-center justify-end">
            <button
              type="button"
              className="text-[#0a44b8] text-base font-bold leading-normal tracking-[0.015em] shrink-0"
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex w-full flex-col items-center justify-center pt-2 pb-6 px-4">
          <div className="flex w-full flex-row items-center justify-center gap-2 mb-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]" />
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/20" />
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/20" />
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/20" />
            <div className="h-1.5 flex-1 rounded-full bg-[#0a44b8]/20" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6e5652]">
            Step 1 of 5
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 pb-32 overflow-y-auto no-scrollbar">
          <div className="mb-8">
            <h1 className="tracking-tight text-[32px] font-bold leading-[1.1] mb-3 text-left">
              Let&apos;s see the place.
            </h1>
            <p className="text-[#6e5652] text-lg font-normal leading-relaxed">
              Upload high-quality photos to attract the best tenants. Start with
              the living room or kitchen.
            </p>
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-xl overflow-hidden group shadow-sm"
              >
                <Image
                  alt={photo.alt}
                  src={photo.src}
                  fill
                  className="object-cover"
                />

                {index === 0 && (
                  <div className="absolute top-3 left-3 bg-[#0a44b8] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[12px]"
                      style={solidIconStyle}
                    >
                      star
                    </span>
                    FACE
                  </div>
                )}

                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors backdrop-blur-md"
                  aria-label="Remove photo"
                  onClick={() => handleRemove(photo.src)}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={solidIconStyle}
                  >
                    close
                  </span>
                </button>
              </div>
            ))}

            {/* Add photos tile */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-[#0a44b8]/30 bg-[#0a44b8]/5 hover:bg-[#0a44b8]/10 active:scale-95 transition-all group"
            >
              <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-[#0a44b8] text-[28px]"
                  style={solidIconStyle}
                >
                  add_a_photo
                </span>
              </div>
              <span className="text-[#0a44b8] font-bold text-sm">
                Add Photos
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                handleAddFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
          ) : null}

          {/* Drag & drop */}
          <div
            className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[#6e5652]/20 px-6 py-8 mb-6 bg-white"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleAddFiles(event.dataTransfer.files);
            }}
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <span
                className="material-symbols-outlined text-[#6e5652] text-4xl mb-2"
                style={solidIconStyle}
              >
                cloud_upload
              </span>
              <p className="text-base font-bold leading-tight">
                Drag and drop here
              </p>
              <p className="text-[#6e5652] text-sm">or browse your gallery</p>
            </div>
          </div>

          {/* Pro tip */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
            <span
              className="material-symbols-outlined text-blue-600 mt-0.5"
              style={solidIconStyle}
            >
              lightbulb
            </span>
            <div>
              <h4 className="text-blue-900 font-bold text-sm mb-0.5">
                Pro Tip
              </h4>
              <p className="text-blue-800 text-sm leading-snug">
                Properties with at least 5 photos get 40% more inquiries.
                Bright, daylight photos work best.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-black/5 p-4 z-40 pb-8">
          <button
            type="button"
            onClick={() => void handleSave("/add-property-details")}
            className="w-full flex items-center justify-center rounded-full h-14 bg-[#0a44b8] text-white text-lg font-bold tracking-wide shadow-lg shadow-[#0a44b8]/30 active:scale-[0.98] transition-transform hover:brightness-105"
          >
            <span>Next Step</span>
            <span
              className="material-symbols-outlined ml-2"
              style={solidIconStyle}
            >
              arrow_forward
            </span>
          </button>
        </div>

        {/* Fade above CTA */}
        <div className="fixed bottom-[96px] w-full max-w-md h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-30" />
      </div>
    </div>
  );
}

export default function AddPropertyPhotosPage() {
  return (
    <Suspense fallback={null}>
      <AddPropertyPhotosContent />
    </Suspense>
  );
}
