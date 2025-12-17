"use client"

import * as React from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"
import { PieChart as PieChartIcon } from "lucide-react"

interface CategoryChartProps {
    data: { name: string; value: number }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function CategoryChart({ data }: CategoryChartProps) {
    return (
        <GlassCard className="col-span-4 lg:col-span-3 hover:shadow-purple-500/10 transition-all">
            <GlassCardHeader>
                <GlassCardTitle className="flex items-center justify-end gap-2">
                    <span>المبيعات حسب الفئة</span>
                    <PieChartIcon className="w-5 h-5 text-purple-500" />
                </GlassCardTitle>
                <p className="text-sm text-muted-foreground text-right">توزيع المبيعات عبر فئات القائمة</p>
            </GlassCardHeader>
            <GlassCardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {COLORS.map((color, index) => (
                                    <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.9} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0.6} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={100}
                                innerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                                animationDuration={1000}
                                animationBegin={0}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#gradient-${index % COLORS.length})`}
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md">
                                                <div className="mb-1 text-sm font-medium">
                                                    {payload[0].name}
                                                </div>
                                                <div className="font-bold text-purple-500">
                                                    {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(payload[0].value as number)}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </GlassCardContent>
        </GlassCard>
    )
}
