"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function AuthPage() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        router.push("/dashboard");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          router.push("/dashboard");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#030303] text-slate-900 dark:text-white overflow-hidden font-sans">

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

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px] p-8 rounded-3xl bg-white/70 dark:bg-black/80 border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex flex-col items-center text-center gap-6">

          <div className="space-y-3">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
              className="mb-4"
            >
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
                Vault<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400">IX</span>
              </h1>
            </motion.div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto text-sm font-medium">
              Your intelligent, secure vault. Save, organize, and retrieve what matters instantly.
            </p>
          </div>

          <div className="w-full">
            {!session ? (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                className="group relative flex w-full items-center justify-center gap-3 py-3 rounded-xl bg-purple-600 text-white font-bold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </motion.button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-white/5 border border-purple-100 dark:border-white/10 text-center">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black block mb-1">
                    Authorized Session
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 break-all">
                    {session.user.email}
                  </span>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/dashboard")}
                    className="flex-1 py-3 text-sm rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 active:shadow-none"
                  >
                    Go to Vault
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="flex-1 py-3 text-sm rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-bold hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 transition-all border border-slate-200 dark:border-white/5"
                  >
                    Sign out
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
