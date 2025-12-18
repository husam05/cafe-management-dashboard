'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
    Wallet, 
    TrendingDown, 
    RefreshCw,
    Calendar,
    Search,
    Building2,
    User,
    FileText,
    Package,
    Zap,
    Wrench,
    Coffee,
    Fuel,
    Printer,
    ArrowLeft,
    AlertTriangle,
    Filter
} from 'lucide-react';
import Link from 'next/link';

interface OutflowData {
    period: { from: string; to: string };
    kpis: {
        totalOutflow: number;
        expenseRatio: number;
    };
    byCategory: { category: string; amount: number; count: number; percentage: number }[];
    bySubcategory: { subcategory: string; amount: number; count: number }[];
    byVendor: { vendor: string; amount: number; count: number }[];
    byPaidBy: { paidBy: string; amount: number; count: number }[];
    transactions: {
        date: string;
        description: string;
        category: string;
        subcategory: string;
        amount: number;
        paidBy: string;
        vendor?: string;
    }[];
    alerts: { type: string; message: string }[];
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(num);
}

function getCategoryIcon(category: string) {
    const icons: Record<string, React.ReactNode> = {
        'Supplies': <Package className="w-4 h-4" />,
        'Utilities': <Zap className="w-4 h-4" />,
        'Maintenance': <Wrench className="w-4 h-4" />,
        'Coffee & Beverages': <Coffee className="w-4 h-4" />,
        'Gas': <Fuel className="w-4 h-4" />,
        'Printing': <Printer className="w-4 h-4" />,
        'Other': <FileText className="w-4 h-4" />,
    };
    return icons[category] || <FileText className="w-4 h-4" />;
}

function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
        'Supplies': 'text-blue-500 bg-blue-500/20',
        'Utilities': 'text-yellow-500 bg-yellow-500/20',
        'Maintenance': 'text-orange-500 bg-orange-500/20',
        'Coffee & Beverages': 'text-amber-700 bg-amber-500/20',
        'Gas': 'text-red-500 bg-red-500/20',
        'Printing': 'text-purple-500 bg-purple-500/20',
        'Payroll': 'text-indigo-500 bg-indigo-500/20',
        'Other': 'text-gray-500 bg-gray-500/20',
    };
    return colors[category] || 'text-gray-500 bg-gray-500/20';
}

export default function OutflowPage() {
    const [data, setData] = useState<OutflowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [error, setError] = useState<string | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/analytics?period=${period}&view=outflow`);
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
                <Skeleton className="h-96 bg-white/20 rounded-xl" />
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
    
    const filteredTransactions = data.transactions.filter(t => {
        const matchesSearch = searchTerm === '' || 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.paidBy.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
        return matchesSearch && matchesCategory;
    });
    
    const categories = [...new Set(data.transactions.map(t => t.category))];
    
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
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-red-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-3 justify-end">
                        <Wallet className="w-10 h-10 text-red-500" />
                        تفاصيل المصروفات
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {data.period.from} → {data.period.to}
                    </p>
                </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <GlassCard className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-red-500/20">
                            <TrendingDown className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">إجمالي المصروفات</span>
                            <p className="text-3xl font-bold text-red-500">{formatCurrency(data.kpis.totalOutflow)}</p>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-orange-500/20">
                            <Building2 className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">عدد الموردين</span>
                            <p className="text-3xl font-bold text-orange-500">{data.byVendor.length}</p>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-purple-500/20">
                            <User className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">المسؤولين عن الصرف</span>
                            <p className="text-3xl font-bold text-purple-500">{data.byPaidBy.length}</p>
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                
                {/* By Category */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>حسب الفئة</span>
                            <Package className="w-5 h-5 text-blue-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-3">
                            {data.byCategory.map((cat, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}% ({cat.count})</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{cat.category}</span>
                                            <div className={`p-1.5 rounded-full ${getCategoryColor(cat.category)}`}>
                                                {getCategoryIcon(cat.category)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2.5">
                                        <div 
                                            className="bg-gradient-to-l from-red-500 to-orange-500 h-2.5 rounded-full transition-all"
                                            style={{ width: `${cat.percentage}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-left text-red-500 font-mono">
                                        {formatCurrency(cat.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCardContent>
                </GlassCard>
                
                {/* By Vendor */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>أكبر الموردين</span>
                            <Building2 className="w-5 h-5 text-orange-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow className="border-b-white/10">
                                    <TableHead className="text-right">المورد</TableHead>
                                    <TableHead className="text-center">العمليات</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.byVendor.slice(0, 8).map((v, i) => (
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
                                        <TableCell className="text-left text-red-500 font-mono text-sm">
                                            {formatCurrency(v.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </GlassCardContent>
                </GlassCard>
                
                {/* By Paid By */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>المسؤول عن الصرف</span>
                            <User className="w-5 h-5 text-purple-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-3">
                            {data.byPaidBy.slice(0, 6).map((p, i) => {
                                const maxAmount = Math.max(...data.byPaidBy.map(x => x.amount));
                                const width = maxAmount > 0 ? (p.amount / maxAmount) * 100 : 0;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-muted-foreground">{p.count} عملية</span>
                                                <span className="font-medium flex items-center gap-1">
                                                    <User className="w-3 h-3 text-purple-500" />
                                                    {p.paidBy}
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div 
                                                    className="bg-gradient-to-l from-purple-500 to-pink-500 h-2 rounded-full"
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-red-500 font-mono text-sm w-32 text-left">
                                            {formatCurrency(p.amount)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCardContent>
                </GlassCard>
                
                {/* By Subcategory */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>الفئات الفرعية الأكبر</span>
                            <FileText className="w-5 h-5 text-cyan-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-2">
                            {data.bySubcategory.slice(0, 10).map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                    <span className="text-red-500 font-mono text-sm">{formatCurrency(s.amount)}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">{s.subcategory}</span>
                                        <Badge variant="outline" className="text-xs">{s.count}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>
            
            {/* Transactions Table */}
            <GlassCard>
                <GlassCardHeader>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input 
                                    placeholder="بحث..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pr-10 bg-white/5 border-white/10"
                                />
                            </div>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                                    <Filter className="w-4 h-4 ml-2" />
                                    <SelectValue placeholder="كل الفئات" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الفئات</SelectItem>
                                    {categories.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <GlassCardTitle className="flex items-center gap-2">
                            <span>جميع المعاملات ({filteredTransactions.length})</span>
                            <FileText className="w-5 h-5 text-gray-500" />
                        </GlassCardTitle>
                    </div>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="overflow-x-auto">
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow className="border-b-white/10">
                                    <TableHead className="text-right">التاريخ</TableHead>
                                    <TableHead className="text-right">الوصف</TableHead>
                                    <TableHead className="text-right">الفئة</TableHead>
                                    <TableHead className="text-right">المورد</TableHead>
                                    <TableHead className="text-right">المسؤول</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.slice(0, 50).map((t, i) => (
                                    <TableRow key={i} className="border-b-white/5 hover:bg-white/5">
                                        <TableCell className="text-xs text-muted-foreground">{t.date}</TableCell>
                                        <TableCell className="max-w-48 truncate" title={t.description}>{t.description}</TableCell>
                                        <TableCell>
                                            <Badge className={getCategoryColor(t.category)} variant="outline">
                                                {t.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{t.vendor || '-'}</TableCell>
                                        <TableCell className="text-sm">{t.paidBy}</TableCell>
                                        <TableCell className="text-left text-red-500 font-mono font-bold">
                                            {formatCurrency(t.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        
                        {filteredTransactions.length > 50 && (
                            <p className="text-center text-muted-foreground text-sm mt-4">
                                يتم عرض 50 من أصل {filteredTransactions.length} معاملة
                            </p>
                        )}
                    </div>
                </GlassCardContent>
            </GlassCard>
            
            {/* Alerts */}
            {data.alerts.length > 0 && (
                <GlassCard className="border-yellow-500/20">
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2 text-yellow-600">
                            <span>تنبيهات المصروفات</span>
                            <AlertTriangle className="w-5 h-5" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-2">
                            {data.alerts.map((alert, i) => (
                                <div key={i} className={`p-3 rounded-lg border text-sm ${
                                    alert.type === 'danger' 
                                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600'
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
