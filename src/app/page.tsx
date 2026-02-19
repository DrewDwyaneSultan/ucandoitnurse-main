"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCookieConsent } from "@/components/ui/cookie-consent";
import { Button } from "@/components/ui/button";
import { ChevronsRight, BookText, Settings2, LineChart } from "lucide-react";
import dynamic from "next/dynamic";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// Dynamically import the 3D model
const NurseModel3D = dynamic(() => import("@/components/NurseModel3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-light tracking-widest uppercase text-sm">Loading Experience</div>
    </div>
  ),
});

const fadeInUp: Variants = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Cookies link component that triggers the cookie modal
function CookiesLink() {
  const { setShowModal } = useCookieConsent();
  return (
    <button
      onClick={() => setShowModal(true)}
      className="hover:text-white transition-colors"
    >
      COOKIES
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-[#FDFBF9] selection:bg-gray-900 selection:text-white overflow-x-hidden">
      {/* Fixed Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <NurseModel3D />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FDFBF9]/80" />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-white/50 backdrop-blur-md border-b border-white/20 pointer-events-auto transition-all"
      >
        <div className="flex items-center gap-4">
          <span className="hidden md:block tracking-tight text-gray-800 font-poppins">
            <Image src="/logo/hly.svg" alt="HLY Logo" width={50} height={50} />
          </span>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-24 h-10 bg-gray-200/50 animate-pulse rounded-full" />
          ) : user ? (
            <>
              {/* pricing removed - app is free */}
              <Button
                onClick={() => router.push("/dashboard")}
                className="rounded-full bg-gray-900 text-white px-8 py-6 hover:bg-gray-800 hover:scale-105 transition-all duration-300"
              >
                Dashboard
              </Button>

            </>
          ) : (
            <>
              <Button onClick={() => router.push("/login")} variant="ghost" className="text-gray-800 hover:text-black font-medium tracking-wide hover:bg-white/40">
                Sign In
              </Button>
              <Button
                onClick={() => router.push("/signup")}
                className="rounded-full bg-gray-900 text-white px-8 py-6 hover:bg-gray-800 hover:scale-105 transition-all duration-300"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </motion.nav>

      {/* Scrollable Content */}
      <div className="relative z-10">

        {/* HERO SECTION */}
        <section className="min-h-screen flex flex-col justify-end px-6 md:px-12 pb-24 pt-32 relative">
          <div className="absolute top-32 right-6 md:right-12 max-w-sm text-right z-20">
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-sm md:text-lg text-gray-500 leading-relaxed font-poppins"
            >
              Master <br />
              Your<br />
              Craft
            </motion.p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="max-w-[90vw]"
          >
            <motion.div variants={fadeInUp} className="overflow-hidden">
              <h1 className="text-[14vw] leading-[0.85] font-light tracking-tighter text-gray-900 font-caladea">
                Nursing
              </h1>
            </motion.div>
            <motion.div variants={fadeInUp} className="overflow-hidden flex items-end gap-6 md:gap-12 flex-wrap">
              <h1 className="text-[14vw] leading-[0.85] font-light tracking-tighter text-gray-400 font-caladea">
                Prep<span className="italic">Cards</span>
              </h1>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-12 right-12 hidden md:flex items-center gap-4"
          >
            <span className="text-xs tracking-widest uppercase text-gray-500">Scroll to Explore</span>
          </motion.div>
        </section>

        {/* FEATURES / BENTO GRID */}
        <section className="px-6 md:px-12 py-32 bg-white relative rounded-t-[3rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.05)]">
          <div className="max-w-7xl mx-auto">
            <div className="mb-24">
              <span className="text-xs font-bold tracking-widest text-[#5B79A6] uppercase mb-4 block">Capabilities</span>
              <h2 className="text-5xl md:text-7xl font-normal text-gray-900 tracking-tight leading-tight font-caladea">
                Get Familiar <br />
                <span className="text-gray-400"><span className="italic">w/</span> this tool</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
              {/* Main Large Card */}
              <motion.div
                whileHover={{ scale: 0.98 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="md:col-span-2 bg-[#F3F4F6] rounded-3xl p-8 md:p-12 relative overflow-hidden group cursor-pointer"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-6">
                    <BookText className="w-5 h-5 text-gray-900 rotate-30  group-hover:scale-125 transition-all duration-700 group-hover:rotate-10" />
                  </div>
                  <h3 className="text-4xl font-normal text-gray-900 mb-4 font-caladea">Upload Your Books</h3>
                  <p className="text-gray-600 max-w-sm text-lg font-poppins">Upload your PDFs and let our AI extract key concepts, creating a set of flashcards.</p>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-[#E5E7EB] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Image
                  src="/models/nurse_kyoko_rival_schools_plushie/textures/material_0_baseColor.png"
                  className="absolute -right-10 -bottom-20 w-[240px] h-[240px] md:w-[320px] md:h-[320px] lg:w-[400px] lg:h-[400px] object-cover opacity-20 group-hover:opacity-80 group-hover:-rotate-10 group-hover:scale-110 transition-all duration-700 mix-blend-multiply rotate-12"
                  alt="Decoration"
                  width={400}
                  height={400}
                />
              </motion.div>

              {/* Stacked Side Cards */}
              <div className="grid grid-rows-2 gap-6">
                <motion.div
                  whileHover={{ scale: 0.98 }}
                  className="bg-gray-900 rounded-3xl p-8 relative overflow-hidden group cursor-pointer"
                >
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                      <Settings2 className="w-4 h-4 text-white fill-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl text-white mb-2 font-caladea">AI Simulation</h3>
                      <p className="text-gray-400 text-sm font-poppins">PNLE-style question generation.</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>

                <motion.div
                  whileHover={{ scale: 0.98 }}
                  className="bg-[#EBE8E3] rounded-3xl p-8 relative overflow-hidden group cursor-pointer"
                >
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                      <LineChart className="w-5 h-5 text-gray-900" />
                    </div>
                    <div>
                      <h3 className="text-2xl text-gray-900 mb-2 font-caladea">Progress Tracking</h3>
                      <p className="text-gray-600 text-sm font-poppins">Visual analytics of your mastery.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section >

        {/* HOW IT WORKS */}
        < section className="px-6 md:px-12 py-32 bg-[#FDFBF9]" >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
              <h2 className="text-5xl md:text-7xl font-normal text-gray-900 tracking-tight font-caladea">
                Workflow
              </h2>

              <p className="text-gray-500 font-poppins max-w-xs mb-2">Three simple steps to transform your study routine effectively.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 border-t border-gray-200">
              {[
                { num: "01", title: "Upload PDF", img: "/features/n1.svg", desc: "Drag and drop your course material." },
                { num: "02", title: "Analyze", img: "/features/n2.svg", desc: "AI extracts concepts and key terms." },
                { num: "03", title: "Study", img: "/features/n3.svg", desc: "Review generated flashcards." }
              ].map((step, i) => (
                <div key={i} className="group relative border-r border-gray-200 last:border-r-0 pt-12 pr-12 pl-4 pb-12 hover:bg-white hover:pl-8 transition-all duration-500 ease-[0.22,1,0.36,1] cursor-default overflow-hidden">
                  {/* Background Image */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                    <Image src={step.img} alt="Numbers" width={140} height={140} className="object-contain" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* <span className="text-xs font-bold text-gray-400 mb-6 block font-mono">{step.num}</span> */}
                    <h3 className="text-3xl font-normal text-gray-900 mb-4 group-hover:text-[#5B79A6] transition-colors font-caladea">{step.title}</h3>
                    <p className="text-gray-500 font-poppins text-sm group-hover:text-gray-800 transition-colors">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section >

        {/* FOOTER */}
        < footer className="bg-[#111] text-white py-24 px-6 md:px-12 rounded-t-[3rem] mt-12" >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-32">
              <div className="lg:col-span-2">
                <h2 className="text-6xl md:text-8xl font-normal tracking-tighter mb-8 font-caladea">
                  Start<br />
                  Learning.
                </h2>
                <Link href="/signup">
                  <Button className="group rounded-full bg-white text-black px-8 py-6 text-lg hover:bg-gray-200 hover:px-10 transition-all">
                    Get Started <ChevronsRight className="ml-2 w-5 h-5 hidden group-hover:inline hover:scale-125 transition-all duration-200" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-6 pt-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Credits</h4>
                <ul className="space-y-4 text-gray-400">
                  <li className="hover:text-white cursor-pointer transition-colors"><a href="https://sketchfab.com/Retropopful" target="_blank" rel="noopener noreferrer">Retropopful</a></li>
                  {/* <li className="hover:text-white cursor-pointer transition-colors">NCLEX Prep</li>
                  <li className="hover:text-white cursor-pointer transition-colors">Pricing</li> */}
                </ul>
              </div>

              <div className="space-y-6 pt-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Connect</h4>
                <ul className="space-y-4 text-gray-400">
                  <li className="hover:text-white cursor-pointer transition-colors"><a href="https://www.linkedin.com/in/klynechrysler" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                  <li className="hover:text-white cursor-pointer transition-colors"><a href="https://www.facebook.com/kccd11" target="_blank" rel="noopener noreferrer">Facebook</a></li>
                  <li className="hover:text-white cursor-pointer transition-colors"><a href="https://github.com/KlyneChrysler" target="_blank" rel="noopener noreferrer">Github</a></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end pt-12">
              <div className="flex items-center gap-2 mb-6 md:mb-0">

                <span className="font-mono text-sm text-gray-500 uppercase">hly © 2025</span>
              </div>

              <div className="flex gap-8 text-xs text-gray-400 font-mono uppercase">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <CookiesLink />
              </div>
            </div>
          </div>
        </footer >
      </div >
    </div >
  );
}
