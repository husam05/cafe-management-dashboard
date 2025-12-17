"use client"

import { useState } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface DailyPerformance {
    date: string;
    income: number;
    expenses: number;
    net: number;
}

interface DailyPerformanceTableProps {
    data: DailyPerformance[];
}

export function DailyPerformanceTable({ data }: DailyPerformanceTableProps) {
    const [showAll, setShowAll] = useState(false);
    const displayData = showAll ? data : data.slice(0, 7);

    return (
        <GlassCard className="col-span-full">
            <GlassCardHeader>
                <GlassCardTitle className="flex items-center justify-end gap-2">
                    <span>الأداء اليومي</span>
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
                <div className="relative overflow-x-auto">
                    <Table dir="rtl">
                        <TableHeader>
                            <TableRow className="border-b-white/10 hover:bg-transparent">
                                <TableHead className="text-right font-bold">التاريخ</TableHead>
                                <TableHead className="text-right font-bold">الدخل</TableHead>
                                <TableHead className="text-right font-bold">المصروفات</TableHead>
                                <TableHead className="text-right font-bold">الصافي</TableHead>
                                <TableHead className="text-right font-bold">الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayData.map((day, index) => {
                                const isProfit = day.net >= 0;
                                return (
                                    <TableRow key={index} className="border-b-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="font-medium">
                                            {new Date(day.date).toLocaleDateString('ar-IQ', {
                                                weekday: 'short',
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            {new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0 }).format(day.income)}
                                        </TableCell>
                                        <TableCell className="text-red-600 dark:text-red-400 font-bold">
                                            {new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0 }).format(day.expenses)}
                                        </TableCell>
                                        <TableCell className={`font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0, signDisplay: 'always' }).format(day.net)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={isProfit ? "default" : "destructive"}
                                                className="flex items-center gap-1 w-fit"
                                            >
                                                {isProfit ? (
                                                    <>
                                                        <TrendingUp className="w-3 h-3" />
                                                        <span>ربح</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TrendingDown className="w-3 h-3" />
                                                        <span>خسارة</span>
                                                    </>
                                                )}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {data.length > 7 && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                            {showAll ? `إخفاء (${data.length - 7} يوم)` : `عرض الكل (${data.length} يوم)`}
                        </button>
                    </div>
                )}
            </GlassCardContent>
        </GlassCard>
    );
}
