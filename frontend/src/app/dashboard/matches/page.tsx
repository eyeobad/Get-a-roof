"use client";

import Link from "next/link";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 1, "wght" 600, "GRAD" 0, "opsz" 24',
};

type PropertyCard = {
  id: string;
  title: string;
  area: string;
  type: string;
  beds: number;
  baths: number;
  newCount: number;
  coverUrl: string;
  tone?: "primary" | "warning";
};

const properties: PropertyCard[] = [
  {
    id: "maple",
    title: "123 Maple Avenue",
    area: "South District",
    type: "House",
    beds: 3,
    baths: 2,
    newCount: 5,
    tone: "primary",
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqIAu0kQ1GflhWMuP-A5gKpS2fSgzH-SceEq9D060pr9ZxuICllWfBPljMmLN5bZvVvQLx8ivvOyNcU_C1GkD7LRxPL79nF50665aqcCP7TtwZdNWa3f_EIB9hC0F1MP_urlxAR-GXMEEVyBPS7bn00W2dGtrRb3Q2NTTFLckdrCFt_td1r5tlOU8P6eYd4HMwWSoqcusT_p2c-Ifux6ozHUG9FV-9yWHE3Zu3CK9ZQcWXbXD-g8RLO7y47GDXgKAxzaL5T5Qv4XnA",
  },
  {
    id: "broadway",
    title: "450 Broadway St, #4B",
    area: "Downtown",
    type: "Apartment",
    beds: 1,
    baths: 1,
    newCount: 2,
    tone: "primary",
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA44ONytmRLzcTkqPylL4JJl1VvH1QFba_NqAXjnurF0GvRbdYvMsTV1RFKbsnRi69_9aHr93KnQ9K-W2gGHTYIr4mesXj-DPWmtArjQhT_OMHO8HhrY01n1ypBI-no1Xe3PdsC1PzA2NmPpYaPaFhAjhlHKOCC5_OnkWpUjaK2kYwA9JLlgRsP0w0oDqM7W6TWMko6u4lmQyGFrHP5GooZChKHZVXpyoAvUxxFclF_VV7yyUnsssk6kkg5h7WjRWOWgbpKDD45QhY1",
  },
  {
    id: "oak",
    title: "78 Oak Lane",
    area: "West End",
    type: "House",
    beds: 2,
    baths: 1.5,
    newCount: 1,
    tone: "warning",
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBbG5LZXzt_L22GE6qjRpDVKxIAgSvdm19YMOrrzQeFX-f5oXEAMSpYE9cSe1YVWYEa0qhoXmJHvgCN9Sc3sZglpHKcLwTRcmZUARwJejlu3WJgu_07hOJ-7gPhGSRSxqfdyvFOzUDUM6fN3pj3pd4CVoygg0ObgPl9o_akuInaF-i1xRQj9SowvzaDt4Gs_I5bTRlN6ask0rEgnYJfrg6lDOqa4gfElYnpE5ewVX7WZN00T9HBnnpDQKeFZnPwzOeuBOoLljRMaIz9",
  },
  {
    id: "willow",
    title: "22 Willow Lane",
    area: "Northside",
    type: "House",
    beds: 3,
    baths: 2,
    newCount: 0,
    coverUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAS2F3qjzYuh38GXwptFH3zVJBCv8N-MXljlwCjbeZxqVLLvxLMpiTrl2odDe-yDJQd4eJFIvOGKUdxC-CUNOOqqU09PpDoPIR0UlQeWouKqPMPtsDW5jD-yp0XTDaAjvn16MzdcELYd2afZm-Skh21O0ZlbTFGsG2jG1DHt8bRrlN3-7PxC3b-b4NPhfLYMMynw2BV1la6V_aSzrWP5cOi3ZzSrkWfXhtRdznj0G3Yp3TKc4u2kCb1qKbQqFwOAtGBqEESVGDj7jtM",
  },
];

function PropertyListCard({ card }: { card: PropertyCard }) {
  const isEmpty = card.newCount === 0;
  const badgeClass = isEmpty
    ? "bg-stone-200 text-stone-400"
    : card.tone === "warning"
      ? "bg-orange-500 text-white"
      : "bg-[#0a44b8] text-white";

  return (
    <Link
      href={`/dashboard/matches/${card.id}`}
      className={[
        "group block rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-stone-100 overflow-hidden active:scale-[0.98] transition-transform",
        isEmpty ? "bg-stone-50" : "bg-white",
      ].join(" ")}
    >
      <div className={["p-4 flex items-center gap-4", isEmpty ? "opacity-70 grayscale-[0.5]" : ""].join(" ")}>
        <div
          aria-label={`Thumbnail of ${card.title}`}
          className="h-20 w-20 shrink-0 rounded-lg bg-stone-200 bg-center bg-cover border border-stone-100 shadow-sm"
          role="img"
          style={{ backgroundImage: `url('${card.coverUrl}')` }}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#1a1a1a] truncate group-active:text-[#0a44b8] transition-colors">
            {card.title}
          </h2>
          <p className="text-lg text-stone-600 truncate mt-0.5">
            {card.area} - {card.type}
          </p>
          <p className="text-sm text-stone-400 font-medium truncate mt-1">
            {card.beds} Bed - {card.baths} Bath
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div
            className={[
              "flex flex-col items-center justify-center h-[60px] w-[60px] rounded-xl shadow-md",
              isEmpty ? "shadow-none" : "shadow-blue-900/20",
              badgeClass,
            ].join(" ")}
          >
            <span className="text-2xl font-bold leading-none mt-1">{card.newCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">New</span>
          </div>
        </div>
      </div>
    </Link>
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
          "flex flex-col items-center justify-center gap-1 w-16 transition-colors",
          isActive ? "text-[#0a44b8]" : "text-stone-400 hover:text-[#0a44b8]",
        ].join(" ")}
      >
        <div className="relative">
          <span className="material-symbols-outlined text-[32px]" style={solidIconStyle}>
            {icon}
          </span>
          {typeof badge === "number" && badge > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {badge}
            </span>
          )}
        </div>
        <span className={["text-xs", isActive ? "font-bold" : "font-medium"].join(" ")}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
      <div className="flex justify-between items-end h-14 max-w-md mx-auto">
        <Item id="properties" label="Properties" icon="grid_view" href="/dashboard/properties" />
        <Item id="matches" label="Matches" icon="group" href="/dashboard/matches" />
        <Item id="chat" label="Chat" icon="chat_bubble" badge={2} href="/messages" />
        <Item id="profile" label="Profile" icon="person" href="/dashboard/profile" />
      </div>
      <div className="h-5 w-full" />
    </nav>
  );
}

export default function LandlordMatchesPropertyListPage() {
  return (
    <div className="min-h-screen bg-[#fcfbf8] text-[#1a1a1a] font-display antialiased flex flex-col pb-24">
      <header className="sticky top-0 z-50 bg-[#0a44b8] px-4 py-4 shadow-md text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <button
            aria-label="Sort Properties"
            className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-white/10 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[28px]" style={solidIconStyle}>
              sort
            </span>
          </button>
        </div>
        <p className="text-white/80 text-sm mt-1">
          Select a property to view 8 new candidates
        </p>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-4">
        {properties.map((card) => (
          <PropertyListCard key={card.id} card={card} />
        ))}
      </main>

      <BottomNav active="matches" />
    </div>
  );
}
