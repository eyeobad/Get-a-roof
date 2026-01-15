"use client";

import Link from "next/link";

const solidIconStyle: React.CSSProperties = {
  fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
};

type TagTone = "primary" | "success";
type NoteTone = "info" | "neutral";

type MatchTag = {
  label: string;
  tone?: TagTone;
};

type MatchCard = {
  id: string;
  name: string;
  role: string;
  time: string;
  tags: MatchTag[];
  note?: string;
  noteTone?: NoteTone;
  avatarUrl: string;
  verified?: boolean;
};

const matches: MatchCard[] = [
  {
    id: "john",
    name: "John Doe",
    role: "Software Engineer",
    time: "2h ago",
    tags: [
      { label: "Preferences 100% Match" },
      { label: "Apartment Preference 100% Match" },
    ],
    note:
      'Perfect match for your property\'s strict "No Pets" policy and income requirements.',
    noteTone: "info",
    avatarUrl: "https://i.pravatar.cc/100?img=12",
    verified: true,
  },
  {
    id: "jane",
    name: "Jane Smith",
    role: "Nurse Practitioner",
    time: "Yesterday",
    tags: [
      { label: "$ 3x Rent Income", tone: "success" },
      { label: "Preferences 100% Match" },
    ],
    note: "Looking for a 12-month lease. Has excellent landlord references.",
    noteTone: "neutral",
    avatarUrl: "https://i.pravatar.cc/100?img=47",
  },
  {
    id: "robert",
    name: "Robert Brown",
    role: "Retired Teacher",
    time: "2d ago",
    tags: [{ label: "Preferences 100% Match" }],
    avatarUrl: "https://i.pravatar.cc/100?img=65",
  },
];

function MatchCardView({ match }: { match: MatchCard }) {
  return (
    <section className="bg-white rounded-xl shadow border p-5 space-y-4">
      <div className="flex gap-4">
        <div className="relative">
          <img
            src={match.avatarUrl}
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            alt={`${match.name} avatar`}
          />
          {match.verified ? (
            <span className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              <span className="material-symbols-outlined text-white text-sm">
                check
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex-1">
          <div className="flex justify-between">
            <h2 className="text-lg font-bold">{match.name}</h2>
            <span className="text-sm text-gray-500">{match.time}</span>
          </div>
          <p className="text-gray-600">{match.role}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            {match.tags.map((tag) => (
              <span
                key={tag.label}
                className={[
                  "px-3 py-1 text-sm font-semibold rounded-full border",
                  tag.tone === "success"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-blue-50 text-[#0a44b8] border-blue-100",
                ].join(" ")}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {match.note ? (
        <div
          className={[
            "rounded-lg p-3 flex gap-2 border",
            match.noteTone === "neutral"
              ? "bg-gray-50 border-gray-200 text-gray-600"
              : "bg-blue-50 border-blue-100",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[#0a44b8]">
            thumb_up
          </span>
          <p className="text-sm">{match.note}</p>
        </div>
      ) : null}

      <div className="flex gap-3">
        <Link
          href="/messages"
          className="w-14 h-14 rounded-full border-2 border-[#0a44b8]/30 flex items-center justify-center text-[#0a44b8]"
          aria-label={`Chat with ${match.name}`}
        >
          <span className="material-symbols-outlined">chat</span>
        </Link>
        <button className="flex-1 h-14 rounded-full bg-[#0a44b8] text-white font-bold text-lg shadow active:scale-95">
          View Profile
        </button>
      </div>
    </section>
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
          isActive ? "text-[#0a44b8] font-bold" : "text-gray-400 hover:text-[#0a44b8]",
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
        <span className="text-xs">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t shadow flex justify-around py-2 z-50">
      <div className="flex justify-between items-end h-14 w-full max-w-md mx-auto">
        <Item id="properties" label="Properties" icon="grid_view" href="/dashboard/properties" />
        <Item id="matches" label="Matches" icon="group" href="/dashboard/matches" />
        <Item id="chat" label="Chat" icon="chat_bubble" badge={2} href="/messages" />
        <Item id="profile" label="Profile" icon="person" href="/dashboard/profile" />
      </div>
      <div className="h-5 w-full" />
    </nav>
  );
}

export default function LandlordMatchesPage() {
  return (
    <div className="min-h-screen bg-[#fcfbf8] text-gray-900 font-display antialiased pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a44b8] text-white px-4 py-4 shadow-md z-50">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Matches</h1>
          <button
            type="button"
            className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center"
            aria-label="Filter matches"
          >
            <span className="material-symbols-outlined text-2xl">tune</span>
          </button>
        </div>
        <p className="text-sm opacity-80 mt-1">3 new matches waiting for review</p>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-6">
        {matches.map((match) => (
          <MatchCardView key={match.id} match={match} />
        ))}

        <div className="text-center text-gray-500 mt-6">
          <span className="material-symbols-outlined text-4xl">check</span>
          <p className="mt-2 font-medium">You&apos;re all caught up!</p>
        </div>
      </main>

      <BottomNav active="matches" />
    </div>
  );
}
