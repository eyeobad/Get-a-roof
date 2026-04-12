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
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { title: "No Extra Charges", desc: "You see what you're paying for. No hidden add-ons. No stacked agent billing." },
    { title: "Verified Listings", desc: "Real properties from confirmed owners, so you avoid fake houses and wasted transport costs." },
    { title: "Secure Payments", desc: "Transactions happen through protected channels, not informal transfers or stories later." },
    { title: "Fewer Middlemen", desc: "Direct landlord-to-renter connection reduces unnecessary hands and inflated fees." },
    { title: "Clear Records", desc: "Every step is documented, so agreements remain transparent and traceable." },
    { title: "Compliance Checks", desc: "Verification and regulatory screening keep listings legitimate and transactions clean." },
  ];

  const insights = [
    { title: "Nigeria Rent Crisis", img: "Rent.jpg" },
    { title: "Hidden Rent Fees In Nigeria", img: "Breakdown-of-rent-and-other-charges.png" },
    { title: "Agent Fees Inflate Rent", img: "inflation_line_chart-1920x1152-1.png" },
    { title: "Direct Renting Saves You", img: "National-Housing-Programme.jpg" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-light text-text-main-light overflow-x-hidden w-full">
      <Head>
        <title>Get a Roof | Real Estate Matchmaking in Nigeria</title>
      </Head>

      <main className="flex-1 relative w-full overflow-x-hidden">
        {/* Sticky Navbar */}
        <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white shadow-md py-2" : "bg-transparent py-4"}`}>
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center h-14 md:h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 z-50 mt-2 transform scale-125 md:scale-[1.4] origin-left transition-transform">
                <Image src="/logo2.svg" alt="Get a Roof Logo" width={80} height={80} className="object-contain" />
              </Link>
              <nav className="hidden md:flex items-center gap-8 font-medium">
                <Link href="#" className={`transition-colors hover:text-primary ${isScrolled ? "text-text-main-light" : "text-white"}`}>Home</Link>
                <Link href="#" className={`transition-colors hover:text-primary ${isScrolled ? "text-text-main-light" : "text-white"}`}>Features</Link>
                <Link href="#" className={`transition-colors hover:text-primary ${isScrolled ? "text-text-main-light" : "text-white"}`}>About</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:block origin-center"
              >
                <Link href="#" className="inline-flex items-center justify-center font-bold bg-primary text-white px-6 py-2.5 rounded-full shadow-lg shadow-primary/40 transition-colors hover:bg-primary-hover">
                  JOIN WAITING LIST
                </Link>
              </motion.div>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden z-50 relative p-2 text-primary bg-white rounded-md shadow-sm">
                <span className="material-symbols-outlined text-3xl">{isMenuOpen ? "close" : "menu"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <div className={`fixed inset-0 bg-white z-[40] pt-24 px-6 md:hidden transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
          <nav className="flex flex-col gap-6 text-2xl font-semibold text-text-main-light">
            <Link href="#" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link href="#" onClick={() => setIsMenuOpen(false)}>Features</Link>
            <Link href="#" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link href="#" className="bg-primary text-white text-center py-4 rounded-full mt-4" onClick={() => setIsMenuOpen(false)}>JOIN WAITING LIST</Link>
          </nav>
        </div>

        {/* Hero Area */}
        <div className="relative min-h-[90vh] md:min-h-screen w-full flex items-center justify-center overflow-hidden bg-black">
          <video className="absolute inset-0 w-full h-full object-cover opacity-60" autoPlay muted loop playsInline>
             <source src="/landingpage/media/Swiping%20Video%20w%20New%20Screens.mp4" type="video/mp4" />
          </video>
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 text-center text-white mt-24">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-[2px] w-12 md:w-16 bg-gray-300 shrink-0"></div>
              <span className="text-white text-sm md:text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap">Launching Soon</span>
              <div className="h-[2px] w-12 md:w-16 bg-gray-300 shrink-0"></div>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">Stop Paying Excess Fees <br className="hidden md:block"/> to Rent Property</h1>
             <p className="text-base md:text-xl text-gray-200 max-w-2xl mx-auto mb-10 font-normal leading-relaxed drop-shadow-md">
              Get a Roof is a real estate matchmaking platform that connects renters directly with verified landlords and property owners, so you avoid stacked agent charges, unnecessary fees, and fake listings. Pay mainly for the property, not the process.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#" className="w-full sm:w-auto inline-flex items-center justify-center font-bold bg-primary text-white hover:bg-primary-hover px-8 py-4 rounded-full transition-all duration-300 shadow-xl hover:-translate-y-1 text-lg">
                Join Waiting List
              </Link>
            </div>
          </div>
        </div>

        {/* Introduction / Highlights */}
        <div className="py-24 px-4 md:px-8 bg-surface-light w-full overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              
              {/* Left Side: Overlapping Phones */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full lg:w-1/2 relative h-[500px] md:h-[600px] flex items-center justify-center"
              >
                <div className="relative w-full h-full max-w-md mx-auto">
                  <Image src="/crestapp/images/944dc462-c50e-4981-a0c3-c5791aafe3cd-1.jpg" alt="Get a Roof UI on Phone" fill className="object-contain" />
                </div>
              </motion.div>

              {/* Right Side: Text and Stacked Cards */}
              <div className="w-full lg:w-1/2 flex flex-col items-start text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-primary font-bold tracking-wider uppercase mb-3 block text-sm md:text-base">Introduction to Get a Roof</span>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-text-main-light mb-6 leading-tight">Housing Costs Are High Enough Already</h2>
                  <p className="text-lg text-text-sub-light mb-10 leading-relaxed max-w-2xl">
                    Across Nigeria, renters often pay more in agent fees and extra charges than the actual rent. Get a Roof changes this through direct property access, verified owners, and smarter matchmaking between renters and landlords.
                  </p>
                </motion.div>

                {/* Stacked Cards */}
                <div className="flex flex-col gap-6 w-full max-w-xl">
                  {/* Card 01 */}
                  <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-background-light p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 border border-transparent hover:border-primary/20 cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors duration-300">
                      <span className="text-primary text-2xl font-black group-hover:scale-110 transition-transform duration-300">01</span>
                    </div>
                    <div>
                      <h3 className="text-text-main-light text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">Direct Listings</h3>
                      <p className="text-text-sub-light text-sm md:text-base leading-relaxed">Landlords and property owners list directly, so renters avoid stacked agent fees and unnecessary middle costs.</p>
                    </div>
                  </motion.div>

                  {/* Card 02 */}
                  <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-background-light p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 border border-transparent hover:border-primary/20 cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors duration-300">
                      <span className="text-primary text-2xl font-black group-hover:scale-110 transition-transform duration-300">02</span>
                    </div>
                    <div>
                      <h3 className="text-text-main-light text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">Secure Transactions</h3>
                      <p className="text-text-sub-light text-sm md:text-base leading-relaxed">Payments and agreements follow a monitored, structured process, so both parties transact with clarity and protection.</p>
                    </div>
                  </motion.div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Why Get a Roof (Features Custom Layout) */}
        <div className="py-24 px-4 md:px-8 bg-surface-light w-full relative overflow-hidden">
          {/* subtle animated background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

          {/* Rotating Subtle Background Rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-[0.05] pointer-events-none origin-center"
          >
            <div className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full border-[2px] border-primary border-dashed absolute"></div>
            <div className="w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full border-[2px] border-primary border-dashed absolute"></div>
            <div className="w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] rounded-full border-[2px] border-primary border-dashed absolute"></div>
          </motion.div>

          <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 mt-4 md:mt-10">
            
            {/* Left Features */}
            <div className="flex flex-col gap-12 w-full lg:w-[32%] relative z-20">
               {[
                 {
                   title: "No Extra Charges",
                   desc: "You see what you're paying for. No hidden add-ons. No stacked agent billing.",
                   icon: "credit_card"
                 },
                 {
                   title: "Verified Listings",
                   desc: "Real properties from confirmed owners, so you avoid fake houses and wasted transport costs.",
                   icon: "verified"
                 },
                 {
                   title: "Secure Payments",
                   desc: "Transactions happen through protected channels, not informal transfers or stories later.",
                   icon: "lock"
                 }
               ].map((item, idx) => (
                 <motion.div 
                   key={idx}
                   initial={{ opacity: 0, x: -30 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: true, margin: "-50px" }}
                   transition={{ delay: idx * 0.1, duration: 0.6 }}
                   whileHover={{ scale: 1.02 }}
                   className="flex flex-col-reverse md:flex-row flex-col lg:flex-row items-start md:items-center lg:items-start xl:items-center gap-4 xl:gap-6 justify-end w-full group cursor-pointer bg-white/40 lg:bg-transparent p-6 lg:p-0 rounded-2xl lg:rounded-none backdrop-blur-sm lg:backdrop-blur-none border border-white/50 lg:border-transparent hover:bg-white/80 transition-all duration-300"
                 >
                   <div className="text-left md:text-right lg:text-left flex-1">
                     <h3 className="text-xl font-bold mb-2 text-text-main-light group-hover:text-primary transition-colors duration-300">{item.title}</h3>
                     <p className="text-text-sub-light text-sm leading-relaxed">{item.desc}</p>
                   </div>
                   <div className="w-16 h-16 rounded-full border border-primary/20 bg-white flex items-center justify-center shrink-0 shadow-lg group-hover:bg-primary group-hover:shadow-2xl group-hover:shadow-primary/40 transition-all duration-300 relative z-30">
                      <span className="material-symbols-outlined text-3xl text-primary group-hover:text-white transition-colors duration-300">{item.icon}</span>
                   </div>
                 </motion.div>
               ))}
            </div>

            {/* Center Image (Phones) */}
            <div className="w-full lg:w-[36%] flex justify-center relative my-16 lg:my-0 z-10 pointer-events-none">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.8, y: 30 }}
                 whileInView={{ opacity: 1, scale: 1, y: 0 }}
                 viewport={{ once: true, margin: "-50px" }}
                 animate={{ y: [0, -15, 0] }}
                 transition={{ 
                   opacity: { duration: 0.8, ease: "easeOut" },
                   scale: { duration: 0.8, ease: "easeOut" },
                   y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
                 }}
                 className="relative w-[300px] h-[450px] sm:w-[400px] sm:h-[600px] shrink-0"
               >
                 <Image src="/crestapp/images/WhatsApp_Image_2026-02-25_at_17.34.23-removebg-preview-1.png" alt="Get a Roof Devices" fill className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:drop-shadow-[0_30px_60px_rgba(0,0,0,0.25)] transition-all duration-700 ease-out" />
               </motion.div>
            </div>

            {/* Right Features */}
            <div className="flex flex-col gap-12 w-full lg:w-[32%] relative z-20">
               {[
                 {
                   title: "Fewer Middlemen",
                   desc: "Direct landlord-to-renter connection reduces unnecessary hands and inflated fees.",
                   icon: "support_agent"
                 },
                 {
                   title: "Clear Records",
                   desc: "Every step is documented, so agreements remain transparent and traceable.",
                   icon: "receipt_long"
                 },
                 {
                   title: "Compliance Checks",
                   desc: "Verification and regulatory screening keep listings legitimate and transactions clean.",
                   icon: "engineering"
                 }
               ].map((item, idx) => (
                 <motion.div 
                   key={idx}
                   initial={{ opacity: 0, x: 30 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: true, margin: "-50px" }}
                   transition={{ delay: idx * 0.1, duration: 0.6 }}
                   whileHover={{ scale: 1.02 }}
                   className="flex items-start md:items-center lg:items-start xl:items-center gap-4 xl:gap-6 justify-start w-full group cursor-pointer bg-white/40 lg:bg-transparent p-6 lg:p-0 rounded-2xl lg:rounded-none backdrop-blur-sm lg:backdrop-blur-none border border-white/50 lg:border-transparent hover:bg-white/80 transition-all duration-300"
                 >
                   <div className="w-16 h-16 rounded-full border border-primary/20 bg-white flex items-center justify-center shrink-0 shadow-lg group-hover:bg-primary group-hover:shadow-2xl group-hover:shadow-primary/40 transition-all duration-300 relative z-30">
                      <span className="material-symbols-outlined text-3xl text-primary group-hover:text-white transition-colors duration-300">{item.icon}</span>
                   </div>
                   <div className="text-left flex-1">
                     <h3 className="text-xl font-bold mb-2 text-text-main-light group-hover:text-primary transition-colors duration-300">{item.title}</h3>
                     <p className="text-text-sub-light text-sm leading-relaxed">{item.desc}</p>
                   </div>
                 </motion.div>
               ))}
            </div>
          </div>
        </div>

        {/* Days To Go Counter CTA */}
        <div className="py-24 px-4 md:px-8 bg-surface-light border-y border-gray-200 w-full text-center">
           <div className="max-w-4xl mx-auto">
             <h2 className="text-4xl md:text-6xl font-black text-primary mb-4">
               <AnimatedCounter to={11} decimals={0} /> Days To Go
             </h2>
             <p className="text-xl text-text-sub-light mb-10">Be among the first renters, landlords, and shortlet owners to access Get a Roof and use real estate matchmaking without excess charges.</p>
             <Link href="#" className="inline-flex items-center justify-center font-bold bg-primary text-white hover:bg-primary-hover px-10 py-5 rounded-full transition-all duration-300 shadow-lg hover:-translate-y-1 text-xl">
                Join the Waiting List
             </Link>
           </div>
        </div>

        {/* Latest Insights Grid */}
        <div className="py-24 px-4 md:px-8 bg-background-light w-full">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
               <span className="text-primary font-bold tracking-wider uppercase mb-2 block">Insights</span>
               <h2 className="text-3xl md:text-5xl font-extrabold text-text-main-light">Real Estate Without Excess Charges</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {insights.map((insight, idx) => (
                 <motion.div 
                    key={idx}
                    initial={{ y: 30, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                 >
                   <Link href="#" className="group block bg-surface-light rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 hover:border-primary/20">
                     <div className="relative h-48 w-full bg-gray-200 overflow-hidden">
                       <Image src={`/crestapp/images/${insight.img}`} alt={insight.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                     </div>
                     <div className="p-6">
                       <h3 className="text-lg font-bold text-text-main-light mb-2 group-hover:text-primary transition-colors duration-300">{insight.title}</h3>
                       <span className="text-sm text-primary font-medium flex items-center gap-1 mt-4 group-hover:translate-x-2 transition-transform duration-300">Learn More <span className="material-symbols-outlined text-sm">arrow_forward</span></span>
                     </div>
                   </Link>
                 </motion.div>
               ))}
            </div>
          </div>
        </div>

      </main>

      {/* Footer Area */}
      <footer className="bg-background-light text-text-main-light pt-20 pb-10 px-6 md:px-12 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <Image src="/logo2.svg" alt="Get a Roof" width={140} height={40} className="object-contain mb-6" />
               <p className="text-sm text-text-sub-light mb-6 leading-relaxed">
                 Get a Roof is Nigeria's real estate matchmaking platform. We help renters, landlords, shortlet owners and developers connect without inflated fees, agent chains or transaction uncertainty.
               </p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm text-text-sub-light">
                <li><Link href="#" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-6">Contact</h4>
              <ul className="space-y-4 text-sm text-text-sub-light">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-xl text-primary">location_on</span>
                  <span>Address: Lagos, Nigeria.</span>
                </li>
                <li className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-xl text-primary">mail</span>
                   <a href="mailto:support@getaroof.ng" className="hover:text-primary transition-colors">support@getaroof.ng</a>
                </li>
                <li className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-xl text-primary">phone</span>
                   <a href="tel:+2349069370727" className="hover:text-primary transition-colors">+234 906 937 0727</a>
                </li>
              </ul>
            </div>

            <div>
               <h4 className="text-lg font-bold mb-6">Questions? Talk to Us</h4>
               <p className="text-sm text-text-sub-light mb-6">Need help, want to list early, or want to partner with Get a Roof? Send a message and we will respond.</p>
               <Link href="#" className="inline-block bg-primary text-white hover:bg-primary-hover px-6 py-3 rounded-xl font-bold transition-colors">
                  Join Waiting List
               </Link>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-text-sub-light">(c) Get a Roof. A real estate matchmaking platform.</p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-text-sub-light"><span className="material-symbols-outlined">language</span></a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-text-sub-light"><span className="material-symbols-outlined">photo_camera</span></a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-text-sub-light"><span className="material-symbols-outlined">chat</span></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
