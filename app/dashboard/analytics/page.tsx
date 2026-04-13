"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  PieChart as PieIcon,
  Globe,
  BarChart2,
  Zap,
  ShieldCheck,
  Search,
  Download
} from "lucide-react"
import {
  GrowthChart,
  DistributionChart
} from "@/components/AnalyticsChart"
import LoadingLogo from "@/components/LoadingLogo"
import { isDeletedAccountError, recoverFromAuthError } from "@/lib/authSession"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [data, setData] = useState<any>({
    growth: [],
    distribution: [],
    stats: {
      total: 0,
      priority: 0,
      recent: 0
    },
    windowLabel: "Last 7 days",
  })

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const exportToPDF = async () => {
    if (!dashboardRef.current) return

    try {
      const [{ default: jsPDF }, { toPng }] = await Promise.all([
        import("jspdf"),
        import("html-to-image"),
      ])

      const dataUrl = await toPng(dashboardRef.current, {
        backgroundColor: document.documentElement.classList.contains("dark") ? "#020617" : "#f8fafc",
        quality: 1.0,
        pixelRatio: 2,
      })

      const pdf = new jsPDF("p", "mm", "a4")
      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save("VaultIX-Insights.pdf")
    } catch (err) {
      console.error("PDF Export failed:", err)
    }
  }

  const fetchAnalyticsData = async (silent = false) => {
    if (!silent) setLoading(true)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      const recovered = await recoverFromAuthError(userError.message)
      if (recovered && isDeletedAccountError(userError.message)) {
        router.replace("/")
      }
      if (!silent) setLoading(false)
      return
    }

    if (!user) {
      if (!silent) setLoading(false)
      return
    }

    const { data: bookmarks, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)

    if (error || !bookmarks) {
      setLoading(false)
      return
    }

    // --- Process Data ---

    // 1. Stats
    const total = bookmarks.length
    const priority = bookmarks.filter(b => b.priority === 3).length

    // Determine how long the user has been creating bookmarks
    const now = new Date()
    const oldestCreatedAt = bookmarks.reduce((min: Date, b: any) => {
      const created = new Date(b.created_at)
      return created < min ? created : min
    }, now)
    const diffMs = now.getTime() - oldestCreatedAt.getTime()
    const daysSinceFirst = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

    // Decide time window based on usage duration
    let windowDays = 7
    let windowLabel = "Last 7 days"

    if (daysSinceFirst > 7 && daysSinceFirst <= 30) {
      windowDays = 30
      windowLabel = "Last 30 days"
    } else if (daysSinceFirst > 30 && daysSinceFirst <= 90) {
      windowDays = 90
      windowLabel = "Last 3 months"
    } else if (daysSinceFirst > 90 && daysSinceFirst <= 180) {
      windowDays = 180
      windowLabel = "Last 6 months"
    } else if (daysSinceFirst > 180) {
      windowDays = 365
      windowLabel = "Last 12 months"
    }

    // 1b. Growth count in the chosen window
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - (windowDays - 1))
    const recent = bookmarks.filter(b => new Date(b.created_at) >= windowStart).length

    // 2. Growth series for the chosen window (daily buckets)
    const growthMap: any = {}
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      growthMap[dateStr] = 0
    }

    bookmarks.forEach(b => {
      const created = new Date(b.created_at)
      if (created >= windowStart) {
        const dateStr = created.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (growthMap[dateStr] !== undefined) {
          growthMap[dateStr]++
        }
      }
    })

    const growthData = Object.keys(growthMap).map(key => ({
      name: key,
      count: growthMap[key]
    }))

    // 3. Distribution
    const distMap: any = {}
    bookmarks.forEach(b => {
      const cat = b.category || "Uncategorized"
      distMap[cat] = (distMap[cat] || 0) + 1
    })
    const distData = Object.keys(distMap).map(key => ({
      name: key,
      value: distMap[key]
    }))

    setData({
      growth: growthData,
      distribution: distData,
      stats: { total, priority, recent },
      windowLabel,
    })
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchAnalyticsData()

    const channel = supabase
      .channel("analytics-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks" },
        () => {
          // Re-fetch data silently on any change
          fetchAnalyticsData(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  if (loading) {
    return (
      <LoadingLogo />
    )
  }

  return (
    <div ref={dashboardRef} className="p-4 md:px-6 md:py-4 space-y-4 max-w-7xl mx-auto pb-10">
 
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8 mt-2">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col max-w-full overflow-hidden"
        >
          <h2 className="text-lg md:text-xl font-medium text-themeMuted mb-1 truncate">Intelligent Insights & Data Distribution</h2>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-themeText">Analytics</h1>
        </motion.div>
 
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={exportToPDF}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-bold transition-all active:scale-95 shadow-xl shadow-purple-500/30 border border-purple-500/20"
        >
          <Download size={18} strokeWidth={2.5} />
          <span>Generate Report</span>
        </motion.button>
      </div>

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6">
        {[
          { label: "Total Assets", value: data.stats.total, icon: BarChart2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
          { label: "High Priority", value: data.stats.priority, icon: Zap, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { label: `Growth (${data.windowLabel})`, value: data.stats.recent, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass p-2 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center gap-1.5 md:gap-4 group hover:shadow-xl hover:shadow-purple-500/5 transition-all"
          >
            <div className={`p-1.5 md:p-3.5 rounded-lg md:rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon size={14} className="md:w-[22px] md:h-[22px]" />
            </div>
            <div className="text-center md:text-left">
              <p className="text-themeMuted text-[7px] md:text-[10px] font-bold uppercase tracking-widest mb-0.5 md:mb-1 leading-tight line-clamp-2">{stat.label}</p>
              <p className="text-base md:text-2xl font-black text-themeText leading-none">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* --- CHARTS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Growth Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-500"><TrendingUp size={20} /></div>
              <h2 className="text-xl font-bold text-themeText">Growth Velocity</h2>
            </div>
            <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
              {data.windowLabel}
            </span>
          </div>
          <GrowthChart data={data.growth} />
        </motion.div>

        {/* Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400"><PieIcon size={20} /></div>
              <h2 className="text-xl font-bold text-themeText">Category Split</h2>
            </div>
            <span className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Dynamic Distribution</span>
          </div>
          <DistributionChart data={data.distribution} />
        </motion.div>

      </div>

      {/* footer removed for space consolidation into header */}

    </div>
  )
}
