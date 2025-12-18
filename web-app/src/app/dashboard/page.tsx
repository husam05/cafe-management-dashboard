'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    DollarSign, 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle,
    RefreshCw,
    Calendar,
    AlertCircle,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    BarChart3,
    Wallet,
    CreditCard,
    Banknote,
    Target,
    Flame,
    ShieldAlert,
    Building2,
    Users
} from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
    period: { from: string; to: string };
    kpis: {
        revenue: number;
        totalOutflow: number;
        netProfit: number;
        burnRate: number;
        expenseRatio: number;
        payrollRatio: number;
        wasteRatio: number;
        runway: number;
        ordersCount: number;
        avgOrderValue: number;
        cashVsCard: { cash: number; card: number };
    };
    alerts: { type: string; code: string; message: string; date?: string }[];
    trend: { date: string; revenue: number; expenses: number; profit: number }[];
    outflowByCategory: { category: string; amount: number; percentage: number }[];
    topVendors: { vendor: string; amount: number; count: number }[];
    cashVsCard: { cash: number; card: number };
    dataSource: { orders: number; receipts: number; expenses: number; staff: number };
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(num);
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat('ar-SA').format(Math.round(num));
}

export default function OwnerDashboardPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [error, setError] = useState<string | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/analytics?period=${period}&view=overview`);
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 bg-white/20 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-80 bg-white/20 rounded-xl" />
                    <Skeleton className="h-80 bg-white/20 rounded-xl" />
                </div>
            </div>
        );
    }
    
    if (error || !data) {
        return (
            <div className="flex-1 p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
                <GlassCard variant="destruction" className="max-w-md mx-auto">
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
    
    const isProfit = data.kpis.netProfit >= 0;
    const dangerAlerts = data.alerts.filter(a => a.type === 'danger');
    const warningAlerts = data.alerts.filter(a => a.type === 'warning');
    
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div className="flex gap-3">
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
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-3 justify-end">
                        <Target className="w-10 h-10 text-emerald-500" />
                        لوحة تحكم المالك
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {data.period.from} → {data.period.to}
                    </p>
                </div>
            </div>
            
            {/* Critical Alerts */}
            {dangerAlerts.length > 0 && (
                <div className="space-y-2">
                    {dangerAlerts.map((alert, i) => (
                        <Alert key={i} variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm">
                            <ShieldAlert className="h-5 w-5" />
                            <AlertTitle className="font-bold mr-2">تنبيه حرج</AlertTitle>
                            <AlertDescription className="mr-2">{alert.message}</AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}
            
            {/* Main KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                
                {/* Revenue */}
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute -bottom-6 -left-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            الإيرادات (الداخل)
                        </span>
                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                            {formatCurrency(data.kpis.revenue)}
                        </span>
                        <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600">
                                {formatNumber(data.kpis.ordersCount)} طلب
                            </Badge>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Outflow */}
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute -bottom-6 -left-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <ArrowDownRight className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3 text-red-500" />
                            المصروفات (الخارج)
                        </span>
                        <span className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                            {formatCurrency(data.kpis.totalOutflow)}
                        </span>
                        <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs border-red-500/30 text-red-600">
                                {data.kpis.expenseRatio.toFixed(1)}% نسبة
                            </Badge>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Net Profit */}
                <GlassCard 
                    variant={isProfit ? "default" : "destruction"} 
                    className={isProfit ? "bg-emerald-500/5 border-emerald-500/20" : ""}
                >
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">صافي الربح</span>
                        <div className="flex flex-row-reverse items-center gap-2 mt-2">
                            <span className={`text-3xl font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(data.kpis.netProfit)}
                            </span>
                            {!isProfit && <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />}
                        </div>
                        <div className={`flex items-center mt-2 text-xs px-3 py-1.5 rounded-full border ${isProfit ? 'text-emerald-600 bg-emerald-100/50 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/30' : 'text-red-600 bg-red-100/50 border-red-200 dark:bg-red-500/20 dark:border-red-500/30'}`}>
                            {isProfit ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                            <span className="font-bold">{isProfit ? "ربح" : "خسارة"}</span>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Burn Rate */}
                <GlassCard className="bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/20">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            معدل الاستهلاك
                        </span>
                        <span className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                            {formatCurrency(data.kpis.burnRate)}
                        </span>
                        <span className="text-xs text-muted-foreground mt-2">
                            يومياً (متوسط 7 أيام)
                        </span>
                    </div>
                </GlassCard>
            </div>
            
            {/* Ratio Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-red-500/20">
                            <Wallet className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">نسبة المصروفات</span>
                            <p className={`text-2xl font-bold ${data.kpis.expenseRatio > 60 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {data.kpis.expenseRatio.toFixed(1)}%
                            </p>
                            <span className="text-xs text-muted-foreground">
                                {data.kpis.expenseRatio > 60 ? '⚠️ مرتفع' : '✅ جيد'}
                            </span>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-purple-500/20">
                            <Users className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">نسبة الرواتب</span>
                            <p className={`text-2xl font-bold ${data.kpis.payrollRatio > 35 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                {data.kpis.payrollRatio.toFixed(1)}%
                            </p>
                            <span className="text-xs text-muted-foreground">
                                {data.kpis.payrollRatio > 35 ? '⚠️ مرتفع' : '✅ جيد'}
                            </span>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-orange-500/20">
                            <Activity className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">نسبة الهدر</span>
                            <p className={`text-2xl font-bold ${data.kpis.wasteRatio > 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {data.kpis.wasteRatio.toFixed(2)}%
                            </p>
                            <span className="text-xs text-muted-foreground">
                                {data.kpis.wasteRatio > 5 ? '⚠️ يحتاج مراجعة' : '✅ ممتاز'}
                            </span>
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                
                {/* Daily Trend */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>الاتجاه اليومي</span>
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-3">
                            {data.trend.slice(-7).map((day, i) => {
                                const maxRevenue = Math.max(...data.trend.map(d => d.revenue));
                                const revenueWidth = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                                const expenseWidth = maxRevenue > 0 ? (day.expenses / maxRevenue) * 100 : 0;
                                
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className={day.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                                                {day.profit >= 0 ? '+' : ''}{formatCurrency(day.profit)}
                                            </span>
                                            <span className="text-muted-foreground">{day.date}</span>
                                        </div>
                                        <div className="flex gap-1 h-4">
                                            <div 
                                                className="bg-emerald-500/60 rounded-r-full transition-all"
                                                style={{ width: `${revenueWidth}%` }}
                                                title={`إيرادات: ${formatCurrency(day.revenue)}`}
                                            />
                                            <div 
                                                className="bg-red-500/60 rounded-l-full transition-all"
                                                style={{ width: `${expenseWidth}%` }}
                                                title={`مصروفات: ${formatCurrency(day.expenses)}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center gap-6 mt-4 text-xs">
                            <span className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                                إيرادات
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                مصروفات
                            </span>
                        </div>
                    </GlassCardContent>
                </GlassCard>
                
                {/* Outflow Breakdown */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>توزيع المصروفات</span>
                            <PieChart className="w-5 h-5 text-red-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-3">
                            {data.outflowByCategory.map((cat, i) => {
                                const colors = [
                                    'from-red-500 to-orange-500',
                                    'from-purple-500 to-pink-500',
                                    'from-blue-500 to-cyan-500',
                                    'from-green-500 to-emerald-500',
                                    'from-yellow-500 to-amber-500',
                                    'from-gray-500 to-slate-500'
                                ];
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                                            <span className="font-medium">{cat.category}</span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-3">
                                            <div 
                                                className={`bg-gradient-to-l ${colors[i % colors.length]} h-3 rounded-full transition-all duration-500`}
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-left text-red-500 font-mono">
                                            {formatCurrency(cat.amount)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>
            
            {/* Bottom Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                
                {/* Top Vendors */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>أكبر الموردين</span>
                            <Building2 className="w-5 h-5 text-purple-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow className="border-b-white/10">
                                    <TableHead className="text-right">المورد</TableHead>
                                    <TableHead className="text-center">المعاملات</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topVendors.map((v, i) => (
                                    <TableRow key={i} className="border-b-white/5 hover:bg-white/5">
                                        <TableCell className="font-medium">
                                            {i === 0 && '🥇 '}
                                            {i === 1 && '🥈 '}
                                            {i === 2 && '🥉 '}
                                            {v.vendor}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{v.count}</Badge>
                                        </TableCell>
                                        <TableCell className="text-left text-red-500 font-mono">
                                            {formatCurrency(v.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </GlassCardContent>
                </GlassCard>
                
                {/* Cash vs Card */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>طرق الدفع</span>
                            <CreditCard className="w-5 h-5 text-blue-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                <Banknote className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <div className="text-sm text-muted-foreground">نقد</div>
                                <div className="text-2xl font-bold text-green-500">
                                    {formatCurrency(data.cashVsCard.cash)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {data.kpis.revenue > 0 ? ((data.cashVsCard.cash / data.kpis.revenue) * 100).toFixed(0) : 0}%
                                </div>
                            </div>
                            
                            <div className="flex-1 text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <CreditCard className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <div className="text-sm text-muted-foreground">بطاقة</div>
                                <div className="text-2xl font-bold text-blue-500">
                                    {formatCurrency(data.cashVsCard.card)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {data.kpis.revenue > 0 ? ((data.cashVsCard.card / data.kpis.revenue) * 100).toFixed(0) : 0}%
                                </div>
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>
            
            {/* Alerts Panel */}
            {warningAlerts.length > 0 && (
                <GlassCard className="border-yellow-500/20">
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2 text-yellow-600">
                            <span>تنبيهات ({warningAlerts.length})</span>
                            <AlertCircle className="w-5 h-5" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-2">
                            {warningAlerts.map((alert, i) => (
                                <div key={i} className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-sm">
                                    {alert.message}
                                </div>
                            ))}
                        </div>
                    </GlassCardContent>
                </GlassCard>
            )}
            
            {/* Quick Links */}
            <div className="grid gap-4 md:grid-cols-4">
                <Link href="/dashboard/outflow">
                    <GlassCard className="hover:border-red-500/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                            <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                                <span className="font-medium">تفاصيل المصروفات</span>
                                <Wallet className="w-5 h-5 text-red-500" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>
                
                <Link href="/dashboard/payroll">
                    <GlassCard className="hover:border-purple-500/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                            <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                                <span className="font-medium">الرواتب</span>
                                <Users className="w-5 h-5 text-purple-500" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>
                
                <Link href="/dashboard/waste">
                    <GlassCard className="hover:border-orange-500/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                            <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                                <span className="font-medium">الهدر</span>
                                <Activity className="w-5 h-5 text-orange-500" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>
                
                <Link href="/ai-insights">
                    <GlassCard className="hover:border-emerald-500/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                            <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                                <span className="font-medium">الذكاء الاصطناعي</span>
                                <Target className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>
            </div>
            
            {/* Data Source */}
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span>📦 {formatNumber(data.dataSource.orders)} طلب</span>
                <span>🧾 {formatNumber(data.dataSource.receipts)} إيصال</span>
                <span>💸 {formatNumber(data.dataSource.expenses)} مصروف</span>
                <span>👥 {formatNumber(data.dataSource.staff)} موظف</span>
            </div>
        </div>
    );
}
