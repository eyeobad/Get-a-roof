"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type PropertyStatus = "Listed" | "Draft";

type Property = {
  id: string;
  status: PropertyStatus;
  title: string;
  price: number;
  beds: number;
  baths: number;
  matches?: number; // only for listed
  coverUrl: string;
};

function Money({ value }: { value: number }) {
  const formatted = useMemo(() => value.toLocaleString(), [value]);
  return <>{formatted}</>;
}

function StatusPill({ status }: { status: PropertyStatus }) {
  if (status === "Listed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
        Listed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-700">
      Draft
    </span>
  );
}

function IconStat({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <span className="material-symbols-outlined text-[18px]" style={solidIconStyle}>
        {icon}
      </span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}

function PropertyCard({
  p,
  onEdit,
  onMatches,
  onContinue,
}: {
  p: Property;
  onEdit: (id: string) => void;
  onMatches: (id: string) => void;
  onContinue: (id: string) => void;
}) {
  const isDraft = p.status === "Draft";
  const matchesLabel =
    typeof p.matches === "number" ? `${p.matches} Matches` : "Matches";

  return (
    <article
      className={[
        "bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col",
        isDraft ? "opacity-90" : "",
      ].join(" ")}
    >
      <div className="p-4 flex gap-4">
        <div
          className={[
            "w-28 h-28 shrink-0 rounded-xl bg-gray-200 bg-cover bg-center",
            isDraft ? "grayscale" : "",
          ].join(" ")}
          style={{ backgroundImage: `url('${p.coverUrl}')` }}
          aria-label={`${p.title} cover`}
        />
        <div className="flex-1 flex flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between">
            <StatusPill status={p.status} />
          </div>

          <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
            {p.title}
          </h2>

          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-extrabold text-[#0a44b8]">
              $
              <Money value={p.price} />
            </span>
            <span className="text-[14px] text-gray-500 font-medium">/ mo</span>
          </div>

          <div className="flex items-center gap-4 mt-0.5">
            <IconStat icon="bed" value={p.beds} />
            <IconStat icon="bathtub" value={p.baths} />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      {!isDraft ? (
        <div className="flex border-t border-gray-100 h-14">
          <button
            type="button"
            onClick={() => onEdit(p.id)}
            className="flex-1 flex items-center justify-center gap-2 text-gray-700 font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>
              edit
            </span>
            Edit
          </button>
          <div className="w-px bg-gray-100" />
          <button
            type="button"
            onClick={() => onMatches(p.id)}
            className={[
              "flex-1 flex items-center justify-center gap-2 font-bold transition-colors",
              (p.matches ?? 0) > 0
                ? "bg-[#0a44b8]/5 text-[#0a44b8] hover:bg-[#0a44b8]/10 active:bg-[#0a44b8]/15"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>
              {(p.matches ?? 0) > 0 ? "person_search" : "visibility"}
            </span>
            {matchesLabel}
          </button>
        </div>
      ) : (
        <div className="flex border-t border-gray-100 h-14">
          <button
            type="button"
            onClick={() => onContinue(p.id)}
            className="w-full flex items-center justify-center gap-2 text-[#0a44b8] font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" style={solidIconStyle}>
              arrow_forward
            </span>
            Continue Editing
          </button>
        </div>
      )}
    </article>
  );
}

function BottomNav({ active }: { active: "properties" | "matches" | "chat" | "profile" }) {
  const Item = ({
    id,
    label,
    icon,
    badge,
    href,
  }: {
    id: typeof active;
    label: string;
    icon: string;
    badge?: number;
    href: string;
  }) => {
    const isActive = active === id;
    return (
      <Link
        href={href}
        className={[
          "flex flex-col items-center justify-center w-full h-full transition-colors",
          isActive ? "text-[#0a44b8]" : "text-gray-400 hover:text-gray-600",
        ].join(" ")}
      >
        <div className="relative">
          <span className="material-symbols-outlined text-[30px]" style={solidIconStyle}>
            {icon}
          </span>
          {typeof badge === "number" && badge > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
        </div>
        <span className={["mt-1 text-[12px]", isActive ? "font-bold" : "font-medium"].join(" ")}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full h-20 bg-white border-t border-gray-200 flex items-center justify-around z-50 pb-2 shadow-[0_-4px_10px_rgba(0,0,0,0.06)]">
      <div className="max-w-md w-full h-full mx-auto flex">
        <Item id="properties" label="Properties" icon="dashboard" href="/dashboard/properties" />
        <Item id="matches" label="Matches" icon="group" href="/dashboard/matches" />
        <Item id="chat" label="Chat" icon="chat_bubble" badge={2} href="/messages" />
        <Item id="profile" label="Profile" icon="person" href="/dashboard/profile" />
      </div>
    </nav>
  );
}

export default function LandlordDashboardPage() {
  const [q, setQ] = useState("");
  const router = useRouter();

  const properties: Property[] = [
    {
      id: "p1",
      status: "Listed",
      title: "123 Maple Avenue",
      price: 1200,
      beds: 3,
      baths: 2,
      matches: 12,
      coverUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuASNq12EGMCak0p_Mi5IJiFR2H_TUC43uKbPb3UDA3Drr2usbP0sbEyXKAiiIuy_rfrA5mSnrID4rcjMH6r63Ks8_m84AfNxGcqJ9NpaNmFzE-FeJ9dZa5s59CbhgiE57pnucWo7_zCdUKJDmr-PxKiyhHsMngsfHD0pgNlHhzZMzyOMLCcNv2oLh--U3ZUe3WUKryOL7DJJ5lbZzGGAYlckjXUyaGIBqmrWHgxygKNGmSZzU3nIE_fQddaOAV8vl8nv3fLFlXHVKTZ",
    },
    {
      id: "p2",
      status: "Listed",
      title: "456 Oak Street",
      price: 1500,
      beds: 2,
      baths: 2,
      matches: 0,
      coverUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCXjht26ed14yawZqKOUqCh8E9PcQmqFD11r9bf8YvFGpD24Y877h44AWab8l5pGr0RjZLcCc_vPCOqRmaR9mxiObHutlocgatm1BXd_b2inDL3S2xIl1XwBJkVQ2cYNHeGAziyLtxnz4OZrDULO3u-uGtZ3Al5D0ParCSPxOPCeLNwd-14dNGKE2-G0-jTiJTCB4nEfR2kjrcXYP6yTNr5CiEq4J5n6CxGxAmebmc63UyTCKQnfsYUAV9wat0yHwJbYPpQ5KQj8Ja8",
    },
    {
      id: "p3",
      status: "Draft",
      title: "789 Pine Lane",
      price: 950,
      beds: 1,
      baths: 1,
      coverUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBaOh2T5Urtt9gq9SFJ6K-VegT_WT7Noz2alRwfAFVZuG4u_N0wmw53yGBNpeTBBMNmU3KNm6C56nW3rMgG50pfdaGIvvve3lVYAlWZn3I2fCpguvN3rpUlbwuSpSU0AXJD6TVzWEzSIrnrLkXlF7ruAJjgkVM9GF15sPSPmHKGHuuLli3FGllwFM-LYsUu2Q3s84gNFqus6EVh-VxPCD1KDt5D2IvRzf9wLhHugyKuK_X0VnIAd5VIeXk2pR4hptiyZbd2Z77UjrUI",
    },
  ];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return properties;
    return properties.filter((p) => p.title.toLowerCase().includes(s));
  }, [q]);

  const onEdit = (id: string) => {
    // wire to your edit route
    console.log("Edit", id);
  };

  const onMatches = (id: string) => {
    router.push("/dashboard/matches");
  };

  const onContinue = (id: string) => {
    // wire to continue flow for draft
    console.log("Continue", id);
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f6f8]/95 backdrop-blur-sm border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#0a44b8] tracking-tight leading-none">
            My Properties
          </h1>
          <p className="text-[18px] text-gray-600 font-medium mt-1">Dashboard</p>
        </div>

        <button
          aria-label="Profile"
          className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 hover:ring-4 ring-[#0a44b8]/20 transition-all focus:outline-none focus:ring-4"
        >
          <img
            alt="Profile avatar"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGEzCpt0ILv2ShepIc-_verWSuPCwtAXDW-e6EeG4kkTaOBJuQSlu8nbc907JfpuXy3oBnj5in34iv_WuZi76heKMOon1pAmtMTf1m0ddee-icIOR50wiIAyoG53dQmOdxNGlMhdQR7l6Cia4LyFny-xYHhXBwlxFKuv1D7Eu66vs9ZewGeFbHhXRyoEbbdbnEo4DsY7dsX7nrOhcs0DRX90daZEkqZ9rV8V-hr5c39Vjv_Yr8Bh1HRUgdUQRj3KKqoZb38elb3iiy"
          />
        </button>
      </header>

      {/* Main */}
      <main className="px-5 pt-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Search */}
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[24px]"
            style={solidIconStyle}
          >
            search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-300 bg-white text-[18px] shadow-sm focus:ring-2 focus:ring-[#0a44b8] focus:border-[#0a44b8]"
            placeholder="Search properties..."
            type="text"
          />
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-6">
          {filtered.map((p) => (
            <PropertyCard
              key={p.id}
              p={p}
              onEdit={onEdit}
              onMatches={onMatches}
              onContinue={onContinue}
            />
          ))}
        </div>

        <div className="h-20" />
      </main>

      {/* Floating Add Property */}
      <div className="fixed bottom-24 right-5 z-40">
        <button
          type="button"
          className="h-16 pl-5 pr-7 bg-[#0a44b8] hover:brightness-95 text-white rounded-full shadow-lg flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 ring-[#0a44b8]/30"
        >
          <span className="material-symbols-outlined text-[30px]" style={solidIconStyle}>
            add
          </span>
          <span className="text-[18px] font-bold">Add Property</span>
        </button>
      </div>

      {/* Bottom Nav */}
      <BottomNav active="properties" />
    </div>
  );
}
