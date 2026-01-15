"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
};

type Photo = {
  id: string;
  src: string;
  alt: string;
  isObjectUrl?: boolean;
};

const initialPhotos: Photo[] = [
  {
    id: "living-room",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA7I5PMR_eQloldzLN7LJQ84VKbKD7jHkmBKsmpHTjKTpxvOgRMBpPEOt74HxgdwOO-4_gngivlqiR1dvYwL0UjClgAErIBxh2Hv5ElCBN1y5xIxCoXhq7h1rwtyb4PPDKe--Jy_Em0mopDtWmq9-e87D_fEkO3JRqjOfDiATT0264n38U2UTxGvcGlQk0q068wyYUcnzbzmeecYvTC_FSuo4reZcM5CgZCS_DckNwMshfh2H5t6NsHGff0HzWDeCscKMzWI8boEWpD",
    alt: "Bright modern living room with beige sofa and plants",
  },
  {
    id: "kitchen",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0T_BDBs8V5RXCP4IzxAyqLpC6AxzD1IG6hpqU5wifPW8kqvTJbL2HX_cF8soFFlf3kb5EBSjYCmzQ2xQYPa7_USzdyoixsmdvY3nXoP_KVTNmrQXBmD6XNcmuaiEqtoaa6xBZdYu6nzifJSgEfjyc7Qw_fdtKehQsgxl8ITh9OLJb21-vTPjwvjAdxK-njvG7Ntk6TayT1bt4Y7rI13TlynghnVJwXQJd0Kn7uko0cNT44Ojgt92G6kyyNy1DRs0Y_HA75YscQQ9P",
    alt: "Modern kitchen with white island and wooden stools",
  },
];

const createId = () =>
  `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

export default function AddPropertyPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>(() => initialPhotos);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextPhotos: Photo[] = Array.from(files).map((file) => {
      const objectUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(objectUrl);
      return {
        id: createId(),
        src: objectUrl,
        alt: file.name || "Uploaded property photo",
        isObjectUrl: true,
      };
    });
    setPhotos((prev) => [...prev, ...nextPhotos]);
  };

  const handleRemove = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target?.isObjectUrl) {
        URL.revokeObjectURL(target.src);
        objectUrlsRef.current = objectUrlsRef.current.filter(
          (url) => url !== target.src
        );
      }
      return prev.filter((photo) => photo.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  return (
    <div className="min-h-screen font-display antialiased text-[#1b100d]">
      <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto overflow-x-hidden ">
        {/* Top bar */}
        <div className="sticky top-0 z-50 flex items-center bg-white/95 backdrop-blur-sm p-4 pb-2 justify-between">
          <button
            aria-label="Cancel"
            className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-black/5 transition-colors"
            type="button"
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
            >
              Save
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
                <img alt={photo.alt} className="w-full h-full object-cover" src={photo.src} />

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
                  onClick={() => handleRemove(photo.id)}
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
          <Link
            href="/add-property-details"
            className="w-full flex items-center justify-center rounded-full h-14 bg-[#0a44b8] text-white text-lg font-bold tracking-wide shadow-lg shadow-[#0a44b8]/30 active:scale-[0.98] transition-transform hover:brightness-105"
          >
            <span>Next Step</span>
            <span
              className="material-symbols-outlined ml-2"
              style={solidIconStyle}
            >
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Fade above CTA */}
        <div className="fixed bottom-[96px] w-full max-w-md h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-30" />
      </div>
    </div>
  );
}
