
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"

interface SalesChartProps {
    data: { date: string; sales: number }[]
}

export function SalesChart({ data }: SalesChartProps) {
    // Format data for better display
    const formattedData = data.map(item => ({
        name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        sales: item.sales
    }));

    return (
        <GlassCard className="col-span-4 transition-all hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/10">
            <GlassCardHeader>
                <GlassCardTitle>Overview Assessment</GlassCardTitle>
                <p className="text-sm text-muted-foreground">Daily sales performance trajectory.</p>
            </GlassCardHeader>
            <GlassCardContent className="pl-0 pb-0">
                <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value / 1000}k`}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md">
                                                <div className="mb-1 text-xs text-muted-foreground">
                                                    {payload[0].payload.fullDate}
                                                </div>
                                                <div className="font-bold text-emerald-500">
                                                    {new Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(payload[0].value as number)}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="sales"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorSales)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </GlassCardContent>
        </GlassCard>
    )
}
