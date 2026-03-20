"use client";

import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";

function AnimatedCounter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (inView) {
      const controls = animate(0, to, {
        duration: 2,
        ease: "easeOut",
        onUpdate(value) {
          if (ref.current) {
            ref.current.textContent = value.toFixed(decimals) + suffix;
          }
        },
      });
      return () => controls.stop();
    }
  }, [inView, to, suffix, decimals]);

  return <span ref={ref}>0{suffix}</span>;
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > window.innerHeight);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const companyLogos = [
    { name: "The Trade Desk" }, { name: "The Motley Fool" }, { name: "Flexport" },
    { name: "Redwood Materials" }, { name: "Dr. Squatch" }, { name: "Vercel" }, { name: "Arch" },
    { name: "Peloton" }, { name: "CrunchBase" }, { name: "Discord" }, { name: "Remote.com" },
    { name: "VastSpace" }, { name: "HackerRank" }, { name: "Colorado School of Mines" }, { name: "Instacart" },
    { name: "Universal Music Group" }, { name: "Nike" }, { name: "Nordstrom" }, { name: "Amazon" },
    { name: "PNC Bank" }, { name: "GeoTab" }, { name: "Repay" }, { name: "Apptronik" },
    { name: "Lattice" }, { name: "Angi" }, { name: "MoniePoint" }, { name: "U.S. Bank" },
    { name: "RocketLabs" }, { name: "Airbyte" }, { name: "Marshmallow" }, { name: "vast.ai" },
    { name: "Zapier" }, { name: "Amplitude" }, { name: "TD Bank" }, { name: "SleepNumber" },
    { name: "Hertz" }, { name: "Kleiner Perkins" }, { name: "Tennr" }, { name: "Intuitive" },
    { name: "Workera.ai" }, { name: "Nielsen IQ" }, { name: "Trimble" }, { name: "Perpay" },
    { name: "Asurion" }, { name: "Northwood Space" }, { name: "Checkbook.io" }, { name: "Vail Health" },
    { name: "Geico" }, { name: "Harbinger Motors" }, { name: "Red Bull" }, { name: "Coinbase" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-light text-text-main-light">
      <Head>
        <title>Get a Roof - The Real Estate App</title>
      </Head>

      {/* Screen Reader Only SEO Text */}
      <div className="sr-only" aria-hidden="true">
        <h1>Get a Roof - The Real Estate App</h1>
        <p>Get a Roof is tinder but for get homes. Since our inception in Aug. 2024, we&apos;ve facilitated over 7.5 million swipes, helping candidates secure hundreds of interviews daily.</p>
        <p>Our app currently hosts 1.6 million jobs, and this number is growing rapidly. After you upload your resume, you can swipe right on jobs you want and swipe left on the jobs you don&apos;t want.</p>
      </div>

      <main className="flex-1 relative">
        {/* Sticky Top Nav Container (Translates on scroll) */}
        <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${isScrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
          <div className="p-4">
            <div className="flex h-14 items-center justify-end">
              <Link href="/download" className="inline-flex items-center justify-center font-bold text-primary border border-gray-200 hover:border-primary h-10 md:h-12 rounded-full bg-white/90 px-4 md:px-6 py-1.5 md:py-2 shadow-soft backdrop-blur-lg transition-all duration-300 text-sm md:text-base hover:bg-primary hover:text-white">
                Get Started →
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Area */}
        <div className="relative h-screen w-full overflow-hidden rounded-3xl border-8 border-white bg-black">
          <video className="h-full w-full object-cover opacity-90" poster="/landingpage/images/preLoad.png" muted loop playsInline autoPlay>
            <source src="/landingpage/media/Swiping%20Video%20w%20New%20Screens.mp4" type="video/mp4" />
          </video>

          <div className="absolute top-0 left-0 right-0 z-10">
            <header className="p-4 relative z-50">
              <div className="flex h-16 md:h-20 items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-8 md:gap-10">
                  <div className="md:hidden">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="z-50 relative w-8 h-8 text-white transition-all duration-300 drop-shadow-md">
                      <span className="material-symbols-outlined text-3xl">{isMenuOpen ? "close" : "menu"}</span>
                    </button>
                  </div>
                  <Link href="/" className="hidden md:flex relative w-20 h-20 md:w-24 md:h-24 mt-2 md:mt-3 items-center justify-center z-50 transition-transform hover:scale-105">
                    <Image
                      src="/logo2.svg"
                      alt="logo"
                      fill
                      priority
                      className="object-contain scale-[2] md:scale-[2.5]"
                    />
                  </Link>
                </div>

                <div className="flex items-center gap-4">
                  <nav className="hidden md:flex items-center gap-8 text-white/90 font-medium">
                    <Link href="/blog" className="hover:text-white transition-colors drop-shadow-md">Blog</Link>
                    <Link href="/docs/case-studies" className="hover:text-white transition-colors drop-shadow-md">Case Studies</Link>
                    <Link href="/love" className="hover:text-white transition-colors drop-shadow-md">Love</Link>
                  </nav>

                  <div className="flex items-center">
                    <Link href="/download" className="inline-flex items-center justify-center font-bold text-primary border border-gray-200 hover:border-primary h-10 md:h-12 bg-white/90 backdrop-blur-sm hover:bg-primary hover:text-white rounded-full transition-all duration-300 text-sm md:text-base px-5 md:px-6 py-1.5 md:py-2.5 shadow-soft">
                      Get Started →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Mobile Drawer */}
              <div className={`fixed inset-0 bg-white z-[60] transition-transform duration-500 ease-in-out md:hidden flex flex-col p-8 pt-8 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex items-center justify-between w-full mb-12">
                  <Link href="/" className="relative w-10 h-10 transition-transform hover:scale-105 ml-2" onClick={() => setIsMenuOpen(false)}>
                    <Image src="/logo2.svg" alt="logo" fill priority className="object-contain scale-[2]" />
                  </Link>
                  <button onClick={() => setIsMenuOpen(false)} className="text-text-main-light p-2 transition-transform hover:scale-110 active:scale-95">
                    <span className="material-symbols-outlined text-4xl">close</span>
                  </button>
                </div>
                <nav className="flex flex-col gap-y-6">
                  <Link href="/blog" className="text-3xl font-light text-text-main-light transition-all duration-300 hover:translate-x-2" onClick={() => setIsMenuOpen(false)}>Blog</Link>
                  <Link href="/docs/case-studies" className="text-3xl font-light text-text-main-light transition-all duration-300 hover:translate-x-2" onClick={() => setIsMenuOpen(false)}>Case Studies</Link>
                  <Link href="/love" className="text-3xl font-light text-text-main-light transition-all duration-300 hover:translate-x-2" onClick={() => setIsMenuOpen(false)}>Love</Link>
                </nav>
              </div>
            </header>
          </div>

          <div className="absolute bottom-4 right-4 w-24 h-24 hidden md:block">
            <Link href="/download" target="_blank">
              <div className="relative w-full h-full hover:scale-105 transition-transform duration-300">
                <Image alt="QR Code" src="/landingpage/images/image.png" fill className="object-contain drop-shadow-md" sizes="96px" />
              </div>
            </Link>
          </div>
        </div>

        {/* Company Logos Grid */}
        <div className="py-20 px-4 md:px-8 bg-background-light">
          <div className="w-full text-center mb-16 max-w-7xl mx-auto min-h-[50vh]">
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 text-primary tracking-tight">Where Our Users Land Their Dream Jobs</h2>
              <p className="text-lg md:text-xl text-text-sub-light max-w-4xl mx-auto leading-relaxed">
                From Fortune 500 companies to innovative startups, our users consistently secure interviews and offers at the world&apos;s most desirable workplaces.
              </p>
            </div>

            <div className="relative grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-6 px-4">
              {companyLogos.map((logo, idx) => (
                <motion.div
                  key={idx}
                  initial={{ y: 20, scale: 0.9, opacity: 0.1 }}
                  whileInView={{ y: 0, scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: (idx % 8) * 0.05 }}
                  className="flex justify-center items-center p-3 cursor-default hover:!scale-105"
                  title={logo.name}
                >
                  <div className="rounded-lg overflow-hidden py-2 px-3 bg-surface-dark/5 text-xs md:text-sm font-semibold text-text-main-light w-full text-center truncate shadow-sm transition-all duration-300 opacity-60 hover:opacity-100">
                    {logo.name}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Area */}
        <div className="w-full text-center py-20 bg-primary/5 border-y border-primary/10">
          <div className="mb-14">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-primary">Join the 700K+ people who trust Get a Roof</h2>
            <p className="text-lg md:text-xl text-text-sub-light max-w-3xl mx-auto px-4">
              Our platform connects talented individuals with opportunities at leading companies.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto px-8">
            <div className="text-center p-8 rounded-3xl bg-surface-light shadow-soft border border-primary/5 hover:border-primary/20 transition-colors">
              <p className="text-5xl md:text-6xl font-black text-primary">
                <AnimatedCounter to={7.5} decimals={1} suffix="M+" />
              </p>
              <p className="text-sm md:text-base font-medium text-text-sub-light mt-4 uppercase tracking-wider">Swipes since Aug. 2024</p>
            </div>
            <div className="text-center p-8 rounded-3xl bg-surface-light shadow-soft border border-primary/5 hover:border-primary/20 transition-colors">
              <p className="text-5xl md:text-6xl font-black text-primary">
                <AnimatedCounter to={1.6} decimals={1} suffix="M+" />
              </p>
              <p className="text-sm md:text-base font-medium text-text-sub-light mt-4 uppercase tracking-wider">Jobs available</p>
            </div>
            <div className="text-center p-8 rounded-3xl bg-surface-light shadow-soft border border-primary/5 hover:border-primary/20 transition-colors">
              <p className="text-5xl md:text-6xl font-black text-primary">
                <AnimatedCounter to={100} decimals={0} suffix="s" />
              </p>
              <p className="text-sm md:text-base font-medium text-text-sub-light mt-4 uppercase tracking-wider">Interviews & offers Weekly</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Area */}
      <footer className="py-12 md:py-16 px-6 md:px-12 bg-background-light">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
              <div className="w-16 md:w-20 h-16 md:h-20 mx-auto relative mb-4">
                <Image alt="Get a Roof Logo" src="/logo2.svg" fill className="object-contain scale-[1.8]" />
              </div>
              <p className="text-lg font-bold tracking-[0.2em] uppercase text-primary">Get a Roof</p>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 border-t border-gray-200">
            <div className="flex items-center space-x-6">
              <a target="_blank" rel="noopener noreferrer" className="text-text-sub-light hover:text-primary transition-colors flex items-center justify-center" href="mailto:founders@getaroof.com">
                <span className="material-symbols-outlined text-2xl">mail</span>
                <span className="sr-only">Email</span>
              </a>
              <a target="_blank" rel="noopener noreferrer" className="text-text-sub-light hover:text-primary transition-colors flex items-center justify-center" href="https://x.com/getaroofjobs">
                <span className="material-symbols-outlined text-2xl">language</span>
                <span className="sr-only">Twitter Placeholder</span>
              </a>
              <a target="_blank" rel="noopener noreferrer" className="text-text-sub-light hover:text-primary transition-colors flex items-center justify-center" href="https://linkedin.com/company/getaroofjobs">
                <span className="material-symbols-outlined text-2xl">work</span>
                <span className="sr-only">LinkedIn</span>
              </a>
              <a target="_blank" rel="noopener noreferrer" className="text-text-sub-light hover:text-primary transition-colors flex items-center justify-center" href="https://www.instagram.com/getaroofjobs/">
                <span className="material-symbols-outlined text-2xl">photo_camera</span>
                <span className="sr-only">Instagram</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-sm md:text-base">
              <Link className="text-text-sub-light hover:text-primary transition-colors flex items-center gap-1.5" href="/passport">
                <span className="material-symbols-outlined text-lg">smartphone</span> Mobile App
              </Link>
              <Link className="text-text-sub-light hover:text-primary transition-colors flex items-center gap-1.5" href="/blog">
                <span className="material-symbols-outlined text-lg">menu_book</span> Blog
              </Link>
              <Link className="text-text-sub-light hover:text-primary transition-colors flex items-center gap-1.5" href="/docs/terms-and-conditions">
                <span className="material-symbols-outlined text-lg">description</span> T&C
              </Link>
              <Link className="text-text-sub-light hover:text-primary transition-colors flex items-center gap-1.5" href="/docs/privacy-policy">
                <span className="material-symbols-outlined text-lg">security</span> Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
