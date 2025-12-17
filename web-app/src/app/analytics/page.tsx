import { getSalesByCategory, getSalesByHour, getSalesStats, getTopProducts } from "@/lib/db";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { HourlyChart } from "@/components/dashboard/hourly-chart";
import { GlassCard } from "@/components/ui/glass-card";
import { TrendingUp, Clock, PieChart, Award, Zap, BarChart3 } from "lucide-react";

export default async function AnalyticsPage() {
    const categoryData = await getSalesByCategory();
    const hourlyData = await getSalesByHour();
    const salesStats = await getSalesStats();
    const topProducts = await getTopProducts();

    // Calculate insights
    const totalSales = salesStats.totalSales;
    const avgDailySales = salesStats.chartData.length > 0
        ? totalSales / salesStats.chartData.length
        : 0;
    const peakHour = hourlyData.reduce((max, curr) =>
        curr.value > max.value ? curr : max, hourlyData[0] || { name: '0', value: 0 });
    const topCategory = categoryData.reduce((max, curr) =>
        curr.value > max.value ? curr : max, categoryData[0] || { name: '', value: 0 });

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen">

            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-blue-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                        <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center justify-end gap-3">
                            <span>التحليلات المتقدمة</span>
                            <BarChart3 className="w-10 h-10 animate-pulse" />
                        </h1>
                        <p className="text-blue-100 text-lg">رؤى ذكية لأداء المقهى</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 border border-white/30">
                            <div className="text-white/80 text-xs">إجمالي المبيعات</div>
                            <div className="text-white text-xl font-bold">
                                {new Intl.NumberFormat('ar-IQ', { notation: 'compact', maximumFractionDigits: 1 }).format(totalSales)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Insights Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-emerald-500/10 rounded-full mb-3 group-hover:bg-emerald-500/20 transition-colors">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">متوسط المبيعات اليومية</span>
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            {new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0 }).format(avgDailySales)}
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-blue-500/10 rounded-full mb-3 group-hover:bg-blue-500/20 transition-colors">
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">ساعة الذروة</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {peakHour.name}
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-purple-500/10 rounded-full mb-3 group-hover:bg-purple-500/20 transition-colors">
                            <PieChart className="w-6 h-6 text-purple-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">الفئة الأكثر مبيعاً</span>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1 truncate w-full text-right">
                            {topCategory.name || 'N/A'}
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-orange-500/10 rounded-full mb-3 group-hover:bg-orange-500/20 transition-colors">
                            <Award className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">المنتج الأكثر طلباً</span>
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1 truncate w-full text-right">
                            {topProducts[0]?.name || 'N/A'}
                        </span>
                    </div>
                </GlassCard>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <HourlyChart data={hourlyData} />
                <CategoryChart data={categoryData} />
            </div>

            {/* Performance Indicator */}
            <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10 p-6 flex items-center justify-between" dir="rtl">
                    <div className="flex items-center gap-3">
                        <Zap className="w-8 h-8 text-yellow-500 animate-pulse" />
                        <div>
                            <h3 className="text-lg font-bold">أداء ممتاز</h3>
                            <p className="text-sm text-muted-foreground">المقهى يحقق نتائج قوية في جميع المؤشرات</p>
                        </div>
                    </div>
                    <div className="text-6xl font-bold text-emerald-500 opacity-20">98%</div>
                </div>
            </GlassCard>
        </div>
    );
}
