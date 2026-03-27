"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="relative min-h-screen bg-[#030303] text-white overflow-x-hidden font-sans selection:bg-purple-500/30 flex flex-col items-center">

      {/* Cinematic Background Video (ex2) - Case 1 (Desktop) */}
      <div className="absolute inset-0 z-0 h-screen w-full hidden md:block">
        <video
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            isVideoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/ex2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      {/* DESKTOP UI OVERLAYS (Case 1) */}
      <div className="hidden md:flex absolute inset-0 z-10 w-full h-full max-w-7xl mx-auto px-8 flex-col justify-end items-center py-20">
        {/* Top Right "Auth" Link */}
        <div className="absolute top-10 right-8">
          <Link 
            href={session ? "/dashboard" : "/auth"}
            className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white/40 hover:text-white transition-all duration-300"
          >
            <span>{session ? "Account" : "Entry"}</span>
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,1)]" />
            </div>
          </Link>
        </div>

        {/* CTA Section - Desktop (Bottom Center) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: isVideoLoaded ? 1 : 0, scale: isVideoLoaded ? 1 : 0.95 }}
          transition={{ duration: 1.2, delay: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href={session ? "/dashboard" : "/auth"}
            className="px-14 py-5 bg-white/5 backdrop-blur-3xl border border-white/10 text-white rounded-full font-bold text-lg hover:bg-white hover:text-black transition-all duration-500 flex items-center gap-4 shadow-[0_0_50px_rgba(255,255,255,0.05)]"
          >
            <span>Open Your Vault</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>

      {/* MOBILE SPECIFIC LAYOUT (Case 2) */}
      <div className="relative z-10 w-full flex flex-col items-center md:hidden">
        
        {/* Video Block (Pinned to Top) */}
        <div className="relative w-full h-[50vh] overflow-hidden bg-black flex items-center">
             <video
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
              style={{ objectPosition: '10% center' }}
              className={`w-full h-full object-cover transition-opacity duration-1000 ${
                isVideoLoaded ? "opacity-100" : "opacity-0"
              }`}
            >
              <source src="/ex2.mp4" type="video/mp4" />
            </video>
            {/* Nav Overlay on Video */}
            <div className="absolute top-0 right-0 p-8">
                <Link 
                  href={session ? "/dashboard" : "/auth"}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-black/20 backdrop-blur-md"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,1)]" />
                </Link>
            </div>
            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
        </div>

        {/* Manual Branding Block - Mobile (Case 2) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVideoLoaded ? 1 : 0, y: isVideoLoaded ? 0 : 20 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col items-center text-center px-8 -mt-6 relative z-20 w-full"
        >
          <h1 className="text-[64px] font-black tracking-tighter leading-none text-white drop-shadow-2xl">
            Vault<span className="text-purple-500">IX</span>
          </h1>
          <p className="text-[clamp(10px,3.2vw,14px)] font-bold text-white/40 tracking-[0.3em] uppercase mt-4 whitespace-nowrap">
            Store smarter. Find faster.
          </p>
        </motion.div>

        {/* Mobile CTA */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: isVideoLoaded ? 1 : 0 }}
           transition={{ duration: 1, delay: 1 }}
           className="mt-12 mb-20"
        >
            <Link
                href={session ? "/dashboard" : "/auth"}
                className="group flex items-center gap-4 px-10 py-5 bg-white text-black rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition-all"
            >
                <span>Open Your Vault</span>
                <ArrowRight className="w-5 h-5" />
            </Link>
        </motion.div>

      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {!isVideoLoaded && (
          <motion.div 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#030303] flex items-center justify-center"
          >
            <div className="w-12 h-12 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
