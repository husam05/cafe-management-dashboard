'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Users,
    DollarSign,
    RefreshCw,
    Briefcase,
    UserCheck,
    ChefHat,
    Calculator,
    AlertTriangle,
    TrendingUp,
    Crown
} from 'lucide-react';

interface StaffMember {
    id: number;
    name: string;
    role: string;
    salary: number;
}

interface PayrollData {
    total: number;
    staffCount: number;
    byRole: { role: string; count: number; totalSalary: number }[];
    staffList: StaffMember[];
    salaryRatio: number | null;
}

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(num);
}

function getRoleIcon(role: string) {
    switch (role.toLowerCase()) {
        case 'admin': return <Crown className="w-4 h-4 text-yellow-500" />;
        case 'cashier': return <Calculator className="w-4 h-4 text-blue-500" />;
        case 'kitchen': return <ChefHat className="w-4 h-4 text-orange-500" />;
        case 'waiter': return <UserCheck className="w-4 h-4 text-green-500" />;
        default: return <Briefcase className="w-4 h-4 text-gray-500" />;
    }
}

function getRoleName(role: string): string {
    const names: Record<string, string> = {
        'admin': 'مدير',
        'cashier': 'كاشير',
        'waiter': 'نادل',
        'kitchen': 'مطبخ'
    };
    return names[role.toLowerCase()] || role;
}

function getRoleColor(role: string): string {
    const colors: Record<string, string> = {
        'admin': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
        'cashier': 'bg-blue-500/20 text-blue-600 border-blue-500/30',
        'waiter': 'bg-green-500/20 text-green-600 border-green-500/30',
        'kitchen': 'bg-orange-500/20 text-orange-600 border-orange-500/30'
    };
    return colors[role.toLowerCase()] || 'bg-gray-500/20 text-gray-600 border-gray-500/30';
}

export default function PayrollPage() {
    const [data, setData] = useState<PayrollData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchPayroll = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/kpis?period=month');
            if (!response.ok) throw new Error('Failed to fetch');
            const result = await response.json();
            
            setData({
                total: result.payroll,
                staffCount: result.staff.total,
                byRole: result.staff.byRole,
                staffList: [],
                salaryRatio: result.ratios.salaryRatio ? parseFloat(result.ratios.salaryRatio) : null
            });
        } catch (err) {
            setError('فشل في تحميل البيانات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchPayroll();
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
                        <Button onClick={fetchPayroll} className="mt-4 bg-red-500 hover:bg-red-600">
                            <RefreshCw className="w-4 h-4 ml-2" />
                            إعادة المحاولة
                        </Button>
                    </div>
                </GlassCard>
            </div>
        );
    }
    
    const avgSalary = data.staffCount > 0 ? data.total / data.staffCount : 0;
    const isHealthyRatio = data.salaryRatio !== null && data.salaryRatio < 35;
    
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen" dir="rtl">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <Button variant="outline" onClick={fetchPayroll} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20">
                    <RefreshCw className="w-4 h-4 ml-2" />
                    تحديث
                </Button>
                
                <div className="text-right">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-3 justify-end">
                        <Users className="w-10 h-10 text-purple-500" />
                        الرواتب والموظفين
                    </h2>
                    <p className="text-muted-foreground mt-1">إدارة ومتابعة رواتب الموظفين</p>
                </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                
                {/* Total Payroll */}
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute -bottom-6 -left-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">إجمالي الرواتب</span>
                        <span className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                            {formatCurrency(data.total)}
                        </span>
                        <div className="flex items-center mt-2 text-xs px-2 py-1 rounded-full text-purple-500 bg-purple-500/10">
                            <Users className="w-3 h-3 mr-1" />
                            <span>شهري</span>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Staff Count */}
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-blue-500/20">
                            <Users className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">عدد الموظفين</span>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {data.staffCount}
                            </p>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Average Salary */}
                <GlassCard>
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-full bg-green-500/20">
                            <Calculator className="h-6 w-6 text-green-500" />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">متوسط الراتب</span>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(avgSalary)}
                            </p>
                        </div>
                    </div>
                </GlassCard>
                
                {/* Salary Ratio */}
                <GlassCard className={isHealthyRatio ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}>
                    <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-full ${isHealthyRatio ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            <TrendingUp className={`h-6 w-6 ${isHealthyRatio ? 'text-emerald-500' : 'text-red-500'}`} />
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground">نسبة الرواتب</span>
                            <p className={`text-2xl font-bold ${isHealthyRatio ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {data.salaryRatio?.toFixed(1) || '0'}%
                            </p>
                            <span className="text-xs text-muted-foreground">
                                {isHealthyRatio ? 'صحي' : 'مرتفع'}
                            </span>
                        </div>
                    </div>
                </GlassCard>
            </div>
            
            {/* Staff by Role */}
            <GlassCard>
                <GlassCardHeader>
                    <GlassCardTitle className="flex items-center justify-end gap-2">
                        <span>الموظفين حسب الوظيفة</span>
                        <Briefcase className="w-5 h-5 text-purple-500" />
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {data.byRole.map((role, i) => (
                            <div 
                                key={i} 
                                className={`rounded-xl p-5 border ${getRoleColor(role.role)}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="outline" className={getRoleColor(role.role)}>
                                        {role.count} موظف
                                    </Badge>
                                    {getRoleIcon(role.role)}
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold mb-1">{getRoleName(role.role)}</div>
                                    <div className="text-2xl font-bold">{formatCurrency(role.totalSalary)}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        متوسط: {formatCurrency(role.count > 0 ? role.totalSalary / role.count : 0)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCardContent>
            </GlassCard>
            
            {/* Salary Distribution Chart Placeholder */}
            <GlassCard>
                <GlassCardHeader>
                    <GlassCardTitle className="flex items-center justify-end gap-2">
                        <span>توزيع الرواتب</span>
                        <Calculator className="w-5 h-5 text-purple-500" />
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="space-y-4">
                        {data.byRole.map((role, i) => {
                            const percentage = data.total > 0 ? (role.totalSalary / data.total * 100) : 0;
                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-purple-500 font-mono font-bold">
                                            {formatCurrency(role.totalSalary)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {getRoleIcon(role.role)}
                                            <span className="font-medium">{getRoleName(role.role)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-3">
                                        <div 
                                            className="bg-gradient-to-l from-purple-600 to-pink-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{percentage.toFixed(1)}%</span>
                                        <span>{role.count} موظف</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCardContent>
            </GlassCard>
            
            {/* Tips */}
            <GlassCard className="bg-purple-500/5 border-purple-500/20">
                <div className="flex items-start gap-4" dir="rtl">
                    <div className="p-3 rounded-full bg-purple-500/20">
                        <Users className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-purple-600 dark:text-purple-400">نصائح لإدارة الرواتب</h3>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            <li>• حافظ على نسبة الرواتب أقل من 35% من الإيرادات</li>
                            <li>• راجع الأداء بشكل دوري قبل منح الزيادات</li>
                            <li>• استخدم نظام الحوافز لتحفيز الموظفين</li>
                            <li>• وثّق جميع السلف والخصومات</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
