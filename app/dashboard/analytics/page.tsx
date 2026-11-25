"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabaseClient"
import { motion } from "framer-motion"
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  Zap,
  Download
} from "lucide-react"
import LoadingLogo from "@/components/LoadingLogo"
import Toast from "@/components/Toast"
import { useDashboardUser } from "@/components/DashboardUserContext"
import { buildAnalytics, type AnalyticsRow, type AnalyticsSummary } from "@/lib/analyticsWindow"
import { useToast } from "@/lib/useToast"

const REFETCH_DEBOUNCE_MS = 500

// recharts is loaded on demand; the placeholder holds the chart's height (h-40).
const GrowthChart = dynamic(
  () => import("@/components/AnalyticsChart").then(m => m.GrowthChart),
  { ssr: false, loading: () => <div className="w-full h-40" /> }
)
const DistributionChart = dynamic(
  () => import("@/components/AnalyticsChart").then(m => m.DistributionChart),
  { ssr: false, loading: () => <div className="w-full h-40" /> }
)

const EMPTY_SUMMARY: AnalyticsSummary = {
  growth: [],
  distribution: [],
  stats: {
    total: 0,
    priority: 0,
    recent: 0
  },
  windowLabel: "Last 7 days",
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const reportButtonRef = useRef<HTMLButtonElement>(null)
  const { toast, showToast, hideToast } = useToast()
  const [data, setData] = useState<AnalyticsSummary>(EMPTY_SUMMARY)
  // Depend on the id, never the User object: a token refresh hands out a new object.
  const userId = useDashboardUser().id

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
        filter: node => node !== reportButtonRef.current,
      })

      const pdf = new jsPDF("p", "mm", "a4")
      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      // A tall report continues on extra pages: the same image, shifted up one page at a time.
      const pages = Math.max(1, Math.ceil(pdfHeight / pageHeight - 0.01))
      for (let page = 0; page < pages; page++) {
        if (page > 0) pdf.addPage()
        pdf.addImage(dataUrl, "PNG", 0, -page * pageHeight, pdfWidth, pdfHeight)
      }
      pdf.save("VaultIX-Insights.pdf")
    } catch (err) {
      console.error("PDF Export failed:", err)
      showToast("Couldn't create the report. Please try again.", "error")
    }
  }

  // One fetch on open, then a debounced refetch on this user's bookmark changes.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("bookmarks")
        .select("created_at,priority,category,is_archived")
        .eq("user_id", userId)

      if (cancelled) return
      if (error || !rows) {
        setLoading(false)
        return
      }

      // The browser Supabase client is untyped, so rows arrive as any[].
      setData(buildAnalytics(rows as AnalyticsRow[], new Date()))
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`analytics-sync-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks", filter: `user_id=eq.${userId}` },
        () => {
          if (timer !== null) clearTimeout(timer)
          timer = setTimeout(() => {
            timer = null
            load()
          }, REFETCH_DEBOUNCE_MS)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [userId])

  if (loading) {
    return (
      <LoadingLogo />
    )
  }

  return (
    <>
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
            ref={reportButtonRef}
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

      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  )
}
