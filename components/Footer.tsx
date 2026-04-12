"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Github, Twitter, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-[#050507] border-t border-white/5 pt-24 pb-12 overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">

          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tighter text-white">VaultIX</span>
            </div>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed">
              Intelligent indeXing for your digital history. The high-performance vault for the modern mind.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Twitter className="w-4 h-4 text-white/60" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Github className="w-4 h-4 text-white/60" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Linkedin className="w-4 h-4 text-white/60" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Product</h4>
            <ul className="space-y-4">
              {['Intelligence', 'Features', 'Security', 'Sync'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-white/40 hover:text-purple-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools Column */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Tools</h4>
            <ul className="space-y-4">
              {['Analytics', 'Export', 'Themes', 'Mobile'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-white/40 hover:text-purple-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account Column */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Account</h4>
            <ul className="space-y-4">
              {['Security', 'Privacy', 'Permanent Deletion', 'Contact'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-white/40 hover:text-purple-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[11px] text-white/20 font-medium tracking-widest uppercase">
            © {currentYear} VaultIX. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <a href="#" className="text-[11px] text-white/20 hover:text-white transition-colors font-medium tracking-widest uppercase">Privacy Policy</a>
            <a href="#" className="text-[11px] text-white/20 hover:text-white transition-colors font-medium tracking-widest uppercase">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
