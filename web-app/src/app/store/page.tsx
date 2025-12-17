import { getInventory } from "@/lib/db";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, CheckCircle, XCircle, DollarSign, TrendingDown, Box } from "lucide-react";

export default async function StorePage() {
    const inventory = await getInventory();

    // Calculate inventory statistics
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => {
        const stock = item.currentStock;
        const min = item.minStock;
        return stock > 0 && stock <= min;
    }).length;
    const outOfStockItems = inventory.filter(item => item.currentStock <= 0).length;
    const totalValue = inventory.reduce((sum, item) =>
        sum + (item.currentStock * (item.costPerUnit || 0)), 0);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen">

            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-600 p-8 shadow-2xl">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                        <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center justify-end gap-3">
                            <span>إدارة المخزون</span>
                            <Box className="w-10 h-10 animate-pulse" />
                        </h1>
                        <p className="text-emerald-100 text-lg">مراقبة وتتبع المكونات والمواد</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 border border-white/30">
                            <div className="text-white/80 text-xs">إجمالي العناصر</div>
                            <div className="text-white text-2xl font-bold">{totalItems}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-emerald-500/10 rounded-full mb-3 group-hover:bg-emerald-500/20 transition-colors">
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">إجمالي العناصر</span>
                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            {totalItems}
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-orange-500/10 rounded-full mb-3 group-hover:bg-orange-500/20 transition-colors">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">مخزون منخفض</span>
                        <span className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                            {lowStockItems}
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-red-500/10 rounded-full mb-3 group-hover:bg-red-500/20 transition-colors">
                            <XCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">نفد المخزون</span>
                        <span className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                            {outOfStockItems}
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col items-end p-6">
                        <div className="p-3 bg-blue-500/10 rounded-full mb-3 group-hover:bg-blue-500/20 transition-colors">
                            <DollarSign className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">قيمة المخزون</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {new Intl.NumberFormat('ar-IQ', { notation: 'compact', maximumFractionDigits: 1 }).format(totalValue)}
                        </span>
                    </div>
                </GlassCard>
            </div>

            {/* Inventory Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inventory.map((item) => {
                    const stock = item.currentStock;
                    const minStock = item.minStock;
                    let status = "متوفر";
                    let statusColor = "emerald";
                    let variant: "default" | "destructive" | "secondary" | "outline" = "secondary";
                    let IconComponent = CheckCircle;

                    if (stock <= 0) {
                        status = "نفد المخزون";
                        statusColor = "red";
                        variant = "destructive";
                        IconComponent = XCircle;
                    } else if (stock <= minStock) {
                        status = "مخزون منخفض";
                        statusColor = "orange";
                        variant = "destructive";
                        IconComponent = AlertTriangle;
                    }

                    const stockPercentage = minStock > 0 ? Math.min((stock / (minStock * 2)) * 100, 100) : 100;

                    return (
                        <GlassCard
                            key={item.id}
                            className="group hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden"
                            variant={stock <= 0 ? "destruction" : stock <= minStock ? "destruction" : "default"}
                        >
                            {/* Stock Level Indicator Bar */}
                            <div
                                className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-500 ${statusColor === 'emerald' ? 'bg-emerald-500' :
                                        statusColor === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${stockPercentage}%` }}
                            />

                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <Badge variant={variant} className="flex items-center gap-1">
                                        <IconComponent className="w-3 h-3" />
                                        {status}
                                    </Badge>
                                    <Package className={`w-5 h-5 ${statusColor === 'emerald' ? 'text-emerald-500' :
                                            statusColor === 'orange' ? 'text-orange-500' : 'text-red-500'
                                        }`} />
                                </div>

                                <h3 className="text-lg font-bold text-right mb-2 group-hover:text-primary transition-colors">
                                    {item.name}
                                </h3>

                                <div className="space-y-2 text-sm" dir="rtl">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">المخزون الحالي:</span>
                                        <span className={`font-bold ${statusColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                                                statusColor === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                                                    'text-red-600 dark:text-red-400'
                                            }`}>
                                            {stock} {item.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">الحد الأدنى:</span>
                                        <span className="font-medium">{minStock} {item.unit}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                        <span className="text-muted-foreground">التكلفة/وحدة:</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">
                                            {new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0 }).format(item.costPerUnit || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );
}
