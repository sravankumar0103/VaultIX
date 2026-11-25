"use client"

import { Star } from "lucide-react"
import { motion } from "framer-motion"

type Props = {
  priority?: number | null
  isMobile: boolean
  className?: string
}

export default function PriorityStars({ priority, isMobile, className = "" }: Props) {
  return (
    <motion.div
      key={isMobile ? "m" : "d"}
      initial={isMobile ? { opacity: 0 } : false}
      whileInView={isMobile ? { opacity: 1 } : {}}
      viewport={{ amount: 0.1, margin: "-10% 0px -10% 0px" }}
      className={`flex gap-0.5 text-yellow-500 ${className}`}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < (priority ?? 0) ? "fill-current" : "text-gray-300 dark:text-white/10"}
        />
      ))}
    </motion.div>
  )
}
