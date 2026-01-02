"use client";

import Image from "next/image";

const gallery = [
  { src: "/p2.png", alt: "Gallery image 2" },
  { src: "/p3.png", alt: "Gallery image 3" },
  { src: "/propertydetails.png", alt: "Modern living room" },
];

export default function PropertyDetails() {
  return (
    <div className="min-h-screen text-slate-900 font-display">
      <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto pb-32">
        <header className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto flex items-center justify-between px-4 pt-6 pb-2 pointer-events-none">
          <button
            aria-label="Go back"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-slate-900 hover:bg-white transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-3xl">arrow_back</span>
          </button>
          <button
            aria-label="Share property"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg text-slate-900 hover:bg-white transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">share</span>
          </button>
        </header>

        <div className="relative w-full h-[55vh] md:mt-16">
          <div className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
            {gallery.map((item) => (
              <div key={item.alt} className="relative flex-shrink-0 h-full w-full snap-center">
                <Image src={item.src} alt={item.alt} fill sizes="100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
              </div>
            ))}
          </div>
          <div className="absolute bottom-8 right-5 bg-black/60 text-white px-4 py-1.5 rounded-full text-base font-semibold backdrop-blur-md shadow-sm border border-white/10">
            1/10
          </div>
        </div>

        <div className="relative flex flex-col gap-8 rounded-t-[2.5rem] px-6 pt-8 -mt-10 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] border-t border-white/30 bg-white">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-primary text-4xl font-bold">$2,400</h1>
              <span className="text-xl font-semibold text-slate-600">/mo</span>
            </div>
            <div>
              <h2 className="text-slate-900 text-[1.6rem] font-bold leading-tight">123 Maple Avenue</h2>
              <p className="text-slate-700 text-lg mt-1 font-medium">Springfield, IL 62704</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { label: "2 Beds", icon: "bed", color: "bg-blue-100", text: "text-blue-900" },
              { label: "2 Baths", icon: "bathtub", color: "bg-blue-100", text: "text-blue-900" },
              { label: "1,200 Sq Ft", icon: "square_foot", color: "bg-blue-100", text: "text-blue-900" },
              { label: "Pet Friendly", icon: "pets", color: "bg-green-100", text: "text-green-900" },
            ].map((item) => (
              <div
                key={item.label}
                className={`${item.color} flex h-12 items-center gap-2 rounded-full px-5 py-3 border border-blue-200`}
              >
                <span className="material-symbols-outlined text-primary text-2xl">{item.icon}</span>
                <p className={`font-bold text-lg ${item.text}`}>{item.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-primary text-2xl font-bold">About this home</h3>
            <p className="text-slate-900 text-lg leading-relaxed">
              This charming apartment offers a perfect blend of modern amenities and classic style. Featuring a spacious open floor plan, updated kitchen appliances, and hardwood floors throughout...
            </p>
            <button className="inline-flex items-center gap-1 text-primary font-bold text-lg hover:underline decoration-2 underline-offset-4">
              Read more <span className="material-symbols-outlined text-2xl">expand_more</span>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-primary text-2xl font-bold">Amenities</h3>
            <div className="flex flex-col gap-5 pl-1">
              {["local_laundry_service", "ac_unit", "directions_car", "elevator"].map((icon) => (
                <div key={icon} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
                  </div>
                  <span className="text-slate-900 text-lg font-medium capitalize">
                    {icon.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col">
              <h3 className="text-primary text-2xl font-bold">Location</h3>
              <span className="text-slate-700 text-lg font-medium mt-1">Downtown Springfield, IL 62704</span>
            </div>
            <div className="w-full h-64 rounded-3xl overflow-hidden bg-slate-200 relative group cursor-pointer border border-slate-200">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: "url('/p4.png')" }}
              />
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                <button className="bg-white text-primary px-7 py-3.5 rounded-full flex items-center gap-2.5 shadow-xl transform transition-transform active:scale-95 group-hover:scale-105">
                  <span className="material-symbols-outlined text-primary">map</span>
                  <span className="font-bold text-lg">View on Map</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-5 pb-8 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-40 flex gap-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
          <button className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-primary/20 text-primary h-16 rounded-full font-bold text-xl hover:bg-blue-50 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-2xl">bookmark_border</span>
            Save
          </button>
          <button className="flex-[1.8] flex items-center justify-center gap-2 bg-primary text-white h-16 rounded-full font-bold text-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-2xl">mail</span>
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}
