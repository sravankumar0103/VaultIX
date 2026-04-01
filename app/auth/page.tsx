"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { AlertCircle, Mail, PencilLine, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearLocalAuthSession,
  clearReturningUser,
  isDeletedAccountError,
  isReturningUser,
  markReturningUser,
  recoverFromAuthError,
  startGoogleSignIn,
  validateStoredReturningUser,
} from "@/lib/authSession";
import { clearSessionThemeOverride } from "@/lib/themePreferences";
import LoadingLogo from "@/components/LoadingLogo";

export default function AuthPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProfileStep = searchParams.get("profile") === "1";

  useEffect(() => {
    const beginReturningUserLogin = async () => {
      const isValidReturningUser = await validateStoredReturningUser();
      if (!isValidReturningUser) {
        return;
      }

      setIsAuthTransitioning(true);
      clearSessionThemeOverride();
      await startGoogleSignIn(`${window.location.origin}/dashboard`);
    };

    const applySessionProfile = (activeSession: Session) => {
      const suggestedName =
        activeSession.user.user_metadata?.full_name ||
        activeSession.user.user_metadata?.name ||
        activeSession.user.email?.split("@")[0] ||
        "";

      setDisplayName((currentName) => currentName || suggestedName);
    };

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        const recovered = await recoverFromAuthError(error.message);
        if (recovered && isDeletedAccountError(error.message)) {
          router.replace("/");
          return;
        }
        if (!recovered) {
          console.error("Failed to get session:", error);
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
            router.replace("/");
            return;
          }
          if (!recovered) {
            await clearLocalAuthSession();
          }
          clearReturningUser();
          setSession(null);
          return;
        }

        markReturningUser(userData.user.id);
        applySessionProfile(data.session);
        if (!isProfileStep) {
          router.replace("/dashboard");
        }
        return;
      }

      if (isReturningUser()) {
        await beginReturningUserLogin();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          markReturningUser(session.user.id);
          applySessionProfile(session);
          if (!isProfileStep) {
            router.replace("/dashboard");
          }
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [isProfileStep, router]);

  const handleLogin = async () => {
    setIsAuthTransitioning(true);
    setProfileError(null);
    clearSessionThemeOverride();
    await startGoogleSignIn(`${window.location.origin}/auth?profile=1`);
  };

  const handleCreateAccount = async () => {
    if (!session) {
      return;
    }

    const trimmedName = displayName.trim();
    const existingName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
    const fallbackName = session.user.email?.split("@")[0] || "VaultIX User";
    const nextName = trimmedName || existingName || fallbackName;

    setIsAuthTransitioning(true);
    setProfileError(null);

    if (nextName !== existingName) {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nextName, name: nextName },
      });

      if (error) {
        setIsAuthTransitioning(false);
        setProfileError("We couldn't save your name right now. Please try again.");
        return;
      }
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      const recovered = await recoverFromAuthError(refreshError.message);
      if (!recovered) {
        console.warn("Session refresh after account setup failed:", refreshError);
      }
    }

    router.push("/dashboard");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 dark:bg-[#030303] dark:text-white">
      <LoadingLogo loading={isAuthTransitioning} delayMs={0} />

      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="relative w-full max-w-[1200px] h-full flex flex-col items-center justify-center z-10">
          <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-purple-600/20 dark:bg-purple-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-fuchsia-500/10 dark:bg-fuchsia-500/5 blur-[90px] mix-blend-multiply dark:mix-blend-screen" />
        </div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71,85,105,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(71,85,105,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1380px] items-center px-6 py-12 sm:px-8 lg:px-10 xl:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,580px)_minmax(380px,440px)] lg:gap-8 xl:grid-cols-[minmax(0,620px)_minmax(390px,440px)] xl:gap-12">
          <motion.aside
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="hidden max-w-[620px] lg:flex lg:flex-col lg:items-start lg:justify-center lg:gap-8"
          >
            <div className="space-y-4">
              <h2 className="text-6xl font-black tracking-[-0.06em] text-slate-900 dark:text-white xl:text-7xl">
                Vault<span className="bg-gradient-to-r from-purple-500 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent">IX</span>
              </h2>
              <p className="max-w-2xl text-2xl font-semibold leading-[1.3] text-slate-700 dark:text-slate-100 xl:text-3xl">
                Secure access to your personal vault.
              </p>
              <p className="max-w-lg text-base leading-8 text-slate-500 dark:text-slate-400">
                Sign in with Google once, confirm your details, and step straight into VaultIX.
              </p>
            </div>
          </motion.aside>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[440px] justify-self-center rounded-3xl border border-slate-200 bg-white/70 p-7 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/80 lg:justify-self-end"
          >
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="space-y-3">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                  className="mb-2"
                >
                  <h1 className="text-5xl font-black tracking-tighter text-slate-900 drop-shadow-sm dark:text-white md:text-6xl lg:hidden">
                    Vault<span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">IX</span>
                  </h1>
                  <h2 className="hidden text-[2rem] font-black tracking-tight text-slate-900 dark:text-white lg:block">
                    {session && isProfileStep ? "Create your account" : "Access your vault"}
                  </h2>
                </motion.div>
                {session && isProfileStep ? (
                  <p className="mx-auto max-w-[280px] text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    Finish setup with your Google details.
                  </p>
                ) : null}
              </div>

              <div className="w-full">
                {session && isProfileStep ? (
                  <div className="space-y-5 text-left">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        <UserRound className="h-3.5 w-3.5" />
                        Display name
                      </label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                        <PencilLine className="h-4 w-4 shrink-0 text-purple-500" />
                        <input
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          placeholder="Your name"
                          className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        <Mail className="h-3.5 w-3.5" />
                        Gmail
                      </label>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                        {session.user.email}
                      </div>
                    </div>

                    {profileError ? (
                      <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    ) : null}

                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateAccount}
                      className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-700 active:shadow-none"
                    >
                      Create account
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogin}
                    className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-purple-600 py-3 font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                  >
                    <span className="relative z-10 flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Get Started with Google
                    </span>
                    <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 transition-transform duration-700 group-hover:translate-x-[100%]" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
