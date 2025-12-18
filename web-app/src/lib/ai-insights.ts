/**
 * Enhanced JavaScript AI Insights Engine
 * Matches Python output quality for Vercel deployment
 */

import { DatabaseData } from '@/lib/db';

interface DailySummary {
    date: string;
    totalSales: number;
    totalExpenses: number;
    totalOrders: number;
    dayOfWeek: number;
    dayName: string;
}

interface Forecast {
    date: string;
    predicted: number;
    lower: number;
    upper: number;
    confidence: number;
}

interface Anomaly {
    date: string;
    actual: number;
    expected: number;
    zscore: number;
    type: 'high' | 'low';
}

interface WeeklyPattern {
    day: string;
    average: number;
    count: number;
}

interface ProductAnalysis {
    name: string;
    quantity: number;
    revenue: number;
}

// Day names in Arabic
const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Calculate mean
function mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Calculate standard deviation
function stdDev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const avg = mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

// Linear regression
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n || 0;
    
    // R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
    
    return { slope, intercept, r2 };
}

// Format number with Arabic locale
function formatNumber(num: number): string {
    return new Intl.NumberFormat('ar-SA').format(Math.round(num));
}

// Format currency
function formatCurrency(num: number): string {
    return `${formatNumber(num)} IQD`;
}

// Process daily sales data
function processDailyData(data: DatabaseData): DailySummary[] {
    const dailyMap = new Map<string, DailySummary>();
    
    // First try DailyReceipts - most accurate source
    if (data.DailyReceipts && data.DailyReceipts.length > 0) {
        data.DailyReceipts.forEach(receipt => {
            const dateObj = (receipt as any).date || (receipt as any).businessDate;
            if (!dateObj) return;
            
            const date = dateObj.toISOString().split('T')[0];
            const dayOfWeek = dateObj.getDay();
            
            // Handle Decimal type
            const totalSales = typeof (receipt as any).totalSales === 'object' 
                ? Number((receipt as any).totalSales) 
                : Number((receipt as any).totalSales || (receipt as any).totalRevenue || 0);
            
            const totalExpenses = typeof receipt.totalExpenses === 'object'
                ? Number(receipt.totalExpenses)
                : Number(receipt.totalExpenses || 0);
            
            dailyMap.set(date, {
                date,
                totalSales,
                totalExpenses,
                totalOrders: 1,
                dayOfWeek,
                dayName: DAY_NAMES_AR[dayOfWeek]
            });
        });
    }
    
    // If no DailyReceipts, aggregate from OrderItems
    if (dailyMap.size === 0 && data.OrderItems && data.OrderItems.length > 0) {
        data.OrderItems.forEach(item => {
            const dateObj = (item as any).createdAt || (item as any).date;
            if (!dateObj) return;
            
            const date = dateObj.toISOString().split('T')[0];
            const dayOfWeek = dateObj.getDay();
            
            const price = typeof (item as any).price === 'object' ? Number((item as any).price) : Number((item as any).price || (item as any).unitPrice || 0);
            const revenue = price * ((item as any).quantity || (item as any).qty || 1);
            
            const existing = dailyMap.get(date) || {
                date,
                totalSales: 0,
                totalExpenses: 0,
                totalOrders: 0,
                dayOfWeek,
                dayName: DAY_NAMES_AR[dayOfWeek]
            };
            
            existing.totalSales += revenue;
            existing.totalOrders += 1;
            dailyMap.set(date, existing);
        });
    }
    
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Analyze weekly patterns
function analyzeWeeklyPatterns(dailyData: DailySummary[]): { 
    patterns: WeeklyPattern[];
    bestDay: WeeklyPattern;
    worstDay: WeeklyPattern;
    weekendBoost: number;
} {
    const dayTotals: Record<number, { total: number; count: number }> = {};
    
    for (let i = 0; i < 7; i++) {
        dayTotals[i] = { total: 0, count: 0 };
    }
    
    dailyData.forEach(d => {
        dayTotals[d.dayOfWeek].total += d.totalSales;
        dayTotals[d.dayOfWeek].count += 1;
    });
    
    const patterns: WeeklyPattern[] = [];
    for (let i = 0; i < 7; i++) {
        const avg = dayTotals[i].count > 0 ? dayTotals[i].total / dayTotals[i].count : 0;
        patterns.push({
            day: DAY_NAMES_AR[i],
            average: avg,
            count: dayTotals[i].count
        });
    }
    
    const validPatterns = patterns.filter(p => p.count > 0);
    const bestDay = validPatterns.reduce((max, p) => p.average > max.average ? p : max, validPatterns[0] || patterns[0]);
    const worstDay = validPatterns.reduce((min, p) => p.average < min.average ? p : min, validPatterns[0] || patterns[0]);
    
    // Weekend boost (Friday + Saturday in Arab world)
    const weekdayAvg = mean([0, 1, 2, 3, 4].map(d => patterns[d].average).filter(v => v > 0));
    const weekendAvg = mean([5, 6].map(d => patterns[d].average).filter(v => v > 0));
    const weekendBoost = weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 : 0;
    
    return { patterns, bestDay, worstDay, weekendBoost };
}

// Detect anomalies using Z-score
function detectAnomalies(dailyData: DailySummary[], threshold: number = 2): Anomaly[] {
    if (dailyData.length < 7) return [];
    
    const sales = dailyData.map(d => d.totalSales);
    const avgSales = mean(sales);
    const salesStdDev = stdDev(sales);
    
    if (salesStdDev === 0) return [];
    
    const anomalies: Anomaly[] = [];
    
    dailyData.forEach(d => {
        const zscore = (d.totalSales - avgSales) / salesStdDev;
        if (Math.abs(zscore) >= threshold) {
            anomalies.push({
                date: d.date,
                actual: d.totalSales,
                expected: avgSales,
                zscore: Math.round(zscore * 10) / 10,
                type: zscore > 0 ? 'high' : 'low'
            });
        }
    });
    
    return anomalies.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
}

// Generate forecast with confidence intervals
function generateForecast(dailyData: DailySummary[], daysAhead: number = 7): Forecast[] {
    const forecasts: Forecast[] = [];
    
    if (dailyData.length < 3) {
        const lastDate = new Date();
        for (let i = 1; i <= daysAhead; i++) {
            const forecastDate = new Date(lastDate);
            forecastDate.setDate(forecastDate.getDate() + i);
            forecasts.push({
                date: forecastDate.toISOString().split('T')[0],
                predicted: 0,
                lower: 0,
                upper: 0,
                confidence: 0
            });
        }
        return forecasts;
    }
    
    const recentData = dailyData.slice(-30);
    const sales = recentData.map(d => d.totalSales);
    const x = recentData.map((_, i) => i);
    
    const { slope, intercept, r2 } = linearRegression(x, sales);
    const historicalStd = stdDev(sales);
    
    // Day-of-week multipliers
    const { patterns } = analyzeWeeklyPatterns(dailyData);
    const overallAvg = mean(sales);
    const dowMultipliers: Record<number, number> = {};
    patterns.forEach((p, i) => {
        dowMultipliers[i] = overallAvg > 0 && p.average > 0 ? p.average / overallAvg : 1;
    });
    
    const lastDate = new Date(recentData[recentData.length - 1].date);
    const lastIndex = x.length - 1;
    
    for (let i = 1; i <= daysAhead; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);
        const dow = forecastDate.getDay();
        
        // Base prediction with trend
        let basePredict = intercept + slope * (lastIndex + i);
        
        // Apply day-of-week adjustment
        basePredict *= (dowMultipliers[dow] || 1);
        
        // Ensure non-negative
        const predicted = Math.max(0, basePredict);
        
        // Confidence decreases with distance
        const confidence = Math.max(0.5, r2 * (1 - (i - 1) * 0.05));
        
        // Confidence interval (95%)
        const margin = historicalStd * 1.96 * (1 + (i - 1) * 0.1);
        
        forecasts.push({
            date: forecastDate.toISOString().split('T')[0],
            predicted: Math.round(predicted),
            lower: Math.max(0, Math.round(predicted - margin)),
            upper: Math.round(predicted + margin),
            confidence: Math.round(confidence * 100) / 100
        });
    }
    
    return forecasts;
}

// Analyze product performance
function analyzeProducts(data: DatabaseData): ProductAnalysis[] {
    if (!data.OrderItems || !data.MenuItems) return [];
    
    const menuLookup = new Map<number, string>();
    data.MenuItems.forEach(item => {
        menuLookup.set(Number(item.id), (item as any).name || (item as any).productName || `منتج ${item.id}`);
    });
    
    const productStats = new Map<string, { quantity: number; revenue: number }>();
    
    data.OrderItems.forEach(item => {
        const itemId = Number((item as any).menuItemId || (item as any).productId);
        const name = menuLookup.get(itemId) || `منتج ${itemId}`;
        const price = typeof (item as any).price === 'object' ? Number((item as any).price) : Number((item as any).price || (item as any).unitPrice || 0);
        const qty = (item as any).quantity || (item as any).qty || 1;
        
        const existing = productStats.get(name) || { quantity: 0, revenue: 0 };
        existing.quantity += Number(qty);
        existing.revenue += Number(price) * Number(qty);
        productStats.set(name, existing);
    });
    
    return Array.from(productStats.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
}

// Generate smart recommendations
function generateRecommendations(
    dailyData: DailySummary[],
    weeklyPatterns: ReturnType<typeof analyzeWeeklyPatterns>,
    anomalies: Anomaly[],
    products: ProductAnalysis[]
): string[] {
    const recommendations: string[] = [];
    
    if (dailyData.length < 7) {
        recommendations.push("📊 جمع المزيد من البيانات للحصول على تحليلات أدق - يلزم على الأقل 7 أيام من السجلات");
        return recommendations;
    }
    
    // Trend analysis
    const recentData = dailyData.slice(-7);
    const olderData = dailyData.slice(-14, -7);
    
    if (olderData.length > 0) {
        const recentAvg = mean(recentData.map(d => d.totalSales));
        const olderAvg = mean(olderData.map(d => d.totalSales));
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (change < -15) {
            recommendations.push(`🔴 انخفاض حاد في المبيعات بنسبة ${Math.abs(change).toFixed(1)}% - راجع العوامل المؤثرة وفكر في حملات ترويجية`);
        } else if (change < -5) {
            recommendations.push(`🟡 انخفاض طفيف في المبيعات بنسبة ${Math.abs(change).toFixed(1)}% - راقب الاتجاه خلال الأيام القادمة`);
        } else if (change > 15) {
            recommendations.push(`🟢 نمو ممتاز بنسبة ${change.toFixed(1)}% - حافظ على هذا الزخم واستثمر في المنتجات الناجحة`);
        }
    }
    
    // Day optimization
    if (weeklyPatterns.bestDay && weeklyPatterns.worstDay) {
        recommendations.push(
            `📅 ${weeklyPatterns.bestDay.day} هو أفضل يوم (${formatCurrency(weeklyPatterns.bestDay.average)}) - خصص موظفين إضافيين`
        );
        recommendations.push(
            `💡 ${weeklyPatterns.worstDay.day} هو الأضعف (${formatCurrency(weeklyPatterns.worstDay.average)}) - فكر في عروض خاصة`
        );
    }
    
    // Weekend strategy
    if (weeklyPatterns.weekendBoost > 10) {
        recommendations.push(`📈 عطلة نهاية الأسبوع أعلى بـ ${weeklyPatterns.weekendBoost.toFixed(1)}% - ركز التسويق على أيام الأسبوع`);
    } else if (weeklyPatterns.weekendBoost < -10) {
        recommendations.push(`📉 عطلة نهاية الأسبوع أقل بـ ${Math.abs(weeklyPatterns.weekendBoost).toFixed(1)}% - أضف فعاليات أو عروض خاصة`);
    }
    
    // Product recommendations
    if (products.length > 0) {
        const topProduct = products[0];
        recommendations.push(`⭐ المنتج الأعلى مبيعاً: "${topProduct.name}" (${formatCurrency(topProduct.revenue)}) - فكر في منتجات مشابهة`);
    }
    
    // Anomaly-based recommendations
    const recentAnomalies = anomalies.filter(a => {
        const daysAgo = (Date.now() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo < 14;
    });
    
    if (recentAnomalies.length > 0) {
        const highAnomalies = recentAnomalies.filter(a => a.type === 'high');
        const lowAnomalies = recentAnomalies.filter(a => a.type === 'low');
        
        if (highAnomalies.length > 0) {
            recommendations.push(`🔍 ادرس أسباب الارتفاع في ${highAnomalies[0].date} لتكرار النجاح`);
        }
        if (lowAnomalies.length > 0) {
            recommendations.push(`⚠️ تحقق من أسباب الانخفاض في ${lowAnomalies[0].date} لتجنب تكراره`);
        }
    }
    
    return recommendations;
}

// ============ REPORT GENERATORS ============

export function generateFullReport(data: DatabaseData): string {
    const dailyData = processDailyData(data);
    const now = new Date().toLocaleString('ar-SA');
    
    let report = `# 🧠 تقرير ذكاء الأعمال المتقدم\n\n`;
    report += `*تم إنشاؤه في: ${now}*\n\n`;
    
    if (dailyData.length === 0) {
        return report + "⚠️ لا تتوفر بيانات كافية للتحليل. يرجى التأكد من وجود سجلات المبيعات.";
    }
    
    // Summary Statistics
    const totalSales = dailyData.reduce((sum, d) => sum + d.totalSales, 0);
    const avgDailySales = mean(dailyData.map(d => d.totalSales));
    const maxSales = Math.max(...dailyData.map(d => d.totalSales));
    const minSales = Math.min(...dailyData.map(d => d.totalSales));
    const last7 = dailyData.slice(-7);
    const last7Total = last7.reduce((sum, d) => sum + d.totalSales, 0);
    
    report += `## 📊 ملخص الأداء\n\n`;
    report += `| المؤشر | القيمة |\n|---|---|\n`;
    report += `| إجمالي المبيعات | **${formatCurrency(totalSales)}** |\n`;
    report += `| متوسط المبيعات اليومية | ${formatCurrency(avgDailySales)} |\n`;
    report += `| أعلى مبيعات يومية | ${formatCurrency(maxSales)} |\n`;
    report += `| أدنى مبيعات يومية | ${formatCurrency(minSales)} |\n`;
    report += `| مبيعات آخر 7 أيام | ${formatCurrency(last7Total)} |\n`;
    report += `| عدد الأيام المسجلة | ${dailyData.length} يوم |\n\n`;
    
    // Forecasts
    report += `## 📈 توقعات المبيعات\n\n`;
    report += `### 🔮 توقعات الأسبوع القادم\n\n`;
    report += `| التاريخ | اليوم | المتوقع | النطاق (95%) |\n|---|---|---|---|\n`;
    
    const forecasts = generateForecast(dailyData, 7);
    forecasts.forEach(f => {
        const dateObj = new Date(f.date);
        const dayName = DAY_NAMES_AR[dateObj.getDay()];
        report += `| ${f.date} | ${dayName} | **${formatCurrency(f.predicted)}** | ${formatCurrency(f.lower)} - ${formatCurrency(f.upper)} |\n`;
    });
    
    const forecastTotal = forecasts.reduce((sum, f) => sum + f.predicted, 0);
    report += `\n*إجمالي المتوقع للأسبوع: **${formatCurrency(forecastTotal)}***\n\n`;
    
    // Anomalies
    report += `## 🚨 كشف الشذوذ\n\n`;
    
    const anomalies = detectAnomalies(dailyData, 2.0);
    
    if (anomalies.length > 0) {
        report += `تم اكتشاف **${anomalies.length}** قيم غير طبيعية:\n\n`;
        report += `| التاريخ | المبيعات | الحالة |\n|---|---|---|\n`;
        
        anomalies.forEach(a => {
            const status = a.type === 'high' ? `🔴 مرتفع جداً` : `🟡 منخفض جداً`;
            report += `| ${a.date} | ${formatCurrency(a.actual)} | ${status} (${a.zscore}σ) |\n`;
        });
    } else {
        report += `✅ لا توجد قيم شاذة - البيانات ضمن النطاق الطبيعي\n`;
    }
    
    report += `\n`;
    
    // Weekly Patterns
    report += `## 📅 أنماط المبيعات الأسبوعية\n\n`;
    
    const weeklyPatterns = analyzeWeeklyPatterns(dailyData);
    
    report += `| اليوم | متوسط المبيعات |\n|---|---|\n`;
    
    const sortedPatterns = [...weeklyPatterns.patterns]
        .filter(p => p.count > 0)
        .sort((a, b) => b.average - a.average);
    
    sortedPatterns.forEach(p => {
        report += `| ${p.day} | ${formatCurrency(p.average)} |\n`;
    });
    
    report += `\n**أفضل يوم:** ${weeklyPatterns.bestDay.day} (${formatCurrency(weeklyPatterns.bestDay.average)})\n`;
    report += `**أضعف يوم:** ${weeklyPatterns.worstDay.day} (${formatCurrency(weeklyPatterns.worstDay.average)})\n`;
    
    if (weeklyPatterns.weekendBoost > 0) {
        report += `\n📈 عطلة نهاية الأسبوع أعلى بـ **${weeklyPatterns.weekendBoost.toFixed(1)}%**\n`;
    } else if (weeklyPatterns.weekendBoost < 0) {
        report += `\n📉 عطلة نهاية الأسبوع أقل بـ **${Math.abs(weeklyPatterns.weekendBoost).toFixed(1)}%**\n`;
    }
    
    report += `\n`;
    
    // Product Analysis
    const products = analyzeProducts(data);
    
    if (products.length > 0) {
        report += `## 🏆 المنتجات الأعلى مبيعاً\n\n`;
        report += `| المنتج | الكمية | الإيرادات |\n|---|---|---|\n`;
        
        products.slice(0, 5).forEach((p, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            report += `| ${medal} ${p.name} | ${p.quantity} | ${formatCurrency(p.revenue)} |\n`;
        });
        
        report += `\n`;
    }
    
    // Recommendations
    report += `## 💡 التوصيات الذكية\n\n`;
    
    const recommendations = generateRecommendations(dailyData, weeklyPatterns, anomalies, products);
    
    recommendations.forEach((rec, i) => {
        report += `${i + 1}. ${rec}\n`;
    });
    
    return report;
}

export function generateForecastReport(data: DatabaseData): string {
    const dailyData = processDailyData(data);
    
    let report = `# 🔮 توقعات المبيعات التفصيلية\n\n`;
    
    if (dailyData.length < 3) {
        return report + "⚠️ لا تتوفر بيانات كافية للتوقعات. يلزم على الأقل 3 أيام من السجلات.";
    }
    
    const forecasts = generateForecast(dailyData, 7);
    const forecastTotal = forecasts.reduce((sum, f) => sum + f.predicted, 0);
    
    report += `📊 **إجمالي المتوقع للأسبوع:** ${formatCurrency(forecastTotal)}\n\n`;
    
    report += `| التاريخ | اليوم | المتوقع | الحد الأدنى | الحد الأعلى | الثقة |\n`;
    report += `|---|---|---|---|---|---|\n`;
    
    forecasts.forEach(f => {
        const dateObj = new Date(f.date);
        const dayName = DAY_NAMES_AR[dateObj.getDay()];
        report += `| ${f.date} | ${dayName} | **${formatCurrency(f.predicted)}** | ${formatCurrency(f.lower)} | ${formatCurrency(f.upper)} | ${Math.round(f.confidence * 100)}% |\n`;
    });
    
    // Trend analysis
    report += `\n## 📈 تحليل الاتجاه\n\n`;
    
    const recentSales = dailyData.slice(-14).map(d => d.totalSales);
    const x = recentSales.map((_, i) => i);
    const { slope, r2 } = linearRegression(x, recentSales);
    
    if (slope > 50) {
        report += `🟢 **اتجاه صاعد قوي** - المبيعات تتزايد بمعدل ${formatCurrency(slope)} يومياً\n`;
    } else if (slope > 0) {
        report += `🟡 **اتجاه صاعد طفيف** - المبيعات تتزايد ببطء\n`;
    } else if (slope < -50) {
        report += `🔴 **اتجاه هابط قوي** - المبيعات تتراجع بمعدل ${formatCurrency(Math.abs(slope))} يومياً\n`;
    } else {
        report += `🟡 **اتجاه مستقر** - المبيعات ثابتة نسبياً\n`;
    }
    
    report += `\n*دقة النموذج (R²): ${(r2 * 100).toFixed(1)}%*\n`;
    
    return report;
}

export function generateAnomaliesReport(data: DatabaseData): string {
    const dailyData = processDailyData(data);
    
    let report = `# 🚨 تحليل الحالات غير الطبيعية\n\n`;
    
    if (dailyData.length < 7) {
        return report + "⚠️ لا تتوفر بيانات كافية للتحليل. يلزم على الأقل 7 أيام من السجلات.";
    }
    
    const anomalies = detectAnomalies(dailyData, 1.5);
    
    if (anomalies.length === 0) {
        report += `✅ **لم يتم اكتشاف حالات غير طبيعية**\n\n`;
        report += `المبيعات تسير ضمن النطاق المتوقع.\n\n`;
    } else {
        report += `تم اكتشاف **${anomalies.length}** حالة غير طبيعية:\n\n`;
        
        const highAnomalies = anomalies.filter(a => a.type === 'high');
        const lowAnomalies = anomalies.filter(a => a.type === 'low');
        
        if (highAnomalies.length > 0) {
            report += `## 📈 ارتفاعات غير عادية (${highAnomalies.length})\n\n`;
            highAnomalies.forEach(a => {
                const deviation = ((a.actual - a.expected) / a.expected * 100).toFixed(1);
                report += `### ${a.date}\n`;
                report += `- **القيمة الفعلية:** ${formatCurrency(a.actual)}\n`;
                report += `- **القيمة المتوقعة:** ${formatCurrency(a.expected)}\n`;
                report += `- **الانحراف:** +${deviation}% (${a.zscore}σ)\n\n`;
            });
        }
        
        if (lowAnomalies.length > 0) {
            report += `## 📉 انخفاضات غير عادية (${lowAnomalies.length})\n\n`;
            lowAnomalies.forEach(a => {
                const deviation = ((a.actual - a.expected) / a.expected * 100).toFixed(1);
                report += `### ${a.date}\n`;
                report += `- **القيمة الفعلية:** ${formatCurrency(a.actual)}\n`;
                report += `- **القيمة المتوقعة:** ${formatCurrency(a.expected)}\n`;
                report += `- **الانحراف:** ${deviation}% (${a.zscore}σ)\n\n`;
            });
        }
    }
    
    // Statistics
    const sales = dailyData.map(d => d.totalSales);
    const avg = mean(sales);
    const std = stdDev(sales);
    
    report += `## 📊 إحصائيات المرجعية\n\n`;
    report += `| المؤشر | القيمة |\n|---|---|\n`;
    report += `| المتوسط | ${formatCurrency(avg)} |\n`;
    report += `| الانحراف المعياري | ${formatCurrency(std)} |\n`;
    report += `| عتبة الشذوذ العليا | ${formatCurrency(avg + 2 * std)} |\n`;
    report += `| عتبة الشذوذ الدنيا | ${formatCurrency(Math.max(0, avg - 2 * std))} |\n`;
    
    return report;
}

export function generateRecommendationsReport(data: DatabaseData): string {
    const dailyData = processDailyData(data);
    
    let report = `# 💡 التوصيات الذكية لتحسين الأداء\n\n`;
    
    if (dailyData.length < 7) {
        report += "⚠️ جمع المزيد من البيانات للحصول على توصيات دقيقة.\n\n";
        report += "**الإجراءات المطلوبة:**\n";
        report += "1. تسجيل المبيعات اليومية بانتظام\n";
        report += "2. متابعة الإيصالات والفواتير\n";
        report += "3. تحديث قاعدة البيانات\n";
        return report;
    }
    
    const weeklyPatterns = analyzeWeeklyPatterns(dailyData);
    const anomalies = detectAnomalies(dailyData, 2.0);
    const products = analyzeProducts(data);
    
    const recommendations = generateRecommendations(dailyData, weeklyPatterns, anomalies, products);
    
    // Priority categorization
    const highPriority = recommendations.filter(r => r.includes('🔴') || r.includes('⚠️'));
    const mediumPriority = recommendations.filter(r => r.includes('🟡') || r.includes('📅') || r.includes('📈') || r.includes('📉'));
    const lowPriority = recommendations.filter(r => !highPriority.includes(r) && !mediumPriority.includes(r));
    
    if (highPriority.length > 0) {
        report += `## 🔴 أولوية عالية\n\n`;
        highPriority.forEach((rec, i) => {
            report += `${i + 1}. ${rec}\n`;
        });
        report += `\n`;
    }
    
    if (mediumPriority.length > 0) {
        report += `## 🟡 أولوية متوسطة\n\n`;
        mediumPriority.forEach((rec, i) => {
            report += `${i + 1}. ${rec}\n`;
        });
        report += `\n`;
    }
    
    if (lowPriority.length > 0) {
        report += `## 🟢 أولوية منخفضة\n\n`;
        lowPriority.forEach((rec, i) => {
            report += `${i + 1}. ${rec}\n`;
        });
        report += `\n`;
    }
    
    // Quick Stats
    report += `## 📊 نظرة سريعة\n\n`;
    
    const avgDaily = mean(dailyData.map(d => d.totalSales));
    
    report += `| المؤشر | القيمة |\n|---|---|\n`;
    report += `| أفضل يوم | ${weeklyPatterns.bestDay.day} |\n`;
    report += `| أضعف يوم | ${weeklyPatterns.worstDay.day} |\n`;
    report += `| متوسط المبيعات | ${formatCurrency(avgDaily)} |\n`;
    
    if (products.length > 0) {
        report += `| أفضل منتج | ${products[0].name} |\n`;
    }
    
    return report;
}
