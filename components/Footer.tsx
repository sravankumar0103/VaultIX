"use client";

import React from 'react';
import Image from 'next/image';
import { Github, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-[#030303] border-t border-white/[0.02] pt-16 pb-8 overflow-hidden selection:bg-purple-500/30 font-sans">
      
      {/* Ultra-subtle Ambient Glow (matching hero) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-10 lg:gap-8 mb-16">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-5 flex flex-col space-y-6">
            <div className="flex items-center gap-3">
              <Image src="/vaultix-icon.png" alt="VaultIX" width={48} height={48} className="drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
              <span className="text-2xl font-bold tracking-tighter text-white">Vault<span className="text-purple-500">IX</span></span>
            </div>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed font-medium">
              Your digital life, intelligently indexed and strictly private.
            </p>
            <div className="flex items-center gap-5 pt-2">
              <a href="#" className="group transition-colors">
                <Twitter className="w-4 h-4 text-white/20 group-hover:text-white/80 transition-colors" />
              </a>
              <a href="#" className="group transition-colors">
                <Github className="w-4 h-4 text-white/20 group-hover:text-white/80 transition-colors" />
              </a>
              <a href="#" className="group transition-colors">
                <Linkedin className="w-4 h-4 text-white/20 group-hover:text-white/80 transition-colors" />
              </a>
            </div>
          </div>

          {/* Navigation Columns - Spread across remaining 7 cols */}
          <div className="col-span-2 lg:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8">
             
             {/* Product Column */}
             <div className="flex flex-col space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Product</h4>
               <ul className="space-y-4">
                 {['Features', 'Architecture', 'Smart Search', 'Analytics'].map((item) => (
                   <li key={item}>
                     <a href="#" className="text-[13px] font-medium text-white/30 hover:text-white transition-colors">{item}</a>
                   </li>
                 ))}
               </ul>
             </div>

             {/* Developers Column */}
             <div className="flex flex-col space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Developers</h4>
               <ul className="space-y-4">
                 {['API Reference', 'Open Source', 'GitHub Repo', 'Infrastructure'].map((item) => (
                   <li key={item}>
                     <a href="#" className="text-[13px] font-medium text-white/30 hover:text-white transition-colors">{item}</a>
                   </li>
                 ))}
               </ul>
             </div>

             {/* Support / Legal Column */}
             <div className="flex flex-col space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Support</h4>
               <ul className="space-y-4">
                 {['Contact Us', 'Help Center', 'Permanent Deletion'].map((item) => (
                   <li key={item}>
                     <a href="#" className="text-[13px] font-medium text-white/30 hover:text-white transition-colors">{item}</a>
                   </li>
                 ))}
               </ul>
             </div>

          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-white/20 font-semibold tracking-widest uppercase">
            © {currentYear} VaultIX. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <a href="#" className="text-[10px] text-white/20 hover:text-white transition-colors font-semibold tracking-widest uppercase">Privacy Policy</a>
            <a href="#" className="text-[10px] text-white/20 hover:text-white transition-colors font-semibold tracking-widest uppercase">Terms of Service</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
