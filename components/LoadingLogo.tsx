"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

const letters = ["V", "a", "u", "l", "t", "I", "X"]

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const letterVariants = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 0.8,
      ease: "easeInOut" as const,
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
}

export default function LoadingLogo({ loading = true, delayMs = 300, inline = false }: { loading?: boolean, delayMs?: number, inline?: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!loading) return

    const timer = window.setTimeout(() => {
      setShow(true)
    }, delayMs)

    return () => {
      window.clearTimeout(timer)
      setShow(false)
    }
  }, [loading, delayMs])

  if (!loading || !show) return null

  const logoContent = (
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
          className={index >= 5 ? "text-purple-500" : "text-current"}
        >
          {letter}
        </motion.span>
      ))}
    </motion.div>
  )

  if (inline) {
    return logoContent
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center w-full h-screen bg-themeBg/40 backdrop-blur-[2px]"
    >
      <span className="sr-only">Loading</span>
      {logoContent}
    </motion.div>
  )
}
