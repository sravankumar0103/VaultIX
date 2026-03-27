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
import { motion } from "framer-motion"

// --- Custom Styled Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Recharts Pie and Area charts have different payload structures
        const data = payload[0].payload;
        const name = payload[0].name || data.name || label || "Data";

        return (
            <div className="glass p-3 border-none rounded-2xl shadow-2xl min-w-[120px]">
                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-widest">{name}</p>
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
                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
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
                        cursor={{ stroke: '#9333ea', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#9333ea"
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

// --- 2. DISTRIBUTION PIE CHART ---
export const DistributionChart = ({ data }: { data: any[] }) => {
    const COLORS = ["#9333ea", "#d946ef", "#6366f1", "#06b6d4"]

    return (
        <div className="w-full h-40 relative">
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
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: '#d946ef', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Central Label for Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-themeMuted text-[9px] font-bold uppercase tracking-widest mb-0.5">Total</span>
                <span className="text-2xl font-black text-themeText leading-none">
                    {data.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
            </div>
        </div>
    )
}
