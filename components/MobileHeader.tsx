"use client"

import { Menu } from "lucide-react"
import { motion } from "framer-motion"

export default function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 w-full glass border-b border-white/5 bg-themeBg/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        <h1 className="text-xl font-bold tracking-tight text-themeText">
          Vault<span className="text-purple-500">IX</span>
        </h1>
      </motion.div>

      <button
        onClick={onOpenMenu}
        className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-themeMuted hover:text-themeText transition-all active:scale-95"
      >
        <Menu size={20} />
      </button>
    </header>
  )
}
