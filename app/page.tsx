"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import LoadingLogo from "@/components/LoadingLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [videoKey] = useState(() => `${Date.now()}-${Math.random()}`);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsVideoLoaded(true);
    }, 1400);

    const handleInteraction = () => {
      setHasUserInteracted(true);
      [desktopVideoRef.current, mobileVideoRef.current].forEach((video) => {
        if (video) {
          video.muted = false;
          video.play().catch(() => {});
        }
      });
    };

    window.addEventListener("click", handleInteraction, { once: true });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        if (event === "INITIAL_SESSION" && nextSession) {
          router.replace("/dashboard");
        }
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener("click", handleInteraction);
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="relative min-h-screen bg-[#030303] text-white overflow-x-hidden font-sans selection:bg-purple-500/30 flex flex-col items-center">

      {/* Cinematic Background Video (ex2) - Case 1 (Desktop) */}
      <div className="absolute inset-0 z-0 h-screen w-full hidden md:flex items-center justify-center overflow-hidden">
        <div
          className="relative flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden"
          style={{ width: '100%', maxWidth: '70vw', maxHeight: '70vh', aspectRatio: '16/9' }}
        >
          {/* Fine-tuned CSS filters perfectly crush the video's native purple/grey background into pitch #030303, completely erasing color separation while keeping the neon cube vibrant */}
          <video
            key={videoKey}
            ref={desktopVideoRef}
            autoPlay
            playsInline
            preload="auto"
            muted={!hasUserInteracted}
            onLoadedData={() => setIsVideoLoaded(true)}
            onError={() => setIsVideoLoaded(true)}
            onCanPlay={(event) => {
              const videoElement = event.currentTarget;
              if (!hasUserInteracted) {
                videoElement.muted = true;
              }
              videoElement.play().catch(() => {});
              setIsVideoLoaded(true);
            }}
            onTimeUpdate={(event) => {
              const videoElement = event.currentTarget;
              const remaining = videoElement.duration - videoElement.currentTime;
              if (remaining <= 2 && remaining > 0) {
                videoElement.volume = Math.max(0, remaining / 2);
              } else if (remaining > 2 && videoElement.volume !== 1) {
                videoElement.volume = 1;
              }
            }}
            className={`vaultix-landing-video absolute inset-0 w-full h-full object-cover scale-[1.02] contrast-[1.25] brightness-[0.85] saturate-[1.1] transition-opacity duration-1000 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src="/ex2.mp4" type="video/mp4" />
          </video>

          {/* Seamless Edge Blends to #030303 background (Original perfect version) */}
          <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent pointer-events-none" />

          {/* Anti-Veo Watermark Eraser (Bottom Right) */}
          <div className="absolute bottom-0 right-0 w-[20%] h-[20%] bg-[radial-gradient(ellipse_at_bottom_right,_#030303_50%,_transparent_100%)] pointer-events-none" />
        </div>
      </div>

      {/* DESKTOP UI OVERLAYS (Case 1) */}
      <div className="hidden md:flex absolute inset-0 z-10 w-full h-full max-w-7xl mx-auto px-8 flex-col justify-end items-center py-20">
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
            key={`${videoKey}-mobile`}
            ref={mobileVideoRef}
            autoPlay
            playsInline
            preload="auto"
            muted={!hasUserInteracted}
            onLoadedData={() => setIsVideoLoaded(true)}
            onError={() => setIsVideoLoaded(true)}
            onCanPlay={(event) => {
              const videoElement = event.currentTarget;
              if (!hasUserInteracted) {
                videoElement.muted = true;
              }
              videoElement.play().catch(() => {});
              setIsVideoLoaded(true);
            }}
            onTimeUpdate={(event) => {
              const videoElement = event.currentTarget;
              const remaining = videoElement.duration - videoElement.currentTime;
              if (remaining <= 2 && remaining > 0) {
                videoElement.volume = Math.max(0, remaining / 2);
              } else if (remaining > 2 && videoElement.volume !== 1) {
                videoElement.volume = 1;
              }
            }}
            style={{ objectPosition: '10% center' }}
            className={`vaultix-landing-video-mobile w-full h-full object-cover transition-opacity duration-1000 ${isVideoLoaded ? "opacity-100" : "opacity-0"
              }`}
          >
            <source src="/ex2.mp4" type="video/mp4" />
          </video>
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

      {/* Sound hint */}
      {!hasUserInteracted && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/80 px-3 py-2 text-[11px] sm:text-xs md:text-sm text-white backdrop-blur-sm max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-6rem)] lg:max-w-[360px] whitespace-nowrap overflow-hidden text-ellipsis">
          Tap anywhere to unmute the sound
        </div>
      )}

      {/* Loading Overlay */}
      <AnimatePresence>
        {!isVideoLoaded && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#030303] flex items-center justify-center"
          >
            <div className="flex flex-col items-center text-white">
              <LoadingLogo loading={!isVideoLoaded} delayMs={250} inline />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
