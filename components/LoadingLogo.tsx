"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

export default function LoadingLogo({ delayMs = 300 }: { delayMs?: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  if (!show) return null

  const letters = ["V", "a", "u", "l", "t", "I", "X"]

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
        repeat: Infinity,
        repeatDelay: 0.5,
      },
    },
  }

  const letterVariants = {
    initial: { opacity: 0.3 },
    animate: {
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 0.8,
        ease: "easeInOut" as any,
      },
    },
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center w-full h-screen bg-themeBg/40 backdrop-blur-[2px] animate-in fade-in duration-300">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex items-center text-sm md:text-base font-black tracking-tight"
      >
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className={index >= 5 ? "text-purple-500" : "text-themeText"}
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </div>
  )
}
