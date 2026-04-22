"use client";

import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Search,
  BarChart3,
  Database,
  Lock,
  Zap,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Monitor,
  Cloud,
  FileText,
  Mail,
  Cpu,
  Trash2,
  Globe,
  Stars,
  Star,
  Users,
  Box,
  MousePointer2,
  Sun,
  Moon,
  ShieldAlert,
  Send,
  Fingerprint,
  Activity,
  CheckCircle2,
  Key
} from 'lucide-react';

export default function LandingFeatures({ onOpenVault }: { onOpenVault?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="relative w-full bg-[#030303] overflow-hidden selection:bg-purple-500/30 font-sans">

      {/* Seamless top bridge: fades from hero (#030303) into this section — invisible seam */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#030303] to-transparent pointer-events-none z-10" />

      {/* Background Atmosphere — layered purple & blue orbs */}
      <motion.div style={{ opacity: backgroundOpacity }} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] left-[5%] w-[700px] h-[700px] bg-purple-600/8 rounded-full blur-[160px]" />
        <div className="absolute top-[30%] right-[5%] w-[500px] h-[500px] bg-indigo-500/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px]" />
      </motion.div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 md:pt-32 pb-12 md:pb-20">

        {/* SECTION 0: TERMINOLOGY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24 md:mb-32 w-full"
        >
          <div className="space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-white leading-none flex items-baseline">
              Vault<span className="text-purple-500">IX</span>
              <span className="text-lg md:text-2xl text-white/20 font-light italic tracking-normal ml-4">/vôlt iks/</span>
            </h2>

            <p className="text-lg md:text-xl lg:text-2xl text-white/55 font-medium leading-relaxed max-w-4xl">
              An intelligent vault designed to centralize your links, documents, and media into one unified digital space.
              Powered by <span className="text-white/75 font-semibold tracking-tight"><span className="text-purple-400 font-bold">I</span>ntelligent inde<span className="text-purple-400 font-bold">X</span>ing</span>,
              it automatically organizes and prioritizes your most important data so you can find anything in seconds—bringing
              your digital life under control and helping you stay focused on what actually matters.
            </p>
          </div>
        </motion.div>

        {/* --- NARRATIVE SECTIONS (01-04) --- */}
        <div className="space-y-24 md:space-y-32">
          <HybridRefinedSection
            number="01"
            title="Store smarter."
            desc="Store more than just links. VaultIX handles articles, PDFs, and media files as unified resources."
            badge="Universal Storage"
            icon={<Database className="w-5 h-5 text-purple-400" />}
            visual={<UniversalVaultVisual />}
          />

          <HybridRefinedSection
            plain
            reversed
            number="02"
            title="Find faster."
            desc="Search like you think. Organise your bookmarks with priority, categories, and smart filters to find what you need in seconds."
            badge="Smart Search"
            icon={<Search className="w-5 h-5 text-purple-400" />}
            visual={<FilterSortVisualizer />}
          />

          <HybridRefinedSection
            number="03"
            title="Strictly Private."
            desc="Your workspace is yours alone. Fully private and encrypted, ensuring that only you can access and unlock your stored information."
            badge="Private by Default"
            icon={<ShieldCheck className="w-5 h-5 text-purple-400" />}
            visual={<PrivacyLock />}
          />

          <HybridRefinedSection
            reversed
            number="04"
            title="Deep insights."
            desc="Visualize your collection trends. Simple analytics and smart insights that help you understand your vault growth at a glance."
            badge="Visual Intelligence"
            icon={<BarChart3 className="w-5 h-5 text-purple-400" />}
            visual={<InsightChart />}
          />
        </div>

        {/* --- THE IX INFRASTRUCTURE BLOCK (Value Restoration) --- */}
        <div className="mt-32 md:mt-48 space-y-16 md:space-y-24">
          <div className="flex flex-col items-center text-center space-y-6 mb-16 md:mb-20">
            <h3 className="text-4xl md:text-6xl font-bold text-white tracking-tighter">Technical Architecture</h3>
            <p className="text-white/40 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
              The high-performance system powering your digital vault.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full auto-rows-[250px] md:auto-rows-[300px]">

            {/* 01: Auth (First - 4 Columns) - MINIMALIST UPDATE */}
            <BentoCard
              className="md:col-span-4"
              icon={<ShieldCheck className="text-blue-400" />}
              title="Google Auth"
              desc="Securely sign in with your Google account, authorized by Supabase."
              visual={<AuthMinimalVisualizer />}
            />

            {/* 02: Personal Lifecycle (8 Columns Wide) - EMAIL CENTRIC UPDATE */}
            <BentoCard
              className="md:col-span-8"
              icon={<Mail className="text-green-400" />}
              title="Personal Lifecycle"
              desc="Receive automated welcome and account deletion emails for total vault status awareness."
              visual={<LifecycleEmailVisualizer />}
            />

            {/* 03: Sync Engine (4 Columns) */}
            <BentoCard
              className="md:col-span-4"
              icon={<Cloud className="text-blue-500" />}
              title="Sync Engine"
              desc="Experience realtime syncing across all desktop and mobile devices for seamless multi-device access."
              visual={<SyncEngineVisualizer />} // Synthesis of PC/Mobile + Grid
            />

            {/* 04: Intelligence Center (4 Columns) */}
            <BentoCard
              className="md:col-span-4"
              icon={<Cpu className="text-purple-400" />}
              title="Intelligence Center"
              desc="Autonomous prioritization that intelligently organizes your vault using context-aware indexing logic."
              visual={<NeuralCubeVisualizer />}
            />

            {/* 05: Smart Search (Preserved - 4 Columns) */}
            <BentoCard
              className="md:col-span-4"
              icon={<Search className="text-purple-400" />}
              title="Smart Search"
              desc="Find anything instantly. Search by name, domain, tags, or the underlying intent behind your saved content."
              visual={<SearchPulse />}
            />

            {/* 06: Atmospheric UI (Sixth - 4 Columns) */}
            <BentoCard
              className="md:col-span-4"
              icon={<Sun className="text-orange-400" />}
              title="Adaptive Interface"
              desc="Cinematic theme transitions that seamlessly synchronize across every device in your vault."
              visual={<PrismRefractionVisualizer />}
            />

            {/* 07: Deletion / Data Sovereignty (Last - 8 Columns Wide) - FINAL Anchor */}
            <BentoCard
              className="md:col-span-8"
              icon={<Trash2 className="text-red-400" />}
              title="Permanent Deletion"
              desc="The absolute right to be forgotten. Wiping all user metadata and file structures permanently."
              visual={<WipeVisualizer />}
            />

          </div>
        </div>

        {/* --- FINAL CTA --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32 md:mt-48 w-full flex flex-col items-center text-center space-y-8 md:space-y-12 py-20 md:py-28 relative group"
        >
          {/* Apple-style atmospheric breathing glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[600px] h-[300px] bg-purple-500/20 rounded-full blur-[120px]"
            />
          </div>

          <div className="space-y-4 z-10">
            <span className="text-[10px] font-black tracking-[0.4em] uppercase text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">The Final Step</span>
            <h2 className="text-4xl md:text-7xl font-bold tracking-tighter text-white">
              Enter the vault.
            </h2>
          </div>

          <motion.button
            onClick={onOpenVault}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="z-10 group relative flex items-center gap-3 px-8 py-[13px] rounded-full font-semibold text-[14px] text-white overflow-hidden tracking-wide"
            style={{
              background: '#a855f7',
              boxShadow: '0 0 0 1px rgba(168,85,247,0.35), 0 0 28px rgba(168,85,247,0.4), 0 4px 14px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out" />
            <span className="relative z-10">Open Your Vault</span>
            <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
          </motion.button>
        </motion.div>

      </div>
    </section>
  );
}

function HybridRefinedSection({ number, title, desc, icon, badge, visual, reversed, plain }: any) {
  return (
    <div className={`flex flex-col md:flex-row items-center gap-20 md:gap-40 ${reversed ? 'md:flex-row-reverse' : ''}`}>
      <motion.div
        initial={{ opacity: 0, x: reversed ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 space-y-10"
      >
        <div className="flex items-center gap-4 text-white/30 hover:text-purple-400 transition-colors group">
          <div className="border border-white/10 rounded px-3 py-1.5 text-[10px] font-black tracking-widest bg-white/[0.02]">
            {number}
          </div>
          <div className="h-px w-8 bg-white/10" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{badge}</span>
        </div>

        <div className="space-y-6">
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            {title}
          </h3>
          <p className="text-base md:text-lg text-white/55 leading-relaxed font-medium max-w-sm">
            {desc}
          </p>

        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className={`flex-1 w-full flex items-center justify-center relative group ${plain
          ? 'p-0 overflow-visible'
          : 'bg-white/[0.01] border border-white/5 rounded-[3rem] aspect-video p-12 overflow-hidden'
          }`}
      >
        {!plain && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        )}
        {visual}
      </motion.div>
    </div>
  );
}

function BentoCard({ className, icon, title, desc, visual }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.01] flex flex-col justify-between group overflow-hidden transition-all duration-700 hover:bg-white/[0.03] ${className}`}
    >
      {/* Minimalist Background Highlight on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
            {React.cloneElement(icon, { size: 18 })}
          </div>
          <h4 className="text-lg font-bold text-white tracking-tight">{title}</h4>
        </div>
        <p className="text-sm text-white/45 font-medium leading-relaxed max-w-[200px]">{desc}</p>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none translate-y-10 group-hover:translate-y-4 transition-transform duration-1000 opacity-20 group-hover:opacity-100">
        {visual}
      </div>
    </motion.div>
  );
}

/* --- VALUE VISUALIZERS FINAL POLISH --- */

function AuthMinimalVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.05, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-8 bg-blue-500/10 rounded-full blur-xl"
        />
        <div className="relative z-10 p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 shadow-2xl">
          <ShieldCheck className="w-12 h-12 text-blue-400" />
        </div>
        <motion.div
          animate={{ scale: [0.95, 1, 0.95] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -inset-2 border border-blue-500/10 rounded-[2.5rem]"
        />
      </div>
    </div>
  );
}

function LifecycleEmailVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center px-10">
      <div className="relative w-[300px] h-[160px] bg-white/[0.02] border border-white/10 rounded-[2.5rem] flex items-center justify-center group/env backdrop-blur-3xl overflow-hidden">
        <motion.div
          animate={{
            y: [0, -4, 0],
            rotate: [0, 1, -1, 0]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <Mail size={64} strokeWidth={1} className="text-white/20 group-hover/env:text-green-400 group-hover/env:scale-110 transition-all duration-1000" />

          {/* Floating Indicators */}
          <motion.div
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], y: [10, -30] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-4 -right-4"
          >
            <CheckCircle2 size={24} className="text-green-500/50" />
          </motion.div>
          <motion.div
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], y: [30, -10] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-2 -left-4"
          >
            <Trash2 size={20} className="text-red-500/30" />
          </motion.div>
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-t from-green-500/5 to-transparent opacity-0 group-hover/env:opacity-100 transition-opacity duration-1000" />
      </div>
    </div>
  );
}

function PrismRefractionVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden group/prism">
      {/* Ambient Refraction Glows */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
          rotate: [0, 45, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-purple-500/10 to-orange-500/10 blur-[120px]"
      />

      <div className="relative z-10 w-48 h-48 flex items-center justify-center">
        {/* Layered Glass Prisms */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              rotate: [i * 120, i * 120 + 360],
              scale: [1, 1.05, 1],
              borderColor: [
                "rgba(255,255,255,0.1)",
                i === 0 ? "rgba(59,130,246,0.3)" : i === 1 ? "rgba(168,85,247,0.3)" : "rgba(251,191,36,0.3)",
                "rgba(255,255,255,0.1)"
              ]
            }}
            transition={{
              rotate: { duration: 20 + i * 5, repeat: Infinity, ease: "linear" },
              scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
              borderColor: { duration: 10, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute w-32 h-32 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-2xl"
            style={{
              zIndex: 3 - i,
              transform: `rotate(${i * 45}deg)`,
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)"
            }}
          />
        ))}

        {/* Central Adaptive Core */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            boxShadow: [
              "0 0 20px rgba(59,130,246,0.2)",
              "0 0 40px rgba(168,85,247,0.3)",
              "0 0 20px rgba(59,130,246,0.2)"
            ]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center relative z-20 overflow-hidden"
        >
          <motion.div
            animate={{ y: [20, -20, 20] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="flex flex-col gap-8"
          >
            <Sun className="w-5 h-5 text-orange-400/60" />
            <Moon className="w-5 h-5 text-blue-400/60" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* --- DEPRECATED VISUALIZERS --- */

function AtmosphericOrbVisualizer() {
  return null;
}

function AtmosphericVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          background: [
            "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)"
          ]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center relative overflow-hidden backdrop-blur-xl">
          <motion.div
            animate={{ y: [40, -40, 40] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-20"
          >
            <Sun className="w-10 h-10 text-orange-400 shadow-glow" />
            <Moon className="w-10 h-10 text-indigo-400" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function WipeVisualizer() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-10">
      <div className="relative p-8 rounded-[3rem] border border-white/10 bg-white/[0.02]">
        <ShieldAlert className="w-16 h-16 text-red-400/50" />
        <motion.div
          animate={{
            width: ["100%", "0%"],
            opacity: [1, 0]
          }}
          transition={{ duration: 5, repeat: Infinity, times: [0, 1] }}
          className="absolute inset-0 bg-red-400/10 rounded-[3rem] pointer-events-none"
        />
      </div>
      <div className="w-full max-w-[300px] h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          animate={{ width: ["0%", "100%", "0%"] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="h-full bg-gradient-to-r from-red-500/50 to-orange-500/50"
        />
      </div>
    </div>
  );
}

/* --- INFRASTRUCTURE VISUALIZERS (SUPERSEDED BY HIGH-FIDELITY) --- */

function NeuralCubeVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-40 h-40">
        <motion.div
          animate={{
            rotateX: [0, 90, 180, 270, 360],
            rotateY: [0, 180, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="w-full h-full border border-purple-500/20 rounded-xl relative flex items-center justify-center"
        >
          {/* Cross-sections for 3D feel */}
          <div className="absolute inset-0 border-x border-purple-500/10" />
          <div className="absolute inset-0 border-y border-purple-500/10" />
          <div className="w-4 h-4 bg-purple-500/40 rounded-full blur-md" />
        </motion.div>

        {/* Neural Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              x: [Math.random() * 40 - 20, Math.random() * 80 - 40],
              y: [Math.random() * 40 - 20, Math.random() * 80 - 40]
            }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
            className="absolute top-1/2 left-1/2 w-1 h-1 bg-purple-400 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

function SyncEngineVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      {/* Background: Pulsing Dots Grid (The "Better" Animation) */}
      <div className="absolute inset-0 grid grid-cols-6 gap-6 opacity-10 px-8 py-12">
        {[...Array(24)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              background: ["rgba(255, 255, 255, 0)", "rgba(59, 130, 246, 0.4)", "rgba(255, 255, 255, 0)"],
            }}
            transition={{ duration: 6, repeat: Infinity, delay: i * 0.15 }}
            className="w-1 h-1 rounded-full border border-white/10"
          />
        ))}
      </div>

      {/* Foreground: Multi-Device Structures */}
      <div className="relative flex items-center justify-center w-full h-full z-10">
        {/* Desktop Monitor */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative -translate-x-4"
        >
          <div className="w-20 h-14 rounded-lg bg-white/[0.02] border border-white/10 backdrop-blur-xl flex items-center justify-center relative">
            <Monitor size={20} className="text-blue-400/20" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-blue-500/20 to-transparent" />
          </div>
          <div className="mx-auto w-6 h-1 bg-white/10 rounded-b-sm border-x border-b border-white/10" />
        </motion.div>

        {/* Central Sync Axis */}
        <div className="relative mx-2">
          <motion.div
            animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500/20 blur-xl"
          />
          <div className="w-1 h-1 rounded-full bg-blue-400/40" />
        </div>

        {/* Mobile Device */}
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative translate-x-4 translate-y-6 scale-90"
        >
          <div className="w-8 h-14 rounded-md bg-white/[0.04] border border-white/20 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-white/20 absolute top-1" />
            <div className="w-2 h-4 border border-blue-400/10 rounded-sm" />
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
    </div>
  );
}

/* --- DEPRECATED VISUALIZERS --- */

function MultiDeviceSyncVisualizer() {
  // Kept for code history but superseded by SyncEngineVisualizer
  return null;
}

function SyncGridVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="grid grid-cols-5 gap-4 opacity-20">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              background: ["rgba(96, 165, 250, 0)", "rgba(96, 165, 250, 0.4)", "rgba(96, 165, 250, 0)"],
            }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
            className="w-2 h-2 rounded-full border border-blue-400/30"
          />
        ))}
      </div>

      {/* Global Pulse Indicator */}
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"
      />

      <motion.div
        animate={{
          x: [-30, 30, -30],
          y: [20, -20, 20]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute z-20"
      >
        <MousePointer2 size={20} className="text-blue-400/40" />
      </motion.div>
    </div>
  );
}

function RadarSearchVisualizer() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
      <div className="relative w-48 h-12 flex items-center gap-2 overflow-hidden px-4">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10"
          />
        ))}

        {/* Scanning Beam */}
        <motion.div
          animate={{ x: [-100, 200] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 bottom-0 w-1 bg-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.5)] z-10"
        />

        {/* Highlighted Results */}
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          className="absolute left-24 w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 z-0"
        />
      </div>

      <div className="flex items-center gap-2 opacity-30">
        <div className="w-16 h-1 bg-white/20 rounded-full" />
        <div className="w-8 h-1 bg-purple-500/40 rounded-full" />
      </div>
    </div>
  );
}

/* --- DEPRECATED VISUALIZERS --- */

function BrainVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute w-60 h-60 bg-purple-500/10 rounded-full blur-[100px]"
      />
      <Cpu size={120} className="text-white/[0.02]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-40 h-40 border border-purple-500/10 rounded-full border-dashed"
        />
      </div>
    </div>
  );
}

function SyncVisualizer() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ x: [-40, 40, -40], y: [10, -10, 10] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-1/2 left-1/4"
      >
        <MousePointer2 size={24} className="text-purple-400 rotate-12" />
      </motion.div>
      <Monitor size={100} className="text-white/[0.02]" />
      <div className="absolute top-1/3 right-1/4 p-2 rounded-lg bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
        <div className="w-16 h-1 bg-white/20 rounded-full" />
      </div>
    </div>
  );
}

function SearchVisualizer() {
  return (
    <div className="relative w-[200px] h-[200px]">
      <motion.div
        animate={{ rotateX: 360, rotateY: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="w-full h-full border border-purple-500/20 rounded-2xl relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500/40 rounded-full blur-md" />
      </motion.div>
    </div>
  );
}

/* --- CORE NARRATIVE ANIMATED REFS --- */

function SearchPulse() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-40 h-40 rounded-full bg-purple-500/20 blur-[80px]"
      />
      <div className="relative w-[180px] px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2 backdrop-blur-md">
        <Search className="w-4 h-4 text-purple-400" />
        <div className="flex-1 space-y-2">
          <motion.div
            animate={{ width: ["0%", "80%", "80%", "0%"] }}
            transition={{ duration: 5, repeat: Infinity, times: [0, 0.4, 0.8, 1] }}
            className="h-1.5 bg-white/20 rounded-full"
          />
          <div className="h-1.5 w-[50%] bg-white/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}


function UniversalVaultVisual() {
  const dataTypes = [
    { icon: <FileText className="w-5 h-5" />, color: "text-blue-400", delay: 0 },
    { icon: <Globe className="w-5 h-5" />, color: "text-green-400", delay: 1.5 },
    { icon: <Stars className="w-5 h-5" />, color: "text-yellow-400", delay: 3 },
    { icon: <Box className="w-5 h-5" />, color: "text-purple-400", delay: 0.7 },
    { icon: <Database className="w-5 h-5" />, color: "text-indigo-400", delay: 2.2 },
    { icon: <ShieldCheck className="w-5 h-5" />, color: "text-red-400", delay: 3.5 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Dynamic Background Atmosphere */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[120px]"
      />

      {/* Orbiting Data Icons */}
      {dataTypes.map((type, i) => (
        <motion.div
          key={i}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            ease: "linear",
            delay: type.delay
          }}
          className="absolute w-full h-full pointer-events-none"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, delay: type.delay }}
            className={`absolute ${type.color} p-3 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl`}
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translateX(${120 + i * 20}px)`,
            }}
          >
            {type.icon}
          </motion.div>
        </motion.div>
      ))}

      {/* Central Vault Core */}
      <div className="relative z-10">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            boxShadow: [
              "0 0 20px rgba(168, 85, 247, 0.2)",
              "0 0 50px rgba(168, 85, 247, 0.4)",
              "0 0 20px rgba(168, 85, 247, 0.2)"
            ]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-32 h-32 rounded-[2.5rem] bg-black/40 border border-purple-500/30 backdrop-blur-2xl flex items-center justify-center relative group cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-[2.5rem]" />
          <Database className="w-12 h-12 text-purple-400 relative z-10" />

          {/* Core Rotation Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 border border-purple-500/10 rounded-[3rem] border-dashed"
          />
        </motion.div>
      </div>

      {/* Digital Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-100, 100],
            opacity: [0, 1, 0],
            x: [Math.random() * 400 - 200, Math.random() * 400 - 200]
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5
          }}
          className="absolute w-1 h-1 bg-purple-400/20 rounded-full blur-[1px]"
        />
      ))}
    </div>
  );
}

function UniversalStoreVisual() {
  // Deprecated in favor of UniversalVaultVisual
  return null;
}

function RefinedCardVisualizer() {
  const bookmarks = [
    {
      title: "VaultIX",
      domain: "vaultix-sk.verce...",
      date: "Apr 12, 2026",
      badge: "URL",
      stars: 2,
      favicon: "/vaultix-icon.png"
    },
    {
      title: "Git-SK",
      domain: "github.com",
      date: "Apr 2, 2026",
      badge: "URL",
      stars: 3,
      favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=128"
    },
    {
      title: "Robot",
      domain: "",
      date: "Mar 16, 2026",
      badge: "MEDIA",
      stars: 2,
      favicon: "applevisual"
    }
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden">
      <div className="relative w-full max-w-[340px] flex flex-col gap-3">
        {bookmarks.map((b, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, i === 0 ? 80 : -40, 0],
              opacity: [1, 0.8, 1]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4 backdrop-blur-xl"
          >
            <div className="shrink-0 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 overflow-hidden">
              {b.favicon === "applevisual" ? (
                <div className="w-full h-full rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Box className="w-4 h-4 text-indigo-400" />
                </div>
              ) : (
                <img src={b.favicon} alt="favicon" className="w-[18px] h-[18px] object-contain opacity-80" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[12px] text-white/95 truncate">{b.title}</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-[8px] font-black text-white/15 uppercase tracking-widest border border-white/5">
                  {b.badge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-white/30 font-medium truncate">
                {b.domain && <span className="truncate max-w-[100px]">{b.domain}</span>}
                {b.domain && <div className="w-0.5 h-0.5 rounded-full bg-white/10 shrink-0" />}
                <span className="shrink-0">{b.date}</span>
              </div>
            </div>
            <div className="flex gap-0.5 shrink-0 pl-3 border-l border-white/5">
              {[...Array(3)].map((_, j) => (
                <Star
                  key={j}
                  className={`w-2.5 h-2.5 ${j < b.stars ? 'text-yellow-500 fill-yellow-500' : 'text-white/5'}`}
                />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Decorative Filter Pulse (From Dots Version) */}
        <motion.div
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl -z-10"
        />
      </div>
    </div>
  );
}

function FindFasterVisual() {
  const items = [
    "Search like you think",
    "vaultix search",
    "smart filter",
    "VaultIX",
    "priority",
    "Git-SK",
    "categories",
    "quick find"
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-full bg-purple-500/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-[380px] grid grid-cols-2 gap-3.5">
        {items.map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md group hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300"
          >
            <Search className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium text-white/50 group-hover:text-white/80 transition-colors truncate">
              {text}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Cinematic Scanning Line */}
      <motion.div
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.5)] z-20 pointer-events-none"
      />
    </div>
  );
}

function FileCascade() {
  // Deprecated
  return null;
}

function FilterSortVisualizer() {
  const bookmarks = [
    {
      title: "VaultIX",
      domain: "vaultix-sk.verce...",
      date: "Apr 12, 2026",
      badge: "URL",
      stars: 2,
      favicon: "/vaultix-icon.png"
    },
    {
      title: "Git-SK",
      domain: "github.com",
      date: "Apr 2, 2026",
      badge: "URL",
      stars: 3,
      favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=128"
    },
    {
      title: "Robot",
      domain: "",
      date: "Mar 16, 2026",
      badge: "MEDIA",
      stars: 2,
      favicon: "/robot-user.png"
    }
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center p-0">
      <div className="relative w-full max-w-[340px] flex flex-col gap-3">
        {bookmarks.map((b, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, i === 0 ? 80 : -40, 0],
              opacity: [1, 0.9, 1]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
            className="p-4 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center gap-4 backdrop-blur-2xl"
          >
            <div className="shrink-0 w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 overflow-hidden">
              {b.favicon === "applevisual" ? (
                <div className="w-full h-full rounded-lg bg-indigo-500/30 flex items-center justify-center">
                  <Box className="w-4 h-4 text-indigo-400" />
                </div>
              ) : (
                <img src={b.favicon} alt="favicon" className="w-[18px] h-[18px] object-contain" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[12px] text-white/95 truncate">{b.title}</h3>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-medium text-white/50 tracking-tight">
                  {b.badge === "URL" ? "URL" : b.badge === "MEDIA" ? "Media" : "Media+URL"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-white/40 font-medium truncate">
                {b.domain && <span className="truncate max-w-[100px]">{b.domain}</span>}
                {b.domain && <div className="w-0.5 h-0.5 rounded-full bg-white/10 shrink-0" />}
                <span className="shrink-0">{b.date}</span>
              </div>
            </div>
            <div className="flex gap-0.5 shrink-0 pl-3 border-l border-white/10">
              {[...Array(3)].map((_, j) => (
                <Star
                  key={j}
                  className={`w-2.5 h-2.5 ${j < b.stars ? 'text-yellow-500 fill-yellow-500' : 'text-white/10'}`}
                />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Decorative Filter Pulse */}
        <motion.div
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl -z-10"
        />
      </div>
    </div>
  );
}

function InsightChart() {
  const bars = [40, 70, 50, 90, 60, 80, 100, 45, 65, 85, 75, 55];
  return (
    <div className="w-full h-full flex items-end justify-center gap-2.5 px-6 pb-2">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          transition={{ duration: 1, delay: 0.5 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 bg-purple-500/20 border-t border-x border-purple-500/30 rounded-t-sm relative group/bar"
        >
          <div className="absolute inset-0 bg-purple-400/10 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
        </motion.div>
      ))}
    </div>
  );
}

function PrivacyLock() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center space-y-12">
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="w-28 h-28 rounded-[3rem] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-2xl shadow-purple-500/50 backdrop-blur-md"
        >
          <ShieldCheck className="w-14 h-14 text-purple-400 shadow-pulse" />
        </motion.div>
        <div className="absolute -inset-12 bg-purple-500/5 rounded-full blur-[80px] -z-10" />
      </div>
      <div className="w-full max-w-[280px] p-6 rounded-[2.5rem] border border-white/10 bg-white/[0.02] space-y-5 backdrop-blur-sm shadow-xl">
        <div className="flex justify-between items-center">
          <div className="w-28 h-2 bg-white/10 rounded-full" />
          <div className="w-12 h-6 rounded-full bg-purple-500/40 relative">
            <motion.div
              animate={{ x: [0, 24, 24, 0] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
              className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-white shadow-glow"
            />
          </div>
        </div>
        <div className="w-full h-px bg-white/5" />
        <div className="flex justify-between items-center">
          <div className="w-20 h-2 bg-white/10 rounded-full" />
          <Trash2 className="w-4 h-4 text-red-400/50 hover:text-red-400 transition-colors cursor-pointer" />
        </div>
      </div>
    </div>
  );
}

