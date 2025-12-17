"use client"

import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"
import { Clock } from "lucide-react"

interface HourlyChartProps {
    data: { name: string; value: number }[]
}

export function HourlyChart({ data }: HourlyChartProps) {
    return (
        <GlassCard className="col-span-4 hover:shadow-blue-500/10 transition-all">
            <GlassCardHeader>
                <GlassCardTitle className="flex items-center justify-end gap-2">
                    <span>ساعات الذروة</span>
                    <Clock className="w-5 h-5 text-blue-500" />
                </GlassCardTitle>
                <p className="text-sm text-muted-foreground text-right">حجم المبيعات حسب ساعات اليوم</p>
            </GlassCardHeader>
            <GlassCardContent className="pl-0 pb-0">
                <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
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
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md">
                                                <div className="mb-1 text-xs text-muted-foreground">
                                                    الساعة {payload[0].payload.name}
                                                </div>
                                                <div className="font-bold text-blue-500">
                                                    {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(payload[0].value as number)}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="url(#colorHourly)"
                                radius={[8, 8, 0, 0]}
                                animationDuration={1000}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCardContent>
        </GlassCard>
    )
}
