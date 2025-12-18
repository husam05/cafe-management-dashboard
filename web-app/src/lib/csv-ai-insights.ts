/**
 * Enhanced AI Insights Engine with CSV Support
 * Provides detailed business intelligence analysis
 */

import { parseCsvData, generateCsvAnalytics as generateAnalytics, ParsedCsvData } from './csv-parser';
import { promises as fs } from 'fs';
import path from 'path';

// Re-export for external use
export { generateAnalytics as generateCsvAnalytics };
export type { ParsedCsvData };

// Day names in Arabic
const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Format number with Arabic locale
function formatNumber(num: number): string {
    return new Intl.NumberFormat('ar-SA').format(Math.round(num));
}

// Format currency
function formatCurrency(num: number): string {
    return `${formatNumber(num)} IQD`;
}

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

// Linear regression for forecasting
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n || 0;
    
    const yMean = sumY / n;
    const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
    
    return { slope, intercept, r2 };
}

/**
 * Load and parse CSV data
 */
export async function loadCsvData(): Promise<ParsedCsvData | null> {
    try {
        const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
        const csvPath = isVercel
            ? path.join(process.cwd(), 'public/cafe_management.csv')
            : path.join(process.cwd(), '../cafe_management.csv');
        
        const content = await fs.readFile(csvPath, 'utf-8');
        return parseCsvData(content);
    } catch (error) {
        console.error('Failed to load CSV:', error);
        return null;
    }
}

/**
 * Generate comprehensive business report from CSV data
 */
export function generateCsvFullReport(data: ParsedCsvData): string {
    const analytics = generateAnalytics(data);
    const now = new Date();
    
    let report = `# 🧠 تقرير ذكاء الأعمال المتقدم\n\n`;
    report += `> تم إنشاؤه في: ${now.toLocaleString('ar-SA')}\n\n`;
    report += `> **مصدر البيانات:** ${formatNumber(data.orders.length)} طلب | ${formatNumber(data.dailyReceipts.length)} إيصال يومي | ${formatNumber(data.expenses.length)} مصروف\n\n`;
    
    // ═══════════════════════════════════════════════════
    // SECTION 1: Executive Summary
    // ═══════════════════════════════════════════════════
    report += `## 📊 ملخص تنفيذي\n\n`;
    report += `| المؤشر | القيمة |\n`;
    report += `|--------|--------|\n`;
    report += `| 📦 إجمالي الطلبات | ${formatNumber(analytics.summary.totalOrders)} |\n`;
    report += `| 💰 إجمالي الإيرادات | ${formatCurrency(analytics.summary.totalRevenue)} |\n`;
    report += `| 🧾 متوسط قيمة الطلب | ${formatCurrency(analytics.summary.avgOrderValue)} |\n`;
    report += `| 📤 إجمالي المصروفات | ${formatCurrency(analytics.summary.totalExpenses)} |\n`;
    report += `| 📈 صافي الربح | ${formatCurrency(analytics.summary.netProfit)} |\n`;
    report += `| 👥 عدد الموظفين | ${analytics.summary.totalStaff} |\n`;
    report += `| 💵 إجمالي الرواتب | ${formatCurrency(analytics.summary.totalSalaries)} |\n\n`;
    
    // Profit margin
    const profitMargin = analytics.summary.totalRevenue > 0 
        ? (analytics.summary.netProfit / analytics.summary.totalRevenue * 100) 
        : 0;
    report += `### هامش الربح: ${profitMargin.toFixed(1)}%\n\n`;
    
    // ═══════════════════════════════════════════════════
    // SECTION 2: Weekly Patterns
    // ═══════════════════════════════════════════════════
    report += `## 📅 تحليل الأنماط الأسبوعية\n\n`;
    report += `| اليوم | متوسط المبيعات | عدد الأيام |\n`;
    report += `|-------|----------------|------------|\n`;
    
    const avgSalesByDay = analytics.patterns.avgByDayOfWeek;
    for (let i = 0; i < 7; i++) {
        const dayName = DAY_NAMES_AR[i];
        const avg = avgSalesByDay[i];
        const emoji = avg === Math.max(...avgSalesByDay.filter(v => v > 0)) ? '🏆' : 
                     avg === Math.min(...avgSalesByDay.filter(v => v > 0)) ? '📉' : '';
        report += `| ${dayName} ${emoji} | ${formatCurrency(avg)} | - |\n`;
    }
    report += `\n`;
    
    // Best/Worst analysis
    const validDays = avgSalesByDay.map((avg, i) => ({ day: DAY_NAMES_AR[i], avg })).filter(d => d.avg > 0);
    if (validDays.length > 0) {
        const bestDay = validDays.reduce((a, b) => a.avg > b.avg ? a : b);
        const worstDay = validDays.reduce((a, b) => a.avg < b.avg ? a : b);
        
        report += `### 🏆 أفضل يوم: **${bestDay.day}** (${formatCurrency(bestDay.avg)})\n`;
        report += `### 📉 أضعف يوم: **${worstDay.day}** (${formatCurrency(worstDay.avg)})\n\n`;
    }
    
    // ═══════════════════════════════════════════════════
    // SECTION 3: Hourly Analysis
    // ═══════════════════════════════════════════════════
    report += `## ⏰ تحليل ساعات الذروة\n\n`;
    report += `| الساعة | المبيعات | عدد الطلبات |\n`;
    report += `|--------|----------|-------------|\n`;
    
    const hourlyData = analytics.patterns.salesByHour.map((sales, hour) => ({
        hour,
        sales,
        count: analytics.patterns.countByHour[hour]
    })).filter(h => h.count > 0).sort((a, b) => b.sales - a.sales).slice(0, 8);
    
    hourlyData.forEach((h, index) => {
        const emoji = index === 0 ? '🔥' : index < 3 ? '📈' : '';
        report += `| ${h.hour}:00 ${emoji} | ${formatCurrency(h.sales)} | ${formatNumber(h.count)} |\n`;
    });
    report += `\n`;
    
    // Peak hours
    if (hourlyData.length > 0) {
        const peakHour = hourlyData[0];
        report += `### 🔥 ساعة الذروة: **${peakHour.hour}:00** (${formatNumber(peakHour.count)} طلب)\n\n`;
    }
    
    // ═══════════════════════════════════════════════════
    // SECTION 4: Top Tables
    // ═══════════════════════════════════════════════════
    if (analytics.tables.length > 0) {
        report += `## 🪑 تحليل الطاولات\n\n`;
        report += `| الطاولة | عدد الطلبات | الإجمالي |\n`;
        report += `|---------|-------------|----------|\n`;
        
        analytics.tables.slice(0, 10).forEach((t, index) => {
            const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const tableName = t.table === 'takeaway' ? 'سفري' : `طاولة ${t.table}`;
            report += `| ${tableName} ${emoji} | ${formatNumber(t.count)} | ${formatCurrency(t.total)} |\n`;
        });
        report += `\n`;
    }
    
    // ═══════════════════════════════════════════════════
    // SECTION 5: Expenses Analysis
    // ═══════════════════════════════════════════════════
    if (analytics.expenses.length > 0) {
        report += `## 💸 تحليل المصروفات\n\n`;
        report += `| الفئة | المبلغ | النسبة |\n`;
        report += `|-------|--------|--------|\n`;
        
        const totalExp = analytics.expenses.reduce((sum, e) => sum + e.amount, 0);
        analytics.expenses.forEach(e => {
            const percentage = totalExp > 0 ? (e.amount / totalExp * 100).toFixed(1) : '0';
            report += `| ${e.category} | ${formatCurrency(e.amount)} | ${percentage}% |\n`;
        });
        report += `\n`;
    }
    
    // ═══════════════════════════════════════════════════
    // SECTION 6: Staff Analysis
    // ═══════════════════════════════════════════════════
    if (analytics.staff.byRole.length > 0) {
        report += `## 👥 تحليل الموظفين\n\n`;
        report += `| الوظيفة | العدد |\n`;
        report += `|---------|-------|\n`;
        
        const roleNames: Record<string, string> = {
            'admin': 'مدير',
            'cashier': 'كاشير',
            'waiter': 'نادل',
            'kitchen': 'مطبخ'
        };
        
        analytics.staff.byRole.forEach(r => {
            const roleName = roleNames[r.role] || r.role;
            report += `| ${roleName} | ${r.count} |\n`;
        });
        report += `\n`;
        report += `### 💰 إجمالي الرواتب الشهرية: ${formatCurrency(analytics.staff.totalSalaries)}\n\n`;
    }
    
    // ═══════════════════════════════════════════════════
    // SECTION 7: Recent Trends
    // ═══════════════════════════════════════════════════
    report += `## 📈 اتجاهات آخر 7 أيام\n\n`;
    report += `| التاريخ | المبيعات |\n`;
    report += `|---------|----------|\n`;
    
    analytics.trends.last7Days.forEach(d => {
        const emoji = d.sales > 0 ? '✅' : '⚠️';
        report += `| ${d.date} ${emoji} | ${formatCurrency(d.sales)} |\n`;
    });
    report += `\n`;
    
    // ═══════════════════════════════════════════════════
    // SECTION 8: 7-Day Forecast
    // ═══════════════════════════════════════════════════
    report += `## 🔮 توقعات الـ 7 أيام القادمة\n\n`;
    
    // Use last 30 days for forecasting
    const salesData = Object.entries(analytics.trends.dailySalesMap)
        .map(([date, sales]) => ({ date, sales: sales as number }))
        .filter(d => d.sales > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
    
    if (salesData.length >= 7) {
        const x = salesData.map((_, i) => i);
        const y = salesData.map(d => d.sales);
        const { slope, intercept, r2 } = linearRegression(x, y);
        const std = stdDev(y);
        
        report += `| التاريخ | المتوقع | الحد الأدنى | الحد الأعلى |\n`;
        report += `|---------|---------|-------------|-------------|\n`;
        
        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            const predicted = Math.max(0, slope * (salesData.length + i) + intercept);
            const lower = Math.max(0, predicted - 1.96 * std);
            const upper = predicted + 1.96 * std;
            
            report += `| ${dateStr} | ${formatCurrency(predicted)} | ${formatCurrency(lower)} | ${formatCurrency(upper)} |\n`;
        }
        report += `\n`;
        report += `> 📊 دقة النموذج (R²): ${(r2 * 100).toFixed(1)}%\n\n`;
    } else {
        report += `> ⚠️ بيانات غير كافية للتنبؤ. يرجى توفير بيانات 7 أيام على الأقل.\n\n`;
    }
    
    // ═══════════════════════════════════════════════════
    // SECTION 9: Smart Recommendations
    // ═══════════════════════════════════════════════════
    report += `## 💡 التوصيات الذكية\n\n`;
    
    const recommendations: { priority: string; icon: string; text: string }[] = [];
    
    // Recommendation based on profit margin
    if (profitMargin < 20) {
        recommendations.push({
            priority: 'عالية',
            icon: '🔴',
            text: `هامش الربح منخفض (${profitMargin.toFixed(1)}%). يُنصح بمراجعة التكاليف أو زيادة الأسعار.`
        });
    } else if (profitMargin > 50) {
        recommendations.push({
            priority: 'متوسطة',
            icon: '🟢',
            text: `هامش ربح ممتاز (${profitMargin.toFixed(1)}%). فرصة للاستثمار في التوسع.`
        });
    }
    
    // Recommendation based on peak hours
    if (hourlyData.length > 0) {
        const peakHour = hourlyData[0].hour;
        recommendations.push({
            priority: 'متوسطة',
            icon: '🟡',
            text: `ساعة الذروة هي ${peakHour}:00. تأكد من توفر عدد كافٍ من الموظفين.`
        });
    }
    
    // Recommendation based on expenses
    if (analytics.summary.totalExpenses > analytics.summary.totalRevenue * 0.7) {
        recommendations.push({
            priority: 'عالية',
            icon: '🔴',
            text: 'المصروفات تشكل أكثر من 70% من الإيرادات. راجع بنود المصروفات.'
        });
    }
    
    // Recommendation for weekend optimization
    if (validDays.length > 0) {
        const weekdayAvg = mean([0, 1, 2, 3, 4].map(i => avgSalesByDay[i]).filter(v => v > 0));
        const weekendAvg = mean([5, 6].map(i => avgSalesByDay[i]).filter(v => v > 0));
        
        if (weekendAvg > weekdayAvg * 1.2) {
            recommendations.push({
                priority: 'متوسطة',
                icon: '🟢',
                text: 'نهاية الأسبوع قوية! فكر في عروض خاصة لأيام الأسبوع لزيادة المبيعات.'
            });
        } else if (weekdayAvg > weekendAvg * 1.2) {
            recommendations.push({
                priority: 'متوسطة',
                icon: '🟡',
                text: 'مبيعات نهاية الأسبوع ضعيفة. جرب عروض أو فعاليات لجذب الزبائن.'
            });
        }
    }
    
    // Staff cost ratio
    const staffCostRatio = analytics.summary.totalRevenue > 0 
        ? (analytics.summary.totalSalaries / analytics.summary.totalRevenue * 100) 
        : 0;
    if (staffCostRatio > 30) {
        recommendations.push({
            priority: 'متوسطة',
            icon: '🟡',
            text: `تكلفة الموظفين ${staffCostRatio.toFixed(1)}% من الإيرادات. راجع كفاءة العمل.`
        });
    }
    
    report += `| الأولوية | التوصية |\n`;
    report += `|----------|----------|\n`;
    recommendations.forEach(r => {
        report += `| ${r.icon} ${r.priority} | ${r.text} |\n`;
    });
    
    if (recommendations.length === 0) {
        report += `| 🟢 جيد | الأداء العام جيد. استمر في المراقبة والتحسين المستمر. |\n`;
    }
    
    report += `\n---\n`;
    report += `*تم إنشاء هذا التقرير تلقائياً بواسطة محرك ذكاء الأعمال*\n`;
    
    return report;
}

/**
 * Generate forecast report from CSV data
 */
export function generateCsvForecastReport(data: ParsedCsvData): string {
    const analytics = generateAnalytics(data);
    const now = new Date();
    
    let report = `# 🔮 تقرير التنبؤات\n\n`;
    report += `> تم إنشاؤه في: ${now.toLocaleString('ar-SA')}\n\n`;
    
    const salesData = Object.entries(analytics.trends.dailySalesMap)
        .map(([date, sales]) => ({ date, sales: sales as number }))
        .filter(d => d.sales > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
    
    if (salesData.length >= 7) {
        const x = salesData.map((_, i) => i);
        const y = salesData.map(d => d.sales);
        const { slope, intercept, r2 } = linearRegression(x, y);
        const std = stdDev(y);
        
        report += `## 📊 تحليل الاتجاه\n\n`;
        report += `- **اتجاه المبيعات:** ${slope > 0 ? '📈 صاعد' : slope < 0 ? '📉 هابط' : '➡️ مستقر'}\n`;
        report += `- **معدل التغير اليومي:** ${formatCurrency(Math.abs(slope))}\n`;
        report += `- **دقة النموذج (R²):** ${(r2 * 100).toFixed(1)}%\n\n`;
        
        report += `## 🔮 توقعات الـ 7 أيام القادمة\n\n`;
        report += `| التاريخ | اليوم | المتوقع | الحد الأدنى | الحد الأعلى |\n`;
        report += `|---------|-------|---------|-------------|-------------|\n`;
        
        let totalForecast = 0;
        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);
            const dateStr = futureDate.toISOString().split('T')[0];
            const dayName = DAY_NAMES_AR[futureDate.getDay()];
            
            const predicted = Math.max(0, slope * (salesData.length + i) + intercept);
            const lower = Math.max(0, predicted - 1.96 * std);
            const upper = predicted + 1.96 * std;
            totalForecast += predicted;
            
            report += `| ${dateStr} | ${dayName} | ${formatCurrency(predicted)} | ${formatCurrency(lower)} | ${formatCurrency(upper)} |\n`;
        }
        
        report += `\n### 📈 إجمالي التوقع للأسبوع: ${formatCurrency(totalForecast)}\n`;
        report += `### 📊 متوسط يومي متوقع: ${formatCurrency(totalForecast / 7)}\n`;
    } else {
        report += `> ⚠️ بيانات غير كافية للتنبؤ. يلزم 7 أيام على الأقل.\n`;
    }
    
    return report;
}

/**
 * Generate anomalies report from CSV data
 */
export function generateCsvAnomaliesReport(data: ParsedCsvData): string {
    const analytics = generateAnalytics(data);
    const now = new Date();
    
    let report = `# 🔍 تقرير كشف الشذوذ\n\n`;
    report += `> تم إنشاؤه في: ${now.toLocaleString('ar-SA')}\n\n`;
    
    const salesData = Object.entries(analytics.trends.dailySalesMap)
        .map(([date, sales]) => ({ date, sales: sales as number }))
        .filter(d => d.sales > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
    
    if (salesData.length >= 7) {
        const values = salesData.map(d => d.sales);
        const avg = mean(values);
        const std = stdDev(values);
        
        report += `## 📊 إحصائيات المبيعات\n\n`;
        report += `- **المتوسط:** ${formatCurrency(avg)}\n`;
        report += `- **الانحراف المعياري:** ${formatCurrency(std)}\n`;
        report += `- **أعلى مبيعات:** ${formatCurrency(Math.max(...values))}\n`;
        report += `- **أدنى مبيعات:** ${formatCurrency(Math.min(...values))}\n\n`;
        
        // Detect anomalies (Z-score > 2)
        const anomalies = salesData
            .map(d => ({
                ...d,
                zscore: std > 0 ? (d.sales - avg) / std : 0
            }))
            .filter(d => Math.abs(d.zscore) > 2)
            .sort((a, b) => Math.abs(b.zscore) - Math.abs(a.zscore));
        
        if (anomalies.length > 0) {
            report += `## ⚠️ أيام شاذة (${anomalies.length})\n\n`;
            report += `| التاريخ | المبيعات | Z-Score | النوع |\n`;
            report += `|---------|----------|---------|-------|\n`;
            
            anomalies.forEach(a => {
                const type = a.zscore > 0 ? '📈 مرتفع جداً' : '📉 منخفض جداً';
                report += `| ${a.date} | ${formatCurrency(a.sales)} | ${a.zscore.toFixed(2)} | ${type} |\n`;
            });
        } else {
            report += `## ✅ لا توجد أيام شاذة\n\n`;
            report += `جميع المبيعات ضمن النطاق الطبيعي (Z-Score < 2).\n`;
        }
    } else {
        report += `> ⚠️ بيانات غير كافية للتحليل. يلزم 7 أيام على الأقل.\n`;
    }
    
    return report;
}

/**
 * Generate recommendations report from CSV data
 */
export function generateCsvRecommendationsReport(data: ParsedCsvData): string {
    const analytics = generateAnalytics(data);
    const now = new Date();
    
    let report = `# 💡 التوصيات الاستراتيجية\n\n`;
    report += `> تم إنشاؤه في: ${now.toLocaleString('ar-SA')}\n\n`;
    
    const recommendations: { category: string; priority: string; recommendation: string; impact: string }[] = [];
    
    // 1. Revenue Analysis
    const profitMargin = analytics.summary.totalRevenue > 0 
        ? (analytics.summary.netProfit / analytics.summary.totalRevenue * 100) 
        : 0;
    
    if (profitMargin < 15) {
        recommendations.push({
            category: '💰 الربحية',
            priority: '🔴 عاجل',
            recommendation: 'هامش الربح أقل من 15%. راجع أسعار المنتجات وقلل التكاليف.',
            impact: 'زيادة الربح بنسبة 10-20%'
        });
    } else if (profitMargin < 30) {
        recommendations.push({
            category: '💰 الربحية',
            priority: '🟡 متوسط',
            recommendation: 'هامش ربح جيد. ابحث عن فرص لتحسينه أكثر.',
            impact: 'زيادة الربح بنسبة 5-10%'
        });
    } else {
        recommendations.push({
            category: '💰 الربحية',
            priority: '🟢 منخفض',
            recommendation: 'هامش ربح ممتاز! فكر في إعادة الاستثمار أو التوسع.',
            impact: 'نمو الأعمال'
        });
    }
    
    // 2. Hourly Optimization
    const peakHours = analytics.patterns.salesByHour
        .map((sales, hour) => ({ hour, sales }))
        .filter(h => h.sales > 0)
        .sort((a, b) => b.sales - a.sales);
    
    if (peakHours.length > 0) {
        const peak = peakHours[0];
        recommendations.push({
            category: '⏰ ساعات العمل',
            priority: '🟡 متوسط',
            recommendation: `ذروة المبيعات الساعة ${peak.hour}:00. ركز الموظفين في هذا الوقت.`,
            impact: 'تحسين الخدمة وزيادة المبيعات'
        });
        
        // Low hours
        const lowHours = peakHours.filter(h => h.sales < mean(peakHours.map(p => p.sales)) * 0.5);
        if (lowHours.length > 0) {
            recommendations.push({
                category: '⏰ ساعات العمل',
                priority: '🟡 متوسط',
                recommendation: `ساعات ضعيفة: ${lowHours.map(h => h.hour + ':00').join(', ')}. فكر في عروض خاصة.`,
                impact: 'زيادة المبيعات في الأوقات الهادئة'
            });
        }
    }
    
    // 3. Staff Optimization
    const staffCostRatio = analytics.summary.totalRevenue > 0 
        ? (analytics.summary.totalSalaries / analytics.summary.totalRevenue * 100) 
        : 0;
    
    if (staffCostRatio > 35) {
        recommendations.push({
            category: '👥 الموظفين',
            priority: '🔴 عاجل',
            recommendation: `تكلفة الرواتب ${staffCostRatio.toFixed(1)}% من الإيرادات. راجع الكفاءة.`,
            impact: 'توفير 10-15% من التكاليف'
        });
    } else if (staffCostRatio > 25) {
        recommendations.push({
            category: '👥 الموظفين',
            priority: '🟡 متوسط',
            recommendation: 'تكلفة موظفين معتدلة. راقب الكفاءة باستمرار.',
            impact: 'الحفاظ على التوازن'
        });
    }
    
    // 4. Table Analysis
    if (analytics.tables.length > 0) {
        const topTable = analytics.tables[0];
        const avgPerTable = analytics.summary.totalOrders / analytics.tables.length;
        
        if (topTable.count > avgPerTable * 2) {
            recommendations.push({
                category: '🪑 الطاولات',
                priority: '🟢 فرصة',
                recommendation: `الطاولة "${topTable.table}" الأكثر ربحية. فكر في إضافة طاولات مماثلة.`,
                impact: 'زيادة السعة وال الإيرادات'
            });
        }
    }
    
    // 5. Expense Optimization
    if (analytics.expenses.length > 0) {
        const topExpense = analytics.expenses[0];
        const expenseRatio = analytics.summary.totalRevenue > 0 
            ? (topExpense.amount / analytics.summary.totalRevenue * 100) 
            : 0;
        
        if (expenseRatio > 20) {
            recommendations.push({
                category: '💸 المصروفات',
                priority: '🟡 متوسط',
                recommendation: `"${topExpense.category}" يشكل ${expenseRatio.toFixed(1)}% من الإيرادات. ابحث عن بدائل أرخص.`,
                impact: 'توفير 5-10% من التكاليف'
            });
        }
    }
    
    // Output table
    report += `| الفئة | الأولوية | التوصية | الأثر المتوقع |\n`;
    report += `|-------|----------|---------|---------------|\n`;
    
    recommendations.forEach(r => {
        report += `| ${r.category} | ${r.priority} | ${r.recommendation} | ${r.impact} |\n`;
    });
    
    report += `\n---\n`;
    report += `*إجمالي التوصيات: ${recommendations.length}*\n`;
    
    return report;
}
