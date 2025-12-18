'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Wallet,
    Receipt,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    PieChart,
    Calendar,
    DollarSign,
    ShoppingBag,
    Wrench,
    Truck,
    AlertTriangle
} from 'lucide-react';

interface ExpenseData {
    id: number;
    date: string;
    category: string;
    amount: number;
    description: string;
}

interface ExpenseSummary {
    total: number;
    byCategory: { category: string; amount: number; percentage: number }[];
    recentExpenses: ExpenseData[];
    dailyAverage: number;
    monthlyTotal: number;
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(num);
}

function getCategoryIcon(category: string) {
    if (category.includes('مستلزمات') || category.includes('supplies')) return <ShoppingBag className="w-4 h-4" />;
    if (category.includes('صيانة') || category.includes('maintenance')) return <Wrench className="w-4 h-4" />;
    if (category.includes('توصيل') || category.includes('delivery')) return <Truck className="w-4 h-4" />;
    return <Receipt className="w-4 h-4" />;
}

export default function ExpensesPage() {
    const [data, setData] = useState<ExpenseSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchExpenses = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/kpis?period=month');
            if (!response.ok) throw new Error('Failed to fetch');
            const result = await response.json();
            
            setData({
                total: result.expenses,
                byCategory: result.expensesByCategory.map((c: { category: string; amount: number }) => ({
                    ...c,
                    percentage: result.expenses > 0 ? (c.amount / result.expenses * 100) : 0
                })),
                recentExpenses: [],
                dailyAverage: result.burnRate,
                monthlyTotal: result.expenses
            });
        } catch (err) {
            setError('فشل في تحميل البيانات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchExpenses();
    }, []);
    
    if (loading) {
        return (
            <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
                <Skeleton className="h-10 w-48 bg-white/20" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-32 bg-white/20 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 bg-white/20 rounded-xl" />
            </div>
        );
    }
    
    if (error || !data) {
        return (
            <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
                <GlassCard variant="destruction" className="max-w-md mx-auto">
                    <div className="text-center py-8">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400">{error}</p>
                        <Button onClick={fetchExpenses} className="mt-4 bg-red-500 hover:bg-red-600">
                            <RefreshCw className="w-4 h-4 ml-2" />
                            إعادة المحاولة
                        </Button>
                    </div>
                </GlassCard>
            </div>
        );
    }
    
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <Button variant="outline" onClick={fetchExpenses} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20">
                    <RefreshCw className="w-4 h-4 ml-2" />
                    تحديث
                </Button>
                
                <div className="text-right">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-red-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-3 justify-end">
                        <Wallet className="w-10 h-10 text-red-500" />
                        المصروفات
                    </h2>
                    <p className="text-muted-foreground mt-1">تتبع وتحليل جميع المصروفات</p>
                </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                
                {/* Total Expenses */}
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute -bottom-6 -left-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">إجمالي المصروفات</span>
                        <span className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                            {formatCurrency(data.total)}
                        </span>
                        <div className="flex items-center mt-2 text-xs px-2 py-1 rounded-full text-red-500 bg-red-500/10">
                            <Receipt className="w-3 h-3 mr-1" />
                            <span>هذا الشهر</span>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Daily Average */}
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-orange-500/20">
                            <Calendar className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">المتوسط اليومي</span>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {formatCurrency(data.dailyAverage)}
                            </p>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Categories Count */}
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-purple-500/20">
                            <PieChart className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">الفئات</span>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {data.byCategory.length}
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {/* Expenses by Category */}
            <GlassCard>
                <GlassCardHeader>
                    <GlassCardTitle className="flex items-center justify-end gap-2">
                        <span>المصروفات حسب الفئة</span>
                        <PieChart className="w-5 h-5 text-red-500" />
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="space-y-4">
                        {data.byCategory.map((cat, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-red-500 font-mono font-bold">
                                        {formatCurrency(cat.amount)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {getCategoryIcon(cat.category)}
                                        <span className="font-medium">{cat.category}</span>
                                    </div>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2.5">
                                    <div 
                                        className="bg-gradient-to-l from-red-600 to-orange-500 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${cat.percentage}%` }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground text-left">
                                    {cat.percentage.toFixed(1)}% من الإجمالي
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCardContent>
            </GlassCard>
            
            {/* Tips */}
            <GlassCard className="bg-blue-500/5 border-blue-500/20">
                <div className="flex items-start gap-4" dir="rtl">
                    <div className="p-3 rounded-full bg-blue-500/20">
                        <TrendingDown className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-600 dark:text-blue-400">نصائح لتقليل المصروفات</h3>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            <li>• قارن أسعار الموردين بشكل دوري</li>
                            <li>• راقب الهدر في المواد الأولية</li>
                            <li>• استخدم نظام المخزون لتجنب الشراء الزائد</li>
                            <li>• تفاوض على أسعار أفضل للكميات الكبيرة</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
