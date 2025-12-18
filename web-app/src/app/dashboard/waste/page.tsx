'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Trash2, 
    TrendingDown,
    RefreshCw,
    Calendar,
    AlertTriangle,
    ArrowLeft,
    Package,
    AlertCircle,
    Activity,
    BarChart3,
    Coffee
} from 'lucide-react';
import Link from 'next/link';

interface WasteData {
    period: { from: string; to: string };
    kpis: {
        totalWaste: number;
        wasteRatio: number;
        wasteEventsCount: number;
    };
    byItem: { item: string; amount: number; count: number }[];
    trend: { date: string; amount: number }[];
    events: {
        date: string;
        description: string;
        item?: string;
        quantity?: number;
        amount: number;
        reason?: string;
    }[];
    alerts: { type: string; message: string }[];
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(num);
}

export default function WastePage() {
    const [data, setData] = useState<WasteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [error, setError] = useState<string | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/analytics?period=${period}&view=waste`);
            if (!response.ok) throw new Error('Failed to fetch');
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError('فشل في تحميل البيانات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [period]);
    
    if (loading) {
        return (
            <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
                <Skeleton className="h-12 w-64 bg-white/20" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-32 bg-white/20 rounded-xl" />)}
                </div>
                <Skeleton className="h-80 bg-white/20 rounded-xl" />
            </div>
        );
    }
    
    if (error || !data) {
        return (
            <div className="flex-1 p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
                <GlassCard variant="destruction">
                    <div className="text-center py-8">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400">{error}</p>
                        <Button onClick={fetchData} className="mt-4 bg-red-500 hover:bg-red-600">
                            <RefreshCw className="w-4 h-4 ml-2" />
                            إعادة المحاولة
                        </Button>
                    </div>
                </GlassCard>
            </div>
        );
    }
    
    const hasWaste = data.kpis.totalWaste > 0;
    
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div className="flex gap-3">
                    <Link href="/dashboard">
                        <Button variant="outline" className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20">
                            <ArrowLeft className="w-4 h-4 ml-2" />
                            العودة
                        </Button>
                    </Link>
                    
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-36 bg-white/10 backdrop-blur border-white/20">
                            <Calendar className="w-4 h-4 ml-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">اليوم</SelectItem>
                            <SelectItem value="week">هذا الأسبوع</SelectItem>
                            <SelectItem value="month">هذا الشهر</SelectItem>
                            <SelectItem value="year">هذه السنة</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button variant="outline" onClick={fetchData} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="text-right">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-orange-600 to-amber-500 bg-clip-text text-transparent flex items-center gap-3 justify-end">
                        <Trash2 className="w-10 h-10 text-orange-500" />
                        تتبع الهدر
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {data.period.from} → {data.period.to}
                    </p>
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <GlassCard className={`bg-gradient-to-br from-orange-500/10 to-transparent ${data.kpis.wasteRatio > 5 ? 'border-orange-500/50' : 'border-orange-500/20'}`}>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-orange-500/20">
                            <TrendingDown className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">إجمالي الهدر</span>
                            <p className={`text-3xl font-bold ${data.kpis.wasteRatio > 5 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                {formatCurrency(data.kpis.totalWaste)}
                            </p>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard className={data.kpis.wasteRatio > 5 ? "border-red-500/30" : ""}>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-red-500/20">
                            <Activity className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">نسبة الهدر</span>
                            <p className={`text-3xl font-bold ${data.kpis.wasteRatio > 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {data.kpis.wasteRatio.toFixed(2)}%
                            </p>
                            {data.kpis.wasteRatio > 5 && (
                                <span className="text-xs text-red-500 flex items-center gap-1 justify-end mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    يحتاج مراجعة
                                </span>
                            )}
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-amber-500/20">
                            <Package className="h-6 w-6 text-amber-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">عدد حالات الهدر</span>
                            <p className="text-3xl font-bold text-amber-500">{data.kpis.wasteEventsCount}</p>
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {hasWaste ? (
                <>
                    {/* Charts Grid */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        
                        {/* By Item */}
                        <GlassCard>
                            <GlassCardHeader>
                                <GlassCardTitle className="flex items-center justify-end gap-2">
                                    <span>أكثر المواد هدراً</span>
                                    <Coffee className="w-5 h-5 text-amber-500" />
                                </GlassCardTitle>
                            </GlassCardHeader>
                            <GlassCardContent>
                                {data.byItem.length > 0 ? (
                                    <div className="space-y-3">
                                        {data.byItem.slice(0, 10).map((item, i) => {
                                            const maxAmount = Math.max(...data.byItem.map(x => x.amount));
                                            const width = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{item.count} مرة</span>
                                                        <span className="font-medium flex items-center gap-2">
                                                            {i === 0 && '🥇 '}
                                                            {i === 1 && '🥈 '}
                                                            {i === 2 && '🥉 '}
                                                            {item.item}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-white/10 rounded-full h-2.5">
                                                        <div 
                                                            className="bg-gradient-to-l from-orange-500 to-amber-500 h-2.5 rounded-full transition-all"
                                                            style={{ width: `${width}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-left text-orange-500 font-mono">
                                                        {formatCurrency(item.amount)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        لا توجد بيانات عن المواد المهدرة
                                    </div>
                                )}
                            </GlassCardContent>
                        </GlassCard>
                        
                        {/* Daily Trend */}
                        <GlassCard>
                            <GlassCardHeader>
                                <GlassCardTitle className="flex items-center justify-end gap-2">
                                    <span>الاتجاه اليومي</span>
                                    <BarChart3 className="w-5 h-5 text-orange-500" />
                                </GlassCardTitle>
                            </GlassCardHeader>
                            <GlassCardContent>
                                {data.trend.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.trend.slice(-14).map((day, i) => {
                                            const maxAmount = Math.max(...data.trend.map(d => d.amount));
                                            const width = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
                                            const isHighWaste = day.amount > (data.kpis.totalWaste / data.trend.length) * 1.5;
                                            
                                            return (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground w-20 text-left">{day.date}</span>
                                                    <div className="flex-1 bg-white/10 rounded-full h-3">
                                                        <div 
                                                            className={`h-3 rounded-full transition-all ${isHighWaste ? 'bg-red-500' : 'bg-orange-500/60'}`}
                                                            style={{ width: `${width}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-mono w-28 text-right ${isHighWaste ? 'text-red-500' : 'text-orange-500'}`}>
                                                        {formatCurrency(day.amount)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        لا توجد بيانات كافية
                                    </div>
                                )}
                            </GlassCardContent>
                        </GlassCard>
                    </div>
                    
                    {/* Events Table */}
                    <GlassCard>
                        <GlassCardHeader>
                            <GlassCardTitle className="flex items-center justify-end gap-2">
                                <span>سجل حالات الهدر ({data.events.length})</span>
                                <Trash2 className="w-5 h-5 text-orange-500" />
                            </GlassCardTitle>
                        </GlassCardHeader>
                        <GlassCardContent>
                            {data.events.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table dir="rtl">
                                        <TableHeader>
                                            <TableRow className="border-b-white/10">
                                                <TableHead className="text-right">التاريخ</TableHead>
                                                <TableHead className="text-right">المادة</TableHead>
                                                <TableHead className="text-right">الوصف</TableHead>
                                                <TableHead className="text-center">الكمية</TableHead>
                                                <TableHead className="text-left">القيمة</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.events.slice(0, 30).map((e, i) => (
                                                <TableRow key={i} className="border-b-white/5 hover:bg-white/5">
                                                    <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                                                            {e.item || 'غير محدد'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-48 truncate text-sm text-muted-foreground" title={e.description}>
                                                        {e.description}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {e.quantity ? <Badge variant="secondary">{e.quantity}</Badge> : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-left text-orange-500 font-mono font-bold">
                                                        {formatCurrency(e.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    
                                    {data.events.length > 30 && (
                                        <p className="text-center text-muted-foreground text-sm mt-4">
                                            يتم عرض 30 من أصل {data.events.length} حالة
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Trash2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    لا توجد حالات هدر مسجلة
                                </div>
                            )}
                        </GlassCardContent>
                    </GlassCard>
                </>
            ) : (
                /* No Waste - Success State */
                <GlassCard className="border-emerald-500/30 bg-emerald-500/5">
                    <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Activity className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-emerald-500 mb-2">🎉 ممتاز!</h3>
                        <p className="text-muted-foreground">
                            لم يتم تسجيل أي هدر خلال هذه الفترة
                        </p>
                        <Badge className="mt-4 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                            نسبة هدر 0%
                        </Badge>
                    </div>
                </GlassCard>
            )}
            
            {/* Tips Card */}
            <GlassCard className="border-blue-500/20">
                <GlassCardHeader>
                    <GlassCardTitle className="flex items-center justify-end gap-2 text-blue-500">
                        <span>نصائح لتقليل الهدر</span>
                        <AlertCircle className="w-5 h-5" />
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <h4 className="font-bold text-blue-400 mb-2">📦 إدارة المخزون</h4>
                            <p className="text-sm text-muted-foreground">
                                راقب تواريخ انتهاء الصلاحية واستخدم نظام FIFO (الأول دخولاً أول خروجاً)
                            </p>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <h4 className="font-bold text-blue-400 mb-2">📊 تحليل الأنماط</h4>
                            <p className="text-sm text-muted-foreground">
                                حدد المنتجات الأكثر هدراً واعمل على تقليل طلبها أو تحسين تخزينها
                            </p>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <h4 className="font-bold text-blue-400 mb-2">🎯 التدريب</h4>
                            <p className="text-sm text-muted-foreground">
                                درب الموظفين على التعامل الصحيح مع المواد الغذائية والمشروبات
                            </p>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <h4 className="font-bold text-blue-400 mb-2">🔔 التنبيهات</h4>
                            <p className="text-sm text-muted-foreground">
                                فعّل التنبيهات عند تجاوز نسبة الهدر 5% للتدخل السريع
                            </p>
                        </div>
                    </div>
                </GlassCardContent>
            </GlassCard>
            
            {/* Alerts */}
            {data.alerts.length > 0 && (
                <GlassCard className="border-red-500/20">
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2 text-red-500">
                            <span>تنبيهات الهدر</span>
                            <AlertTriangle className="w-5 h-5" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-2">
                            {data.alerts.map((alert, i) => (
                                <div key={i} className={`p-3 rounded-lg border text-sm ${
                                    alert.type === 'danger' 
                                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                        : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                }`}>
                                    {alert.message}
                                </div>
                            ))}
                        </div>
                    </GlassCardContent>
                </GlassCard>
            )}
        </div>
    );
}
