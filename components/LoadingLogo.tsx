"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

export default function LoadingLogo({ loading = true, delayMs = 300, inline = false }: { loading?: boolean, delayMs?: number, inline?: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let timer: number | undefined

    if (loading) {
      timer = window.setTimeout(() => {
        setShow(true)
      }, delayMs)
    } else {
      setShow(false)
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [loading, delayMs])

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
    return logoContent;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center w-full h-screen bg-themeBg/40 backdrop-blur-[2px] animate-in fade-in duration-300">
      {logoContent}
    </div>
  )
}
