"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import LoadingLogo from "@/components/LoadingLogo";
import { useRouter } from "next/navigation";
import {
  clearLocalAuthSession,
  clearReturningUser,
  consumeDeletedAccountNotice,
  isDeletedAccountError,
  isReturningUser,
  markReturningUser,
  recoverFromAuthError,
  startGoogleSignIn,
  validateStoredReturningUser,
} from "@/lib/authSession";
import { clearSessionThemeOverride } from "@/lib/themePreferences";
import { default as LandingFeatures } from "@/components/LandingFeatures";
import Footer from "@/components/Footer";

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isAuthStarting, setIsAuthStarting] = useState(false);
  const [isCtaVisible, setIsCtaVisible] = useState(false);
  const [showDeletedAccountNotice, setShowDeletedAccountNotice] = useState(false);
  const [videoKey] = useState(() => `${Date.now()}-${Math.random()}`);
  const heroRef = useRef<HTMLElement>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const ctaShownRef = useRef(false); // prevents CTA trigger firing multiple times

  // Web Audio API refs for smooth cross-platform volume fading
  const audioCtxRef = useRef<AudioContext | null>(null);
  const desktopGainRef = useRef<GainNode | null>(null);
  const mobileGainRef = useRef<GainNode | null>(null);

  // Connect a video element to the Web Audio API and return its GainNode
  const connectVideoToAudioContext = (
    ctx: AudioContext,
    video: HTMLVideoElement
  ): GainNode => {
    // Each video can only be connected once — guard with a flag
    if ((video as any).__audioConnected) {
      return (video as any).__gainNode as GainNode;
    }
    const source = ctx.createMediaElementSource(video);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    (video as any).__audioConnected = true;
    (video as any).__gainNode = gain;
    return gain;
  };

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsVideoLoaded(true);
    }, 2500);

    // Fallback: show CTA after 12s in case video duration tracking fails
    const ctaFallbackTimer = setTimeout(() => {
      if (!ctaShownRef.current) {
        ctaShownRef.current = true;
        setIsCtaVisible(true);
      }
    }, 12000);

    const handleInteraction = () => {
      // Remove early return to ensure muted state resolves correctly
      setHasUserInteracted(true);

      // Unmute and play both videos
      [desktopVideoRef.current, mobileVideoRef.current].forEach((video) => {
        if (video) {
          video.muted = false;
          video.volume = 1;

          // Play the video unconditionally, EXCEPT if we can definitively prove
          // that it is at the very end of its track. This prevents late double-looping,
          // but guarantees playback starts correctly even if duration hasn't registered yet.
          if (!video.ended) {
            if (video.duration && video.currentTime >= video.duration - 0.5) {
              // Video is practically finished, don't restart it
            } else {
              video.play().catch(() => { });
            }
          }
        }
      });

      // Web Audio API is ONLY used for the mobile video.
      // Reason: createMediaElementSource() takes over ALL audio routing from the
      // video element. Desktop uses video.volume directly (fully supported on desktop).
      // Mobile browsers block video.volume changes, so we need a GainNode instead.
      // We detect touch capability as the mobile signal.
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      if (!isTouchDevice) return; // Desktop: video.volume handles everything, no Web Audio needed

      try {
        if (!audioCtxRef.current) {
          const Ctor =
            window.AudioContext ||
            (window as any).webkitAudioContext;
          if (Ctor) {
            const ctx = new Ctor() as AudioContext;
            audioCtxRef.current = ctx;
            ctx.resume(); // Always resume — AudioContext starts suspended in many browsers

            // IMPORTANT: Only connect the MOBILE video. Never connect desktop video
            // because that would silently disable its volume control.
            if (mobileVideoRef.current) {
              mobileGainRef.current = connectVideoToAudioContext(ctx, mobileVideoRef.current);
            }
          }
        } else if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
      } catch (e) {
        // Web Audio API unavailable — rAF + video.volume fallback handles the fade
      }
    };

    const showPendingDeletedNotice = () => {
      if (!consumeDeletedAccountNotice()) {
        return;
      }

      setShowDeletedAccountNotice(true);
      window.setTimeout(() => {
        setShowDeletedAccountNotice(false);
      }, 4200);
    };

    showPendingDeletedNotice();
    const heroEl = heroRef.current;
    if (heroEl) {
      heroEl.addEventListener("click", handleInteraction, { once: true });
      heroEl.addEventListener("touchstart", handleInteraction, { once: true }); // Adding touchstart for immediate mobile response
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        const recovered = await recoverFromAuthError(error.message);
        if (recovered && isDeletedAccountError(error.message)) {
          showPendingDeletedNotice();
        }
        if (!recovered) {
          console.error("Failed to get landing session:", error);
        }
        setSession(null);
        return;
      }

      setSession(data.session);
      if (data.session) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          const recovered = await recoverFromAuthError(userError?.message);
          if (recovered && isDeletedAccountError(userError?.message)) {
            showPendingDeletedNotice();
          }
          if (!recovered) {
            await clearLocalAuthSession();
          }
          clearReturningUser();
          setSession(null);
          return;
        }

        markReturningUser(userData.user.id);
        router.replace("/dashboard");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        if (nextSession) {
          markReturningUser(nextSession.user.id);
          router.replace("/dashboard");
        }
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(ctaFallbackTimer);
      if (heroEl) {
        heroEl.removeEventListener("click", handleInteraction);
        heroEl.removeEventListener("touchstart", handleInteraction);
      }
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // Smooth audio fade:
  // - Desktop: video.volume (Web Audio API is NOT used — it would break desktop audio)
  // - Mobile: Web Audio GainNode (bypasses mobile volume restriction)
  useEffect(() => {
    let rafId: number;

    const FADE_DURATION = 2.5; // seconds before end to begin fading

    const tick = () => {
      const ctx = audioCtxRef.current;

      // Desktop video: ALWAYS use video.volume (never GainNode — Web Audio not connected here)
      const desktop = desktopVideoRef.current;
      if (desktop && !desktop.paused && !desktop.muted && desktop.duration) {
        const remaining = desktop.duration - desktop.currentTime;
        if (remaining <= FADE_DURATION && remaining > 0) {
          const normalized = Math.max(0, remaining / FADE_DURATION);
          try { desktop.volume = normalized * normalized; } catch (_) { }
        } else if (remaining > FADE_DURATION && desktop.volume !== 1) {
          try { desktop.volume = 1; } catch (_) { }
        }
      }

      // Mobile video: use GainNode if available (set up after user tap on touch devices)
      // Falls back to video.volume if Web Audio wasn't initialised
      const mobile = mobileVideoRef.current;
      const gain = mobileGainRef.current;
      if (mobile && !mobile.paused && !mobile.muted && mobile.duration) {
        const remaining = mobile.duration - mobile.currentTime;
        if (remaining <= FADE_DURATION && remaining > 0) {
          const normalized = Math.max(0, remaining / FADE_DURATION);
          const targetVol = normalized * normalized;
          if (gain && ctx) {
            gain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.05);
          } else {
            try { mobile.volume = targetVol; } catch (_) { }
          }
        } else if (remaining > FADE_DURATION) {
          if (gain && ctx) {
            gain.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
          } else if (mobile.volume !== 1) {
            try { mobile.volume = 1; } catch (_) { }
          }
        }
      }

      // CTA trigger: show the button when the video is ~1.5s from ending
      if (!ctaShownRef.current) {
        // Accurately capture the active video layout branch to prevent iOS Safari from ghost-pausing the logic
        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
        const watchVideo = isMobile ? mobileVideoRef.current : desktopVideoRef.current;

        if (watchVideo && watchVideo.duration && !watchVideo.paused) {
          const remaining = watchVideo.duration - watchVideo.currentTime;
          if (remaining <= 1.5) {
            ctaShownRef.current = true;
            setIsCtaVisible(true);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleOpenVault = async () => {
    if (session) {
      router.push("/dashboard");
      return;
    }

    if (isReturningUser()) {
      const isValidReturningUser = await validateStoredReturningUser();
      if (!isValidReturningUser) {
        router.push("/auth");
        return;
      }

      setIsAuthStarting(true);
      clearSessionThemeOverride();
      await startGoogleSignIn(`${window.location.origin}/dashboard`);
      return;
    }

    router.push("/auth");
  };

  return (
    <main className="relative min-h-screen w-full bg-[#030303] text-white overflow-x-hidden font-sans selection:bg-purple-500/30 flex flex-col items-center">
      <LoadingLogo loading={!isVideoLoaded || isAuthStarting} delayMs={0} />

      {/* HERO SECTION (Cinematic Entry) */}
      <section ref={heroRef} className="relative w-full min-h-[100dvh] shrink-0 flex flex-col items-center justify-center">

        {/* Cinematic Background Video (ex2) - Case 1 (Desktop) */}
        <div className="absolute inset-0 z-0 h-screen w-full hidden md:flex items-center justify-center overflow-hidden">
          <div
            className="relative flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden"
            style={{ width: '100%', maxWidth: '70vw', maxHeight: '70vh', aspectRatio: '16/9' }}
          >
            <video
              key={videoKey}
              ref={desktopVideoRef}
              autoPlay
              playsInline
              preload="auto"
              muted={!hasUserInteracted}
              onLoadedMetadata={(e) => {
                // Trim the initial 500ms to skip the blurry purple starter frame
                e.currentTarget.currentTime = 0.5;
              }}
              onError={() => setIsVideoLoaded(true)}
              onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime > 0.1 && !isVideoLoaded) setIsVideoLoaded(true);
              }}
              onCanPlay={(event) => {
                const videoElement = event.currentTarget;
                if (!hasUserInteracted) {
                  videoElement.muted = true;
                }
                videoElement.play().catch(() => { });
                setIsVideoLoaded(true);
              }}
              className={`vaultix-landing-video absolute inset-0 w-full h-full object-cover scale-[1.02] contrast-[1.25] brightness-[0.85] saturate-[1.1] transition-opacity duration-1000 ${isVideoLoaded ? "opacity-100" : "opacity-0"
                }`}
            >
              <source src="/ex2.mp4" type="video/mp4" />
            </video>

            {/* Seamless Edge Blends to #030303 background */}
            <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent pointer-events-none" />

            {/* Anti-Veo Watermark Eraser (Bottom Right) */}
            <div className="absolute bottom-0 right-0 w-[20%] h-[20%] bg-[radial-gradient(ellipse_at_bottom_right,_#030303_50%,_transparent_100%)] pointer-events-none" />
          </div>
        </div>

        {/* DESKTOP CTA — absolutely positioned inside the video frame, directly under the tagline */}
        <div className="hidden md:flex absolute inset-0 z-10 w-full h-full items-center justify-center pointer-events-none">
          <div
            className="relative"
            style={{ width: '100%', maxWidth: '70vw', maxHeight: '70vh', aspectRatio: '16/9' }}
          >
            <AnimatePresence>
              {isCtaVisible && (
                <motion.div
                  key="cta-desktop"
                  className="absolute -translate-x-1/2 flex flex-col items-center gap-8 pointer-events-auto"
                  style={{ left: '76%', top: '70%' }}
                  initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.button
                    onClick={handleOpenVault}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative flex items-center gap-3 px-8 py-[13px] rounded-full font-semibold text-[14px] text-white overflow-hidden tracking-wide"
                    style={{
                      background: '#a855f7',
                      boxShadow: '0 0 0 1px rgba(168,85,247,0.35), 0 0 28px rgba(168,85,247,0.4), 0 4px 14px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out" />
                    <span className="relative z-10">Open Your Vault</span>
                    <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                  </motion.button>

                  {/* Scroll Indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1.5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold">Explore</span>
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-px h-8 bg-white/10"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
              onLoadedMetadata={(e) => {
                // Trim the initial 500ms to skip the blurry purple starter frame
                e.currentTarget.currentTime = 0.5;
              }}
              onError={() => setIsVideoLoaded(true)}
              onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime > 0.1 && !isVideoLoaded) setIsVideoLoaded(true);
              }}
              onCanPlay={(event) => {
                const videoElement = event.currentTarget;
                if (!hasUserInteracted) {
                  videoElement.muted = true;
                }
                videoElement.play().catch(() => { });
              }}
              style={{ objectPosition: '10% center' }}
              className={`vaultix-landing-video-mobile w-full h-full object-cover scale-[1.02] contrast-[1.25] brightness-[0.85] saturate-[1.1] transition-opacity duration-1000 ${isVideoLoaded ? "opacity-100" : "opacity-0"
                }`}
            >
              <source src="/ex2.mp4" type="video/mp4" />
            </video>
            {/* Seamless Edge Blends to #030303 background */}
            <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-[#030303] via-[#030303]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent pointer-events-none" />
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
            <p className="text-[clamp(10px,3.2vw,14px)] font-bold text-white/40 tracking-[0.3em] uppercase mt-3 whitespace-nowrap">
              Store smarter. Find faster.
            </p>
          </motion.div>

          {/* Mobile Action Area (Hint & CTA pinned directly under branding) */}
          <div className="mt-7 mb-20 flex min-h-[50px] w-full items-center justify-center">
            <AnimatePresence mode="wait">
              {!hasUserInteracted && !isCtaVisible && (
                <motion.div
                  key="hint-mobile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
                  transition={{ duration: 0.3 }}
                  className="pointer-events-none text-[10px] tracking-wider text-white/30"
                >
                  Tap anywhere to unmute the sound
                </motion.div>
              )}

              {isCtaVisible && (
                <motion.div
                  key="cta-mobile"
                  initial={{ opacity: 0, y: 20, scale: 0.88, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-6"
                >
                  <motion.button
                    onClick={handleOpenVault}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden"
                    style={{
                      background: '#a855f7',
                      boxShadow: '0 0 24px rgba(168,85,247,0.5), 0 0 48px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    <div className="absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out" />
                    <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                    <span className="relative z-10">Open Your Vault</span>
                    <ArrowRight className="relative z-10 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                  </motion.button>

                  {/* Mobile Scroll Indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.div
                      animate={{ y: [0, 4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-[1.5px] h-6 bg-white/10"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Sound hint — fades out 1.5s before end (when CTA appears) or upon interaction */}
        <AnimatePresence>
          {!hasUserInteracted && !isCtaVisible && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-none hidden md:block absolute bottom-6 left-1/2 z-30 -translate-x-1/2 text-[11px] tracking-wider text-white/30 whitespace-nowrap"
            >
              Tap anywhere to unmute the sound
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <LandingFeatures onOpenVault={handleOpenVault} />

      <Footer />

      <AnimatePresence>
        {showDeletedAccountNotice ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-6 z-[120] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl backdrop-blur-xl"
          >
            Your account was deleted. Please create it again.
          </motion.div>
        ) : null}
      </AnimatePresence>

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
