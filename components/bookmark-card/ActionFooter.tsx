"use client"

import { motion } from "framer-motion"
import ActionButtons, { type ActionButtonsProps } from "@/components/bookmark-card/ActionButtons"
import PriorityStars from "@/components/bookmark-card/PriorityStars"

type Props = ActionButtonsProps

export default function ActionFooter(props: Props) {
  const { bookmark, isMobile } = props

  return (
    <motion.div
      key={isMobile ? "m" : "d"}
      initial={isMobile ? { opacity: 0, y: 10 } : false}
      whileInView={isMobile ? { opacity: 1, y: 0 } : {}}
      viewport={{ once: true, amount: 0.1, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`p-3 bg-themeCard/90 backdrop-blur-md flex items-center justify-between border-t border-white/10 rounded-b-2xl absolute bottom-0 left-0 right-0 z-20 ${isMobile ? "" : "hidden"}`}
    >
      <PriorityStars priority={bookmark.priority} isMobile={isMobile} />
      <ActionButtons {...props} />
    </motion.div>
  )
}
