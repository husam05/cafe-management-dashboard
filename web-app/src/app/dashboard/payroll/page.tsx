'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Users, 
    DollarSign,
    RefreshCw,
    Calendar,
    User,
    Wallet,
    TrendingUp,
    AlertTriangle,
    ArrowLeft,
    CreditCard,
    Banknote,
    Clock,
    UserCheck,
    HandCoins,
    Calculator,
    PieChart
} from 'lucide-react';
import Link from 'next/link';

interface PayrollData {
    period: { from: string; to: string };
    kpis: {
        totalPayroll: number;
        payrollRatio: number;
        employeeCount: number;
        avgSalary: number;
    };
    byEmployee: { 
        employee: string; 
        amount: number; 
        count: number;
        type: 'salary' | 'advance' | 'bonus' | 'deduction';
    }[];
    byType: { type: string; amount: number; count: number; percentage: number }[];
    monthly: { month: string; amount: number }[];
    transactions: {
        date: string;
        description: string;
        employee: string;
        type: string;
        amount: number;
    }[];
    alerts: { type: string; message: string }[];
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(num);
}

function getTypeInfo(type: string) {
    const info: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        'salary': { label: 'راتب', color: 'text-purple-500 bg-purple-500/20 border-purple-500/30', icon: <Wallet className="w-4 h-4" /> },
        'advance': { label: 'سلفة', color: 'text-orange-500 bg-orange-500/20 border-orange-500/30', icon: <HandCoins className="w-4 h-4" /> },
        'bonus': { label: 'مكافأة', color: 'text-emerald-500 bg-emerald-500/20 border-emerald-500/30', icon: <TrendingUp className="w-4 h-4" /> },
        'deduction': { label: 'خصم', color: 'text-red-500 bg-red-500/20 border-red-500/30', icon: <Calculator className="w-4 h-4" /> },
    };
    return info[type] || { label: type, color: 'text-gray-500 bg-gray-500/20 border-gray-500/30', icon: <DollarSign className="w-4 h-4" /> };
}

export default function PayrollPage() {
    const [data, setData] = useState<PayrollData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [error, setError] = useState<string | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/analytics?period=${period}&view=payroll`);
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-white/20 rounded-xl" />)}
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
    
    // Group transactions by employee
    const employeeData = data.byEmployee.reduce((acc, curr) => {
        if (!acc[curr.employee]) {
            acc[curr.employee] = { salary: 0, advance: 0, bonus: 0, deduction: 0, total: 0 };
        }
        acc[curr.employee][curr.type] = (acc[curr.employee][curr.type] || 0) + curr.amount;
        acc[curr.employee].total += curr.amount;
        return acc;
    }, {} as Record<string, { salary: number; advance: number; bonus: number; deduction: number; total: number }>);
    
    const employeeSummary = Object.entries(employeeData)
        .map(([name, amounts]) => ({ name, ...amounts }))
        .sort((a, b) => b.total - a.total);
    
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
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-3 justify-end">
                        <Users className="w-10 h-10 text-purple-500" />
                        إدارة الرواتب
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {data.period.from} → {data.period.to}
                    </p>
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <GlassCard className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-purple-500/20">
                            <Wallet className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">إجمالي الرواتب</span>
                            <p className="text-3xl font-bold text-purple-500">{formatCurrency(data.kpis.totalPayroll)}</p>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-blue-500/20">
                            <UserCheck className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">عدد الموظفين</span>
                            <p className="text-3xl font-bold text-blue-500">{data.kpis.employeeCount}</p>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-emerald-500/20">
                            <DollarSign className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">متوسط الراتب</span>
                            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(data.kpis.avgSalary)}</p>
                        </div>
                    </div>
                </GlassCard>
                
                <GlassCard className={data.kpis.payrollRatio > 35 ? "border-yellow-500/50" : ""}>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-orange-500/20">
                            <PieChart className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground">نسبة من الإيرادات</span>
                            <p className={`text-3xl font-bold ${data.kpis.payrollRatio > 35 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                {data.kpis.payrollRatio.toFixed(1)}%
                            </p>
                            {data.kpis.payrollRatio > 35 && (
                                <span className="text-xs text-yellow-500">⚠️ مرتفع</span>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {/* Type Distribution */}
            <div className="grid gap-4 md:grid-cols-4">
                {data.byType.map((type, i) => {
                    const info = getTypeInfo(type.type);
                    return (
                        <GlassCard key={i} className={`border ${info.color.split(' ').find(c => c.includes('border'))}`}>
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className={info.color}>
                                    {info.icon}
                                    <span className="mr-1">{info.label}</span>
                                </Badge>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{formatCurrency(type.amount)}</p>
                                    <span className="text-xs text-muted-foreground">{type.count} عملية • {type.percentage.toFixed(0)}%</span>
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
            
            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                
                {/* By Employee */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>حسب الموظف</span>
                            <User className="w-5 h-5 text-purple-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-4">
                            {employeeSummary.slice(0, 8).map((emp, i) => {
                                const maxTotal = Math.max(...employeeSummary.map(e => e.total));
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-purple-500 font-mono font-bold">
                                                {formatCurrency(emp.total)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{emp.name}</span>
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {emp.name.charAt(0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-white/5">
                                            {emp.salary > 0 && (
                                                <div 
                                                    className="bg-purple-500 transition-all"
                                                    style={{ width: `${(emp.salary / maxTotal) * 100}%` }}
                                                    title={`راتب: ${formatCurrency(emp.salary)}`}
                                                />
                                            )}
                                            {emp.advance > 0 && (
                                                <div 
                                                    className="bg-orange-500 transition-all"
                                                    style={{ width: `${(emp.advance / maxTotal) * 100}%` }}
                                                    title={`سلفة: ${formatCurrency(emp.advance)}`}
                                                />
                                            )}
                                            {emp.bonus > 0 && (
                                                <div 
                                                    className="bg-emerald-500 transition-all"
                                                    style={{ width: `${(emp.bonus / maxTotal) * 100}%` }}
                                                    title={`مكافأة: ${formatCurrency(emp.bonus)}`}
                                                />
                                            )}
                                        </div>
                                        <div className="flex gap-2 text-xs flex-wrap">
                                            {emp.salary > 0 && (
                                                <Badge variant="outline" className="text-purple-500 border-purple-500/30">
                                                    راتب: {formatCurrency(emp.salary)}
                                                </Badge>
                                            )}
                                            {emp.advance > 0 && (
                                                <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                                                    سلفة: {formatCurrency(emp.advance)}
                                                </Badge>
                                            )}
                                            {emp.bonus > 0 && (
                                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                                                    مكافأة: {formatCurrency(emp.bonus)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="flex justify-center gap-4 mt-4 text-xs">
                            <span className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-purple-500" />
                                راتب
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                سلفة
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                مكافأة
                            </span>
                        </div>
                    </GlassCardContent>
                </GlassCard>
                
                {/* Monthly Trend */}
                <GlassCard>
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>الاتجاه الشهري</span>
                            <Clock className="w-5 h-5 text-blue-500" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="space-y-3">
                            {data.monthly.map((m, i) => {
                                const maxAmount = Math.max(...data.monthly.map(x => x.amount));
                                const width = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-purple-500 font-mono">{formatCurrency(m.amount)}</span>
                                            <span className="font-medium">{m.month}</span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-4">
                                            <div 
                                                className="bg-gradient-to-l from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>
            
            {/* Transactions Table */}
            <GlassCard>
                <GlassCardHeader>
                    <GlassCardTitle className="flex items-center justify-end gap-2">
                        <span>سجل المعاملات ({data.transactions.length})</span>
                        <Banknote className="w-5 h-5 text-gray-500" />
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="overflow-x-auto">
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow className="border-b-white/10">
                                    <TableHead className="text-right">التاريخ</TableHead>
                                    <TableHead className="text-right">الموظف</TableHead>
                                    <TableHead className="text-right">النوع</TableHead>
                                    <TableHead className="text-right">الوصف</TableHead>
                                    <TableHead className="text-left">المبلغ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.transactions.slice(0, 30).map((t, i) => {
                                    const typeInfo = getTypeInfo(t.type);
                                    return (
                                        <TableRow key={i} className="border-b-white/5 hover:bg-white/5">
                                            <TableCell className="text-xs text-muted-foreground">{t.date}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {t.employee.charAt(0)}
                                                    </div>
                                                    {t.employee}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={typeInfo.color} variant="outline">
                                                    {typeInfo.icon}
                                                    <span className="mr-1">{typeInfo.label}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-48 truncate text-sm text-muted-foreground" title={t.description}>
                                                {t.description}
                                            </TableCell>
                                            <TableCell className="text-left text-purple-500 font-mono font-bold">
                                                {formatCurrency(t.amount)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        
                        {data.transactions.length > 30 && (
                            <p className="text-center text-muted-foreground text-sm mt-4">
                                يتم عرض 30 من أصل {data.transactions.length} معاملة
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
                            <span>تنبيهات الرواتب</span>
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
