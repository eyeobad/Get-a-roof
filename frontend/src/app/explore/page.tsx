"use client";

import Image from "next/image";

export default function ExploreCards() {
  const navigation = [
    { icon: "search", label: "Explore", active: true },
    { icon: "groups", label: "Matches" },
    { icon: "chat_bubble", label: "Messages" },
    { icon: "person", label: "Profile" },
  ];
  const solidStyle = { fontVariationSettings: "'FILL' 1" };

  return (
    <div className="min-h-screen bg-background-light text-[#0c141d]  dark:text-slate-50 font-display transition-colors duration-200 overflow-hidden flex flex-col">
      <header className="flex-none flex items-center justify-between px-6 py-4 bg-background-light  z-20">
     <div className="relative w-16 h-16 "> 
    <Image 
      src="/logo2.svg" 
      alt="logo" 
      fill 
      // 2. Add 'scale-150' (1.5x zoom) or 'scale-[2.0]' to make it bigger visually
      //    'object-contain' makes sure it doesn't get distorted
      className="object-contain scale-150 mt-2" 
      priority 
    />
  </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Explore</h1>
        <div className="w-12 flex justify-end">
          <button className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/5  transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl">tune</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center relative w-full max-w-md mx-auto px-4 pb-2">
        <div className="absolute w-[90%] h-[80%] bg-white/50 rounded-[2.5rem] -z-10 translate-y-4 scale-95 shadow-sm border border-slate-200"></div>
        <div className="relative w-full h-[650px] bg-white rounded-[2rem] overflow-hidden shadow-card flex flex-col border border-slate-100 z-10 group cursor-grab active:cursor-grabbing">
          <div className="relative h-[65%] w-full">
            <div className="absolute inset-0">
              <Image
                src="/hero.png"
                alt="Modern home"
                fill
                sizes="(max-width:768px) 90vw, 640px"
                className="object-cover"
              />
            </div>
            <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold tracking-wide shadow-sm">
              NEW LISTING
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary to-transparent" />
          </div>
          <div className="flex-1 bg-primary text-white p-6 flex flex-col justify-between relative">
            <div className="flex items-end gap-2 pb-2 border-b border-white/10">
              <h2 className="text-4xl font-bold tracking-tight">$3,500</h2>
              <span className="text-xl font-medium opacity-80 mb-1.5">/mo</span>
            </div>
            <div className="grid grid-cols-3 gap-3 py-2">
              {[
                ["bed", "3 Beds"],
                ["bathtub", "2 Baths"],
                ["square_foot", "1,850"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center bg-white/10 rounded-xl py-3 px-1 backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined text-2xl mb-1">{icon}</span>
                  <span className="text-lg font-bold">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 mt-1">
              <span className="material-symbols-outlined text-3xl mt-0.5 text-terracotta shrink-0">location_on</span>
              <div className="flex flex-col gap-2">
                <p className="text-xl font-medium leading-snug opacity-95">
                  4528 Evergreen Terrace, Springfield, IL
                </p>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1 w-fit border border-white/10 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-sm">villa</span>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-90">Shared Compound</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="flex-none w-full max-w-md mx-auto px-6 pt-4 pb-8 grid grid-cols-2 gap-6">
        <button className="flex items-center justify-center gap-2 h-20 rounded-full bg-slate-200  text-slate-700 hover:bg-slate-300 transition-colors shadow-sm active:scale-95 duration-150">
          <span className="material-symbols-outlined text-3xl">close</span>
          <span className="text-lg font-bold tracking-wide">PASS</span>
        </button>
        <button className="flex items-center justify-center h-20 bg-[#D87C5A] rounded-full bg-terracotta text-white hover:brightness-110 transition-all shadow-md active:scale-95 duration-150 ring-4 ring-terracotta/20">
          <span className="text-[18px] font-bold tracking-wide">INTERESTED</span>
        </button>
      </div>

      <nav className="flex-none bg-white dark:bg-background-dark border-t border-slate-200 pb-safe">
        <div className="flex justify-around items-end pt-3 pb-4 px-2">
          {navigation.map((item) => (
            <a
              key={item.label}
              className={`flex flex-1 flex-col items-center gap-1 group ${
                item.active ? "text-primary" : "text-slate-400"
              }`}
              href="#"
            >
            <div className="p-1 rounded-full group-hover:bg-primary/5 transition-colors">
              <span
                className="material-symbols-outlined text-3xl"
                style={solidStyle}
              >
                {item.icon}
              </span>
            </div>
              <span className={`text-xs font-semibold ${item.active ? "text-primary" : ""}`}>{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      <style>{`.pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); } ::-webkit-scrollbar { width: 0px; background: transparent; }`}</style>
    </div>
  );
}
