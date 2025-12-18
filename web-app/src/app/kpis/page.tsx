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
    Users, 
    ShoppingCart, 
    AlertTriangle,
    Clock,
    Target,
    Wallet,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    Calendar,
    AlertCircle,
    Activity,
    CreditCard,
    BarChart3,
    PieChart
} from 'lucide-react';

interface KPIData {
    range: { from: string; to: string; period: string };
    revenue: number;
    expenses: number;
    payroll: number;
    netProfit: number;
    ratios: {
        expenseRatio: string | null;
        salaryRatio: string | null;
        profitMargin: string | null;
    };
    orders: { count: number; avgTicket: number };
    comparison: {
        todayRevenue: number;
        yesterdayRevenue: number;
        changePercent: string;
        trend: 'up' | 'down';
    };
    burnRate: number;
    expensesByCategory: { category: string; amount: number }[];
    topTables: { table: string; count: number; total: number }[];
    hourlyDistribution: { hour: string; amount: number }[];
    dailyBreakdown: { date: string; revenue: number; expenses: number; orders: number }[];
    staff: {
        total: number;
        totalSalaries: number;
        byRole: { role: string; count: number; totalSalary: number }[];
    };
    alerts: { type: 'warning' | 'danger' | 'info'; message: string }[];
    dataSource: { orders: number; receipts: number; expenses: number; staff: number };
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(num);
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat('ar-SA').format(Math.round(num));
}

export default function KPIDashboardPage() {
    const [data, setData] = useState<KPIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [error, setError] = useState<string | null>(null);
    
    const fetchKPIs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/kpis?period=${period}`);
            if (!response.ok) throw new Error('Failed to fetch KPIs');
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
        fetchKPIs();
    }, [period]);
    
    const roleNames: Record<string, string> = {
        'admin': 'مدير',
        'cashier': 'كاشير',
        'waiter': 'نادل',
        'kitchen': 'مطبخ'
    };
    
    if (loading) {
        return (
            <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48 bg-white/20" />
                    <Skeleton className="h-10 w-32 bg-white/20" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <Skeleton key={i} className="h-36 bg-white/20 rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-64 bg-white/20 rounded-xl" />
                    <Skeleton className="h-64 bg-white/20 rounded-xl" />
                </div>
            </div>
        );
    }
    
    if (error || !data) {
        return (
            <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
                <GlassCard variant="destruction" className="max-w-md mx-auto">
                    <div className="text-center py-8">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
                        <p className="text-red-400 text-lg mb-4">{error || 'خطأ غير متوقع'}</p>
                        <Button onClick={fetchKPIs} className="bg-red-500 hover:bg-red-600">
                            <RefreshCw className="w-4 h-4 ml-2" />
                            إعادة المحاولة
                        </Button>
                    </div>
                </GlassCard>
            </div>
        );
    }
    
    const isProfit = data.netProfit >= 0;
    const isTrendUp = data.comparison.trend === 'up';
    
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div className="flex gap-3">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-32 bg-white/10 backdrop-blur border-white/20">
                            <Calendar className="w-4 h-4 ml-2" />
                            <SelectValue placeholder="الفترة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">اليوم</SelectItem>
                            <SelectItem value="week">الأسبوع</SelectItem>
                            <SelectItem value="month">الشهر</SelectItem>
                            <SelectItem value="year">السنة</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button variant="outline" onClick={fetchKPIs} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="text-right">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-3 justify-end">
                        <Target className="w-10 h-10 text-emerald-500" />
                        مؤشرات الأداء
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {data.range.from} إلى {data.range.to}
                    </p>
                </div>
            </div>
            
            {/* Alerts */}
            {data.alerts.length > 0 && (
                <div className="space-y-2">
                    {data.alerts.map((alert, i) => (
                        <Alert 
                            key={i}
                            variant={alert.type === 'danger' ? 'destructive' : 'default'}
                            className={`backdrop-blur-sm ${
                                alert.type === 'danger' ? 'border-red-500/50 bg-red-500/10' :
                                alert.type === 'warning' ? 'border-yellow-500/50 bg-yellow-500/10' :
                                'border-blue-500/50 bg-blue-500/10'
                            }`}
                        >
                            <AlertCircle className="h-5 w-5" />
                            <AlertTitle className="font-bold mr-2">تنبيه</AlertTitle>
                            <AlertDescription className="mr-2">{alert.message}</AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}
            
            {/* Main KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                
                {/* Revenue Card */}
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute -bottom-6 -left-6 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</span>
                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                            {formatCurrency(data.revenue)}
                        </span>
                        <div className={`flex items-center mt-2 text-xs px-2 py-1 rounded-full ${isTrendUp ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                            {isTrendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            <span>{isTrendUp ? '+' : ''}{data.comparison.changePercent}% مقارنة بالأمس</span>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Expenses Card */}
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute -bottom-6 -left-6 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <CreditCard className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">المصروفات</span>
                        <span className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                            {formatCurrency(data.expenses)}
                        </span>
                        {data.ratios.expenseRatio && (
                            <div className="flex items-center mt-2 text-xs px-2 py-1 rounded-full text-red-500 bg-red-500/10">
                                <Receipt className="w-3 h-3 mr-1" />
                                <span>{data.ratios.expenseRatio}% من الإيرادات</span>
                            </div>
                        )}
                    </div>
                </GlassCard>
                
                {/* Net Profit Card */}
                <GlassCard 
                    variant={isProfit ? "default" : "destruction"} 
                    className={isProfit ? "bg-emerald-500/5 border-emerald-500/20" : ""}
                >
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">صافي الربح</span>
                        <div className="flex flex-row-reverse items-center gap-2 mt-2">
                            <span className={`text-3xl font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(data.netProfit)}
                            </span>
                            {!isProfit && <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />}
                        </div>
                        <div className={`flex items-center mt-2 text-xs px-3 py-1.5 rounded-full border ${isProfit ? 'text-emerald-600 bg-emerald-100/50 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/30' : 'text-red-600 bg-red-100/50 border-red-200 dark:bg-red-500/20 dark:border-red-500/30'}`}>
                            {isProfit ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                            <span className="font-bold mx-1">{isProfit ? "أداء ممتاز" : "خسارة"}</span>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Orders Card */}
                <GlassCard className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">عدد الطلبات</span>
                        <span className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-2">
                            {formatNumber(data.orders.count)}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400">
                                متوسط: {formatCurrency(data.orders.avgTicket)}
                            </Badge>
                            <ShoppingCart className="w-4 h-4 text-blue-400" />
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {/* Secondary Stats Row */}
            <div className="grid gap-4 md:grid-cols-3">
                
                {/* Payroll Card */}
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-purple-500/20">
                            <Users className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">الرواتب</span>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(data.payroll)}
                            </p>
                            {data.ratios.salaryRatio && (
                                <span className="text-xs text-muted-foreground">
                                    {data.ratios.salaryRatio}% من الإيرادات
                                </span>
                            )}
                        </div>
                    </div>
                </GlassCard>
                
                {/* Burn Rate Card */}
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-orange-500/20">
                            <Activity className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">معدل الاستهلاك اليومي</span>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {formatCurrency(data.burnRate)}
                            </p>
                            <span className="text-xs text-muted-foreground">متوسط آخر 7 أيام</span>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Profit Margin Card */}
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-full ${isProfit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            <BarChart3 className={`h-6 w-6 ${isProfit ? 'text-emerald-500' : 'text-red-500'}`} />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">هامش الربح</span>
                            <p className={`text-2xl font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {data.ratios.profitMargin || '0'}%
                            </p>
                            <span className="text-xs text-muted-foreground">
                                {isProfit ? 'جيد' : 'يحتاج تحسين'}
                            </span>
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {/* Tables Section */}
            <div className="grid gap-6 md:grid-cols-2">
                
                {/* Top Tables */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>أفضل الطاولات</span>
                            <PieChart className="w-5 h-5 text-blue-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow className="border-b-white/10">
                                    <TableHead className="text-right">الطاولة</TableHead>
                                    <TableHead className="text-center">الطلبات</TableHead>
                                    <TableHead className="text-left">الإجمالي</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topTables.slice(0, 5).map((table, i) => (
                                    <TableRow key={i} className="border-b-white/5 hover:bg-white/5">
                                        <TableCell className="font-medium">
                                            {i === 0 && '🥇 '}
                                            {i === 1 && '🥈 '}
                                            {i === 2 && '🥉 '}
                                            {table.table === 'takeaway' ? 'سفري' : `طاولة ${table.table}`}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{table.count}</Badge>
                                        </TableCell>
                                        <TableCell className="text-left text-emerald-500 font-mono">
                                            {formatCurrency(table.total)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </GlassCardContent>
                </GlassCard>
                
                {/* Expenses by Category */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>المصروفات حسب الفئة</span>
                            <Wallet className="w-5 h-5 text-red-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow className="border-b-white/10">
                                    <TableHead className="text-right">الفئة</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.expensesByCategory.slice(0, 5).map((cat, i) => (
                                    <TableRow key={i} className="border-b-white/5 hover:bg-white/5">
                                        <TableCell className="font-medium">{cat.category}</TableCell>
                                        <TableCell className="text-left text-red-500 font-mono">
                                            {formatCurrency(cat.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </GlassCardContent>
                </GlassCard>
            </div>
            
            {/* Staff Section */}
            <GlassCard>
                <GlassCardHeader>
                    <GlassCardTitle className="flex items-center justify-end gap-2">
                        <span>الموظفين ({data.staff.total})</span>
                        <Users className="w-5 h-5 text-purple-500" />
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        {data.staff.byRole.map((role, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-4 text-right">
                                <div className="text-sm text-muted-foreground mb-1">
                                    {roleNames[role.role] || role.role}
                                </div>
                                <div className="text-2xl font-bold text-purple-500">{role.count}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {formatCurrency(role.totalSalary)}
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCardContent>
            </GlassCard>
            
            {/* Data Source Info */}
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span>📦 {formatNumber(data.dataSource.orders)} طلب</span>
                <span>🧾 {formatNumber(data.dataSource.receipts)} إيصال</span>
                <span>💸 {formatNumber(data.dataSource.expenses)} مصروف</span>
                <span>👥 {formatNumber(data.dataSource.staff)} موظف</span>
            </div>
        </div>
    );
}
