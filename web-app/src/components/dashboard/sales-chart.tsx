
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2 } from "lucide-react"

interface SalesChartProps {
    data: { date: string; sales: number }[]
    avgDailySales?: number
    todaySales?: number
    yesterdaySales?: number
    salesChangePercent?: number
}

export function SalesChart({ data, avgDailySales = 0, todaySales = 0, yesterdaySales = 0, salesChangePercent = 0 }: SalesChartProps) {
    // Calculate statistics from real data
    const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
    const maxSales = Math.max(...data.map(d => d.sales), 0);
    const minSales = Math.min(...data.map(d => d.sales), 0);
    const avgSales = avgDailySales || (data.length > 0 ? totalSales / data.length : 0);
    
    // Calculate trend (last 7 days vs previous 7 days)
    const last7Days = data.slice(-7);
    const prev7Days = data.slice(-14, -7);
    const last7Total = last7Days.reduce((s, d) => s + d.sales, 0);
    const prev7Total = prev7Days.reduce((s, d) => s + d.sales, 0);
    const weeklyTrend = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;
    
    // Best and worst days
    const bestDay = data.reduce((best, d) => d.sales > best.sales ? d : best, data[0] || { date: '', sales: 0 });
    const worstDay = data.reduce((worst, d) => d.sales < worst.sales ? d : worst, data[0] || { date: '', sales: 0 });
    
    // Performance assessment
    const getPerformanceLevel = () => {
        if (weeklyTrend > 10) return { level: 'ممتاز', color: 'text-emerald-500', bg: 'bg-emerald-500/20', icon: CheckCircle2 };
        if (weeklyTrend > 0) return { level: 'جيد', color: 'text-blue-500', bg: 'bg-blue-500/20', icon: TrendingUp };
        if (weeklyTrend > -10) return { level: 'مقبول', color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: Target };
        return { level: 'يحتاج تحسين', color: 'text-red-500', bg: 'bg-red-500/20', icon: AlertTriangle };
    };
    
    const performance = getPerformanceLevel();
    const PerformanceIcon = performance.icon;
    
    // Format data for chart
    const formattedData = data.map(item => ({
        name: new Date(item.date).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' }),
        fullDate: new Date(item.date).toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        sales: item.sales,
        avg: avgSales
    }));

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(value);

    return (
        <GlassCard className="col-span-4 transition-all hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/10">
            <GlassCardHeader>
                <div className="flex items-center justify-between w-full">
                    <Badge className={`${performance.bg} ${performance.color} border-0 px-3 py-1`}>
                        <PerformanceIcon className="w-4 h-4 ml-1" />
                        {performance.level}
                    </Badge>
                    <div className="text-right">
                        <GlassCardTitle>تقييم الأداء</GlassCardTitle>
                        <p className="text-sm text-muted-foreground">تحليل المبيعات لآخر {data.length} يوم</p>
                    </div>
                </div>
            </GlassCardHeader>
            <GlassCardContent className="pb-0">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-muted-foreground">المتوسط اليومي</div>
                        <div className="text-sm font-bold text-blue-500">{formatCurrency(avgSales)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-muted-foreground">أعلى يوم</div>
                        <div className="text-sm font-bold text-emerald-500">{formatCurrency(maxSales)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-muted-foreground">اتجاه الأسبوع</div>
                        <div className={`text-sm font-bold flex items-center justify-center gap-1 ${weeklyTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {weeklyTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {weeklyTrend >= 0 ? '+' : ''}{weeklyTrend.toFixed(1)}%
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-muted-foreground">إجمالي الفترة</div>
                        <div className="text-sm font-bold text-purple-500">{formatCurrency(totalSales)}</div>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            {/* Average Reference Line */}
                            <ReferenceLine 
                                y={avgSales} 
                                stroke="#3b82f6" 
                                strokeDasharray="5 5" 
                                strokeWidth={2}
                                label={{ value: 'المتوسط', fill: '#3b82f6', fontSize: 10, position: 'right' }}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const value = payload[0].value as number;
                                        const isAboveAvg = value > avgSales;
                                        return (
                                            <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md">
                                                <div className="mb-1 text-xs text-muted-foreground">
                                                    {payload[0].payload.fullDate}
                                                </div>
                                                <div className={`font-bold ${isAboveAvg ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                    {formatCurrency(value)}
                                                </div>
                                                <div className="text-xs mt-1">
                                                    {isAboveAvg ? (
                                                        <span className="text-emerald-400">↑ أعلى من المتوسط بـ {formatCurrency(value - avgSales)}</span>
                                                    ) : (
                                                        <span className="text-orange-400">↓ أقل من المتوسط بـ {formatCurrency(avgSales - value)}</span>
                                                    )}
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

                {/* Bottom Insights */}
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 pb-3 border-t border-white/10 mt-2">
                    <span>
                        أفضل يوم: {bestDay.date ? new Date(bestDay.date).toLocaleDateString('ar-IQ', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        خط المتوسط
                    </span>
                </div>
            </GlassCardContent>
        </GlassCard>
    )
}
