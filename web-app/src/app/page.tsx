
import { getSalesStats, getTopProducts, getExpensesStats, getInventory, getRecentTransactions, getShiftStats, getDailyPerformance } from "@/lib/db";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { DailyPerformanceTable } from "@/components/dashboard/daily-performance-table";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { DollarSign, CreditCard, Activity, Users, AlertTriangle, Lock, Unlock, AlertCircle, TrendingUp, TrendingDown, Package, ShoppingBag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function DashboardPage() {
    const salesData = await getSalesStats();
    const expensesData = await getExpensesStats();
    const topProducts = await getTopProducts();
    const inventory = await getInventory();
    const recentTransactions = await getRecentTransactions();
    const shiftStats = await getShiftStats();
    const dailyPerformance = await getDailyPerformance();

    const totalRevenue = salesData.totalSales;
    const totalExpenses = expensesData.totalExpenses;
    const netProfit = totalRevenue - totalExpenses;
    const isProfit = netProfit >= 0;

    // Real-time comparison stats
    const salesChangePercent = salesData.salesChangePercent;
    const expensesChangePercent = expensesData.expensesChangePercent;
    const isSalesUp = salesChangePercent >= 0;
    const isExpensesDown = expensesChangePercent <= 0;

    const lowStockItems = inventory.filter(item => {
        const stock = item.currentStock;
        const min = item.minStock;
        return stock <= min;
    }).slice(0, 4);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div>
                    {/* Placeholder for future date picker or actions */}
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                        لوحة التحكم
                    </h2>
                    <p className="text-muted-foreground mt-1">نظرة عامة على أداء المقهى اليوم</p>
                </div>
            </div>

            {/* Alerts Section */}
            {shiftStats.discrepancyShifts.length > 0 && (
                <Alert variant="destructive" className="mb-4 border-red-500/50 bg-red-500/10 backdrop-blur-sm" dir="rtl">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-bold text-lg mr-2">تنبيه: عجز مالي مكتشف</AlertTitle>
                    <AlertDescription className="mr-2 text-base">
                        تم اكتشاف عجز في الصندوق. يرجى المراجعة الفورية.
                    </AlertDescription>
                </Alert>
            )}

            {/* Shift Status Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard variant={shiftStats.currentShift ? "neon" : "default"} className="flex flex-row items-center justify-between p-6">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground mb-1">حالة الوردية</span>
                        <span className={`text-2xl font-bold ${shiftStats.currentShift ? "text-blue-500" : "text-gray-500"}`}>
                            {shiftStats.currentShift ? "مفتوحة" : "مغلقة"}
                        </span>
                        {shiftStats.currentShift && (
                            <span className="text-xs text-muted-foreground mt-1">
                                بواسطة {shiftStats.currentShift.openedBy}
                            </span>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${shiftStats.currentShift ? "bg-blue-500/20" : "bg-gray-200 dark:bg-gray-800"}`}>
                        {shiftStats.currentShift ? <Unlock className="h-6 w-6 text-blue-500" /> : <Lock className="h-6 w-6 text-gray-500" />}
                    </div>
                </GlassCard>

                <GlassCard className="flex flex-row items-center justify-between p-6">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground mb-1">آخر إغلاق</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${shiftStats.lastClosedShift?.discrepancy && shiftStats.lastClosedShift.discrepancy !== 0 ? "text-red-500" : "text-emerald-500"}`}>
                                {shiftStats.lastClosedShift?.discrepancy ? `${shiftStats.lastClosedShift.discrepancy} عجز` : "متطابق"}
                            </span>
                        </div>
                        {shiftStats.lastClosedShift && (
                            <span className="text-xs text-muted-foreground mt-1">
                                الوردية {shiftStats.lastClosedShift.shiftNumber}
                            </span>
                        )}
                    </div>
                    <div className="p-3 rounded-full bg-emerald-500/10">
                        <Activity className="h-6 w-6 text-emerald-500" />
                    </div>
                </GlassCard>
            </div>

            {/* Hero KPI Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="relative overflow-hidden group">
                    {/* Mini Sparkline Background (CSS Illustration) */}
                    <div className="absolute -bottom-6 -left-6 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">إجمالي الدخل</span>
                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                            {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(totalRevenue)}
                        </span>
                        <div className={`flex items-center mt-2 text-xs px-2 py-1 rounded-full ${isSalesUp ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                            {isSalesUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            <span>{isSalesUp ? '+' : ''}{salesChangePercent.toFixed(1)}% من الأمس</span>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">المصروفات</span>
                        <span className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                            {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(totalExpenses)}
                        </span>
                        <div className={`flex items-center mt-2 text-xs px-2 py-1 rounded-full ${isExpensesDown ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                            {isExpensesDown ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                            <span>{expensesChangePercent >= 0 ? '+' : ''}{expensesChangePercent.toFixed(1)}% {isExpensesDown ? 'تحسن' : 'زيادة'}</span>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard variant={isProfit ? "default" : "destruction"} className={isProfit ? "bg-emerald-500/5 border-emerald-500/20" : ""}>
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">صافي الربح</span>
                        <div className="flex flex-row-reverse items-center gap-2 mt-2">
                            <span className={`text-3xl font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(netProfit)}
                            </span>
                            {!isProfit && <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />}
                        </div>

                        <div className={`flex items-center mt-2 text-xs px-3 py-1.5 rounded-full border ${isProfit ? 'text-emerald-600 bg-emerald-100/50 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/30' : 'text-red-600 bg-red-100/50 border-red-200 dark:bg-red-500/20 dark:border-red-500/30'}`}>
                            {isProfit ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                            <span className="font-bold mx-1">{isProfit ? "أداء مالي ممتاز" : "تنبيه: خسارة مالية"}</span>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-muted-foreground">الأكثر مبيعاً</span>
                        <span className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-2 truncate w-full text-right">
                            {topProducts[0]?.name || "N/A"}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="border-blue-500/30 text-blue-600">
                                {topProducts[0]?.count || 0} طلب
                            </Badge>
                            <Users className="w-4 h-4 text-blue-400" />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

                {/* Chart Section */}
                <SalesChart 
                    data={salesData.chartData} 
                    avgDailySales={salesData.avgDailySales}
                    todaySales={salesData.todaySales}
                    yesterdaySales={salesData.yesterdaySales}
                    salesChangePercent={salesData.salesChangePercent}
                />

                {/* Recent Transactions List */}
                <GlassCard className="col-span-3">
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2">
                            <span>أحدث العمليات</span>
                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                        <div className="relative overflow-x-auto">
                            <Table dir="rtl">
                                <TableHeader>
                                    <TableRow className="border-b-white/10 hover:bg-transparent">
                                        <TableHead className="text-right font-bold text-muted-foreground">الوقت</TableHead>
                                        <TableHead className="text-right font-bold text-muted-foreground">الطلب</TableHead>
                                        <TableHead className="text-left font-bold text-muted-foreground">السعر</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTransactions.map((t) => (
                                        <TableRow key={t.id} className="border-b-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {new Date(t.date).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {t.itemName}
                                            </TableCell>
                                            <TableCell className="text-left font-bold text-emerald-500">
                                                {new Intl.NumberFormat('ar-IQ', { style: 'decimal', maximumFractionDigits: 0 }).format(t.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>

            {/* Daily Performance Table */}
            <DailyPerformanceTable data={dailyPerformance} />

            {/* Low Stock Indicators */}
            {lowStockItems.length > 0 && (
                <div className="pt-4">
                    <h3 className="text-lg font-bold text-right mb-4 flex items-center justify-end text-muted-foreground">
                        نقص في المخزون
                        <Package className="ml-2 w-5 h-5" />
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {lowStockItems.map(item => (
                            <GlassCard key={item.id} variant="destruction" className="flex flex-row items-center justify-between p-4 h-24">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <AlertTriangle className="h-6 w-6 text-red-500" />
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-red-400">{item.name}</div>
                                    <div className="text-sm text-red-300/70">
                                        {item.currentStock} {item.unit}
                                        <span className="mx-1 text-xs opacity-50">/ الحد {item.minStock}</span>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
