"use client"

import React from "react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"

// --- Custom Styled Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const name = payload[0].name || data.name || label || "Data";

        return (
            <div className="glass p-3 border-none rounded-2xl shadow-2xl min-w-[120px]">
                <p className="text-[10px] font-bold text-purple-500 mb-1 uppercase tracking-widest">{name}</p>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-themeText leading-none">{payload[0].value}</span>
                    <span className="text-[10px] font-semibold text-themeMuted uppercase tracking-tight">items</span>
                </div>
            </div>
        )
    }
    return null
}

// --- 1. GROWTH AREA CHART ---
export const GrowthChart = ({ data }: { data: any[] }) => {
    return (
        <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#a855f7"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#gradientArea)"
                        animationDuration={1500}
                        animationEasing="ease-out"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

// --- 2. DISTRIBUTION PIE CHART (Apple-Style Dynamic Center) ---
export const DistributionChart = ({ data }: { data: any[] }) => {
    const [activeIndex, setActiveIndex] = React.useState(-1)
    const COLORS = ["#a855f7", "#d946ef", "#6366f1", "#06b6d4"]
    const total = data.reduce((acc, curr) => acc + curr.value, 0)

    return (
        <div className="w-full h-40 relative select-none">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={70}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={8}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                        animationBegin={0}
                        animationDuration={1000}
                        animationEasing="ease-out"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                style={{
                                    filter: activeIndex === index ? `drop-shadow(0 0 10px ${COLORS[index % COLORS.length]}80)` : 'none',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                }}
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            {/* Apple-Style Dynamic Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                    {activeIndex === -1 ? (
                        <motion.div
                            key="total"
                            initial={{ opacity: 0, scale: 0.9, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-themeMuted text-[8px] font-bold uppercase tracking-[0.2em] mb-0.5">Total</span>
                            <span className="text-2xl font-black text-themeText leading-none tabular-nums tracking-tighter">{total}</span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="detail"
                            initial={{ opacity: 0, scale: 0.9, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-purple-500 text-[8px] font-black uppercase tracking-[0.15em] mb-0.5 px-2 text-center truncate max-w-[80px]">
                                {data[activeIndex].name}
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-themeText leading-none tabular-nums tracking-tighter">
                                    {data[activeIndex].value}
                                </span>
                                <span className="text-[8px] font-bold text-themeMuted uppercase opacity-60">Items</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
