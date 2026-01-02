"use client";

import Image from "next/image";
import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";

type ExploreCard = {
  id: string;
  image: string;
  price: string;
  period: string;
  stats: { icon: string; label: string }[];
  address: string;
  highlight: string;
  tag: string;
  alt: string;
};

type FilterModalProps = {
  isOpen: boolean;
  close: () => void;
  budget: number;
  setBudget: Dispatch<SetStateAction<number>>;
  distance: number;
  setDistance: Dispatch<SetStateAction<number>>;
  apartmentType: string;
  setApartmentType: Dispatch<SetStateAction<string>>;
  toggleOptions: { label: string; key: string }[];
  toggles: Record<string, boolean>;
  setToggles: Dispatch<SetStateAction<Record<string, boolean>>>;
};

const exploreData: ExploreCard[] = [
  {
    id: "listing-1",
    image: "/hero.png",
    price: "$3,500",
    period: "/mo",
    stats: [
      { icon: "bed", label: "3 Beds" },
      { icon: "bathtub", label: "2 Baths" },
      { icon: "square_foot", label: "1,850 sqft" },
    ],
    address: "4528 Evergreen Terrace, Springfield, IL",
    highlight: "Shared Apartment",
    tag: "New Listing",
    alt: "Modern suburban home",
  },
  {
    id: "listing-2",
    image: "/p2.png",
    price: "$2,750",
    period: "/mo",
    stats: [
      { icon: "bed", label: "2 Beds" },
      { icon: "bathtub", label: "2 Baths" },
      { icon: "square_foot", label: "1,300 sqft" },
    ],
    address: "21 Johnson Street, Victoria Island, NG",
    highlight: "Self Compound",
    tag: "Curated Pick",
    alt: "Contemporary apartment facade",
  },
  {
    id: "listing-3",
    image: "/p3.png",
    price: "$4,100",
    period: "/mo",
    stats: [
      { icon: "bed", label: "4 Beds" },
      { icon: "bathtub", label: "3 Baths" },
      { icon: "square_foot", label: "2,200 sqft" },
    ],
    address: "8 Palm Drive, Lekki, NG",
    highlight: "Shortlets",
    tag: "Beachside",
    alt: "Luxury villa with pool",
  },
  {
    id: "listing-4",
    image: "/p4.png",
    price: "$3,100",
    period: "/mo",
    stats: [
      { icon: "bed", label: "3 Beds" },
      { icon: "bathtub", label: "2 Baths" },
      { icon: "square_foot", label: "1,600 sqft" },
    ],
    address: "120 Harmon Road, Abuja",
    highlight: "Self Compound",
    tag: "Newly Renovated",
    alt: "Modern penthouse during golden hour",
  },
];

export default function ExploreCards() {
  const router = useRouter();
  const navigation = [
    { icon: "search", label: "Explore", active: true },
    { icon: "groups", label: "Matches" },
    { icon: "chat_bubble", label: "Messages" },
    { icon: "person", label: "Profile" },
  ];
  const solidStyle = { fontVariationSettings: "'FILL' 1" };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [budget, setBudget] = useState(100000);
  const [distance, setDistance] = useState(15);
  const [apartmentType, setApartmentType] = useState("");
  const toggleOptions = useMemo(
    () => [
      { label: "Self Compound", key: "selfCompound" },
      { label: "Shortlets", key: "shortlets" },
      { label: "Shared Compound", key: "sharedCompound" },
      { label: "Non-owner-occupied", key: "nonOwner" },
    ],
    []
  );
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    toggleOptions.reduce((acc, option, index) => {
      const active = index % 2 === 1;
      return { ...acc, [option.key]: active };
    }, {})
  );

  const exploreCards = useMemo<ExploreCard[]>(() => exploreData, []);
  const [cards, setCards] = useState<ExploreCard[]>(exploreCards);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const controls = useAnimation();
  const visibleCards = cards.slice(0, 3);

  const removeTopCard = () => setCards((prev) => prev.slice(1));
  const resetDeck = () => {
    setCards(exploreCards);
    controls.set({ x: 0, rotate: 0, opacity: 1 });
    setIsSwipeAnimating(false);
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (isSwipeAnimating || cards.length === 0) {
      return;
    }

    setIsSwipeAnimating(true);
    await controls.start({
      x: direction === "left" ? -420 : 420,
      rotate: direction === "left" ? -18 : 18,
      opacity: 0,
      transition: { duration: 0.35 },
    });

    removeTopCard();

    if (direction === "right") {
      router.push("/property-details");
    }

    controls.set({ x: 0, rotate: 0, opacity: 1 });
    setIsSwipeAnimating(false);
  };

  const cardBody = (card: ExploreCard) => (
    <>
      <div className="relative h-[65%] w-full pointer-events-none">
        <div className="absolute inset-0">
          <Image
            src={card.image}
            alt={card.alt}
            fill
            sizes="(max-width:768px) 90vw, 640px"
            className="object-cover"
          />
        </div>
        <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold tracking-wide shadow-sm">
          {card.tag}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary to-transparent" />
      </div>

      <div className="flex-1 bg-primary text-white px-6 py-5 flex flex-col justify-between gap-4 pointer-events-none">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-3">
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-bold tracking-tight">{card.price}</h2>
            <span className="text-xl font-medium opacity-80 mb-1.5">{card.period}</span>
          </div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">{card.highlight}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 py-2">
          {card.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center bg-white/10 rounded-xl py-3 px-1 backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-2xl mb-1">{stat.icon}</span>
              <span className="text-lg font-bold">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 mt-1">
          <span className="material-symbols-outlined text-3xl mt-0.5 text-terracotta shrink-0">
            location_on
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold leading-snug opacity-95">{card.address}</p>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1 w-fit border border-white/10 backdrop-blur-sm">
              <span className="material-symbols-outlined text-sm">villa</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-90">
                {card.highlight}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background-light text-[#0c141d] dark:text-slate-50 font-display transition-colors duration-200 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-6 py-4 bg-background-light z-20">
        <div className="relative w-12 h-12">
          <Image
            src="/logo2.svg"
            alt="logo"
            fill
            priority
            className="object-contain scale-[1.8]"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Explore</h1>
        <div className="w-12 flex justify-end">
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-3xl">tune</span>
          </button>
        </div>
      </header>

      {/* Card Stack */}
      <main className="flex-1 flex flex-col justify-center items-center relative w-full max-w-md mx-auto px-4 pb-2">
        <div className="absolute w-[90%] h-[80%] bg-white/50 rounded-[2.5rem] -z-10 translate-y-4 scale-95 shadow-sm border border-slate-200" />

        <div className="relative w-full h-[650px]">
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none hidden lg:flex">
            
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence>
              {visibleCards.map((card, index) => (
                <CardItem
                  key={card.id}
                  card={card}
                  index={index}
                  isFront={index === 0}
                  controls={controls}
                  onSwipe={handleSwipe}
                >
                  {cardBody(card)}
                </CardItem>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {cards.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
            <span className="material-symbols-outlined text-6xl text-gray-300">maps_home_work</span>
            <h3 className="text-xl font-bold text-gray-700">No more listings</h3>
            <p className="text-gray-500">Check back later for new properties.</p>
            <button
              onClick={resetDeck}
              className="mt-4 px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg"
            >
              Reset Deck
            </button>
          </div>
        )}
      </main>

      {/* Action Buttons */}
      <div className="flex-none w-full max-w-md mx-auto px-6 pt-4 pb-8 grid grid-cols-2 gap-6 z-30">
        <button
          onClick={() => handleSwipe("left")}
          disabled={isSwipeAnimating || cards.length === 0}
          className="flex items-center justify-center gap-2 h-20 rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors shadow-sm active:scale-95 duration-150 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-3xl">close</span>
          <span className="text-lg font-bold tracking-wide">PASS</span>
        </button>
        <button
          onClick={() => handleSwipe("right")}
          disabled={isSwipeAnimating || cards.length === 0}
          className="flex items-center justify-center h-20 bg-[#D87C5A] rounded-full text-white hover:brightness-110 transition-all shadow-md active:scale-95 duration-150 ring-4 ring-terracotta/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-[18px] font-bold tracking-wide">INTERESTED</span>
        </button>
      </div>

      {/* Bottom Nav */}
      <nav className="flex-none bg-white dark:bg-background-dark border-t border-slate-200 pb-safe z-30">
        <div className="flex justify-around items-end pt-3 pb-4 px-2">
          {navigation.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex flex-1 flex-col items-center gap-1 group ${
                item.active ? "text-primary" : "text-slate-400"
              }`}
            >
              <div className="p-1 rounded-full group-hover:bg-primary/5 transition-colors">
                <span className="material-symbols-outlined text-3xl" style={solidStyle}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-xs font-semibold ${item.active ? "text-primary" : ""}`}>
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {/* Filters Drawer */}
      <FilterModal
        isOpen={filtersOpen}
        close={() => setFiltersOpen(false)}
        budget={budget}
        setBudget={setBudget}
        distance={distance}
        setDistance={setDistance}
        apartmentType={apartmentType}
        setApartmentType={setApartmentType}
        toggleOptions={toggleOptions}
        toggles={toggles}
        setToggles={setToggles}
      />

      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </div>
  );
}

type CardItemProps = {
  card: ExploreCard;
  index: number;
  isFront: boolean;
  controls: ReturnType<typeof useAnimation>;
  onSwipe: (direction: "left" | "right") => Promise<void>;
  children: ReactNode;
};

function CardItem({ card, index, isFront, controls, onSwipe, children }: CardItemProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const threshold = 120;
    if (info.offset.x > threshold) {
      await onSwipe("right");
    } else if (info.offset.x < -threshold) {
      await onSwipe("left");
    }
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-2"
        style={{
          zIndex: isFront ? 50 : 40 - index,
          x,
          rotate,
          scale: isFront ? 1 : 1 - index * 0.04,
          y: isFront ? 0 : index * 24,
        }}
      animate={isFront ? controls : undefined}
      drag={isFront ? "x" : false}
      dragElastic={0.19}
      onDragEnd={handleDragEnd}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
    >
      <div className="w-full h-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-card border border-slate-100 flex flex-col cursor-grab active:cursor-grabbing select-none relative">
        {children}
      </div>
    </motion.div>
  );
}

function FilterModal({
  isOpen,
  close,
  budget,
  setBudget,
  distance,
  setDistance,
  apartmentType,
  setApartmentType,
  toggleOptions,
  toggles,
  setToggles,
}: FilterModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={close} />
      <div className="relative ml-auto w-full max-w-[80vw] md:max-w-xs">
        <div className="h-full bg-white shadow-2xl rounded-l-3xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
            <button
              onClick={close}
              className="rounded-full p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-active-blue"
            >
              <span className="sr-only">Close panel</span>
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-gray-900">Budget</label>
                <span className="text-xs font-semibold text-active-blue">
                  ${budget.toLocaleString()} /mo
                </span>
              </div>
              <input
                className="w-full h-1.5 bg-gray-200 rounded-lg accent-active-blue focus:ring-0 border-0"
                type="range"
                min={100000}
                max={20000000}
                step={50000}
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>100k</span>
                <span>20mil</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-gray-900">Distance</label>
                <span className="text-xs font-semibold text-active-blue">{distance}km</span>
              </div>
              <input
                className="w-full h-1.5 bg-gray-200 rounded-lg accent-active-blue focus:ring-0 border-0"
                type="range"
                min={1}
                max={50}
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>1km</span>
                <span>50km</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-900 block">Type of Apartment</label>
              <div className="relative">
                <select
                  value={apartmentType}
                  onChange={(event) => setApartmentType(event.target.value)}
                  className="w-full py-3.5 pl-4 pr-10 text-sm font-medium bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-active-blue focus:border-active-blue appearance-none transition-shadow"
                >
                  <option value="" disabled>
                    Select Type of Apartment
                  </option>
                  <option value="singleRoom">Single Room</option>
                  <option value="miniflat">Mini Flat</option>
                  <option value="studio1">Studio (1 Bedroom)</option>
                  <option value="two">2 Bedrooms</option>
                  <option value="threePlus">3+ Bedrooms</option>
                  <option value="fourPlus">4+ Bedroom</option>
                  <option value="duplex">Duplex</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="material-symbols-outlined text-gray-500">expand_more</span>
                </div>
              </div>
            </div>

            <div className="space-y-5 pt-2 border-t border-gray-50 mt-4">
              {toggleOptions.map((option) => {
                const isActive = toggles[option.key];
                return (
                  <div key={option.key} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() =>
                        setToggles((prev) => ({
                          ...prev,
                          [option.key]: !prev[option.key],
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition duration-200 ease-in-out ${
                        isActive ? "bg-primary border-transparent" : "bg-gray-200 border-transparent"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-6 bg-gray-50/50 mt-6 -mx-6">
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl bg-white px-3 py-3.5 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                onClick={() => {
                  setBudget(100000);
                  setDistance(15);
                  setApartmentType("");
                  setToggles(
                    toggleOptions.reduce<Record<string, boolean>>(
                      (acc, option) => ({ ...acc, [option.key]: false }),
                      {}
                    )
                  );
                }}
              >
                Reset
              </button>
              <button className="flex-[2] rounded-xl bg-primary px-3 py-3.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
