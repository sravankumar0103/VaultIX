"use client";

import {
  useCallback,
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
  type SyntheticEvent,
} from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ArrowRight } from "lucide-react";
import LoadingLogo from "@/components/LoadingLogo";
import { useRouter } from "next/navigation";
import {
  consumeDeletedAccountNotice,
  isReturningUser,
  markReturningUser,
  resolveValidatedSession,
  startGoogleSignIn,
  validateStoredReturningUser,
} from "@/lib/authSession";
import { clearSessionThemeOverride } from "@/lib/themePreferences";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Footer from "@/components/Footer";

// The features section is below the fold: load it in its own chunk and keep
// its space reserved so the footer does not jump when it arrives.
const LandingFeatures = dynamic(() => import("@/components/LandingFeatures"), {
  loading: () => <div aria-hidden="true" className="min-h-screen w-full bg-[#030303]" />,
});

// Videos already routed through the Web Audio API (a video can only be connected once)
const connectedVideos = new WeakMap<HTMLVideoElement, true>();

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const subscribeNoop = () => () => { };

// Connect a video element to the Web Audio API and return its GainNode,
// or null when the video was connected earlier (the caller keeps that GainNode).
function connectVideoToAudioContext(
  ctx: AudioContext,
  video: HTMLVideoElement
): GainNode | null {
  if (connectedVideos.has(video)) {
    return null;
  }
  const source = ctx.createMediaElementSource(video);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, ctx.currentTime);
  source.connect(gain);
  gain.connect(ctx.destination);
  connectedVideos.set(video, true);
  return gain;
}

// Trim the initial 500ms to skip the blurry purple starter frame
function handleVideoMetadata(event: SyntheticEvent<HTMLVideoElement>) {
  event.currentTarget.currentTime = 0.5;
}

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isAuthStarting, setIsAuthStarting] = useState(false);
  const [isCtaVisible, setIsCtaVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // false on the server and during hydration, so the server HTML has no video source
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  // Mirrors the `md:` breakpoint that switches between the two hero layouts
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const heroRef = useRef<HTMLElement>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const isDesktopRef = useRef(isDesktop);
  const interactionHandledRef = useRef(false); // a touch and its click run the handler once
  const ctaShownRef = useRef(false); // prevents CTA trigger firing multiple times
  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice(null);
    }, 4200);
  }, []);

  // Web Audio API refs for smooth cross-platform volume fading
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mobileGainRef = useRef<GainNode | null>(null);

  // The video of the layout the visitor can see
  const getActiveVideo = useCallback(
    () => (isDesktopRef.current ? desktopVideoRef.current : mobileVideoRef.current),
    []
  );

  // Only one video loads: when the layout switches, stop the one that is now hidden
  useEffect(() => {
    isDesktopRef.current = isDesktop;
    const hiddenVideo = isDesktop ? mobileVideoRef.current : desktopVideoRef.current;
    hiddenVideo?.pause();
  }, [isDesktop]);

  // Autoplay (muted unless the visitor already interacted) once the video can play
  const onVideoReady = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      const videoElement = event.currentTarget;
      if (!hasUserInteracted) {
        videoElement.muted = true;
      }
      videoElement.play().catch(() => { });
      setIsVideoLoaded(true);
    },
    [hasUserInteracted]
  );

  const onVideoError = useCallback(() => setIsVideoLoaded(true), []);

  const onVideoTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    if (event.currentTarget.currentTime > 0.1 && !isVideoLoaded) setIsVideoLoaded(true);
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
      if (interactionHandledRef.current) {
        // A touch is followed by its click. The work is done, but a suspended
        // AudioContext can only be resumed from a gesture browsers accept (the click).
        if (audioCtxRef.current?.state === "suspended") {
          audioCtxRef.current.resume().catch(() => { });
        }
        return;
      }
      interactionHandledRef.current = true;

      // Remove early return to ensure muted state resolves correctly
      setHasUserInteracted(true);

      // Unmute and play the video the visitor can see. The hidden layout's video
      // stays muted (its `muted` prop keeps it so) and has no source.
      const activeVideo = getActiveVideo();
      if (activeVideo) {
        activeVideo.muted = false;
        activeVideo.volume = 1;

        // Play the video unconditionally, EXCEPT if we can definitively prove
        // that it is at the very end of its track. This prevents late double-looping,
        // but guarantees playback starts correctly even if duration hasn't registered yet.
        if (!activeVideo.ended) {
          if (activeVideo.duration && activeVideo.currentTime >= activeVideo.duration - 0.5) {
            // Video is practically finished, don't restart it
          } else {
            activeVideo.play().catch(() => { });
          }
        }
      }

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
            (window as AudioWindow).webkitAudioContext;
          if (Ctor) {
            const ctx = new Ctor();
            audioCtxRef.current = ctx;
            ctx.resume(); // Always resume — AudioContext starts suspended in many browsers

            // IMPORTANT: Only connect the MOBILE video, and only when it is the visible
            // one. Never connect desktop video because that would silently disable its
            // volume control.
            if (!isDesktopRef.current && mobileVideoRef.current) {
              mobileGainRef.current = connectVideoToAudioContext(ctx, mobileVideoRef.current);
            }
          }
        } else if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
      } catch {
        // Web Audio API unavailable — rAF + video.volume fallback handles the fade
      }
    };

    const showPendingDeletedNotice = () => {
      if (!consumeDeletedAccountNotice()) {
        return;
      }

      showNotice("Your account was deleted. Please create it again.");
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // Coming back from the Google page via bfcache keeps the old loader state.
      if (event.persisted) {
        setIsAuthStarting(false);
      }
    };

    showPendingDeletedNotice();
    const heroEl = heroRef.current;
    if (heroEl) {
      heroEl.addEventListener("click", handleInteraction, { once: true });
      // Adding touchstart for immediate mobile response (passive: it never calls preventDefault)
      heroEl.addEventListener("touchstart", handleInteraction, { once: true, passive: true });
    }

    window.addEventListener("pageshow", handlePageShow);

    let cancelled = false;
    resolveValidatedSession().then((result) => {
      if (cancelled) {
        return;
      }

      if (result.status === "deleted") {
        showPendingDeletedNotice();
        setSession(null);
        return;
      }

      if (result.status === "signed-in") {
        setSession(result.session);
        router.replace("/dashboard");
        return;
      }

      setSession(null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === "SIGNED_IN" && nextSession) {
          setSession(nextSession);
          markReturningUser(nextSession.user.id);
          router.replace("/dashboard");
        } else if (event === "SIGNED_OUT") {
          setSession(null);
        }
      }
    );

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
      clearTimeout(fallbackTimer);
      clearTimeout(ctaFallbackTimer);
      if (heroEl) {
        heroEl.removeEventListener("click", handleInteraction);
        heroEl.removeEventListener("touchstart", handleInteraction);
      }
      listener.subscription.unsubscribe();
      // Release the audio device; the next interaction builds a fresh context
      audioCtxRef.current?.close().catch(() => { });
      audioCtxRef.current = null;
      mobileGainRef.current = null;
    };
  }, [router, showNotice, getActiveVideo]);

  // Drop a pending notice timer when the page unmounts
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    };
  }, []);

  // Smooth audio fade:
  // - Desktop: video.volume (Web Audio API is NOT used — it would break desktop audio)
  // - Mobile: Web Audio GainNode (bypasses mobile volume restriction)
  useEffect(() => {
    let rafId: number;

    const FADE_DURATION = 2.5; // seconds before end to begin fading

    const tick = () => {
      // Only the visible video matters: the hidden one has no source
      const video = getActiveVideo();

      // Once the video has ended there is nothing left to fade or watch
      if (video?.ended) {
        return;
      }

      if (video && !video.paused && !video.muted && video.duration) {
        const remaining = video.duration - video.currentTime;

        if (isDesktopRef.current) {
          // Desktop video: ALWAYS use video.volume (never GainNode — Web Audio not connected here)
          if (remaining <= FADE_DURATION && remaining > 0) {
            const normalized = Math.max(0, remaining / FADE_DURATION);
            try { video.volume = normalized * normalized; } catch { }
          } else if (remaining > FADE_DURATION && video.volume !== 1) {
            try { video.volume = 1; } catch { }
          }
        } else {
          // Mobile video: use GainNode if available (set up after user tap on touch devices)
          // Falls back to video.volume if Web Audio wasn't initialised
          const ctx = audioCtxRef.current;
          const gain = mobileGainRef.current;
          if (remaining <= FADE_DURATION && remaining > 0) {
            const normalized = Math.max(0, remaining / FADE_DURATION);
            const targetVol = normalized * normalized;
            if (gain && ctx) {
              gain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.05);
            } else {
              try { video.volume = targetVol; } catch { }
            }
          } else if (remaining > FADE_DURATION) {
            if (gain && ctx) {
              gain.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
            } else if (video.volume !== 1) {
              try { video.volume = 1; } catch { }
            }
          }
        }
      }

      // CTA trigger: show the button when the video is ~1.5s from ending
      if (!ctaShownRef.current) {
        if (video && video.duration && !video.paused) {
          const remaining = video.duration - video.currentTime;
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
  }, [getActiveVideo]);

  const handleOpenVault = useCallback(async () => {
    if (session) {
      router.push("/dashboard");
      return;
    }

    if (isReturningUser()) {
      if (isAuthStarting) {
        return;
      }

      setIsAuthStarting(true);
      const isValidReturningUser = await validateStoredReturningUser();
      if (!isValidReturningUser) {
        setIsAuthStarting(false);
        router.push("/auth");
        return;
      }

      clearSessionThemeOverride();
      const { error } = await startGoogleSignIn(`${window.location.origin}/dashboard`);
      if (error) {
        setIsAuthStarting(false);
        showNotice("Couldn't start Google sign-in. Please try again.");
      }
      return;
    }

    router.push("/auth");
  }, [session, isAuthStarting, router, showNotice]);

  return (
    <MotionConfig reducedMotion="user">
    <main className="relative min-h-screen w-full bg-[#030303] text-white overflow-x-hidden font-sans selection:bg-purple-500/30 flex flex-col items-center">
      <LoadingLogo loading={!isVideoLoaded || isAuthStarting} delayMs={0} />

      {/* HERO SECTION (Cinematic Entry) */}
      <section ref={heroRef} className="relative w-full min-h-[100dvh] shrink-0 flex flex-col items-center justify-center">

        {/* Cinematic Background Video (ex2) - Case 1 (Desktop) */}
        <div className="absolute inset-0 z-0 h-screen w-full hidden md:flex items-center justify-center overflow-hidden">
          {/* The visible wordmark is in the video; this gives desktop its one heading */}
          <h1 className="sr-only">VaultIX</h1>
          <div
            className="relative flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden"
            style={{ width: '100%', maxWidth: '70vw', maxHeight: '70vh', aspectRatio: '16/9' }}
          >
            <video
              ref={desktopVideoRef}
              autoPlay
              playsInline
              preload="auto"
              muted={!hasUserInteracted || !isDesktop}
              onLoadedMetadata={handleVideoMetadata}
              onError={onVideoError}
              onTimeUpdate={onVideoTimeUpdate}
              onCanPlay={onVideoReady}
              className={`vaultix-landing-video absolute inset-0 w-full h-full object-cover scale-[1.02] contrast-[1.25] brightness-[0.85] saturate-[1.1] transition-opacity duration-1000 ${isVideoLoaded ? "opacity-100" : "opacity-0"
                }`}
            >
              {isClient && isDesktop && <source src="/ex2.mp4" type="video/mp4" />}
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
              ref={mobileVideoRef}
              autoPlay
              playsInline
              preload="auto"
              muted={!hasUserInteracted || isDesktop}
              onLoadedMetadata={handleVideoMetadata}
              onError={onVideoError}
              onTimeUpdate={onVideoTimeUpdate}
              onCanPlay={onVideoReady}
              style={{ objectPosition: '10% center' }}
              className={`vaultix-landing-video-mobile w-full h-full object-cover scale-[1.02] contrast-[1.25] brightness-[0.85] saturate-[1.1] transition-opacity duration-1000 ${isVideoLoaded ? "opacity-100" : "opacity-0"
                }`}
            >
              {isClient && !isDesktop && <source src="/ex2.mp4" type="video/mp4" />}
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
        {notice ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-6 z-[120] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl backdrop-blur-xl"
          >
            {notice}
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
            <div className="flex flex-col items-center text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
    </MotionConfig>
  );
}
