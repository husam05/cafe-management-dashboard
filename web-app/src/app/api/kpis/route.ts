/**
 * KPI API Route - Financial Dashboard Metrics
 * Provides real-time KPIs for cafe management
 */

import { NextResponse } from "next/server";
import { loadCsvData, generateCsvAnalytics } from "@/lib/csv-ai-insights";

// Format date to YYYY-MM-DD
function toDateString(d: Date): string {
    return d.toISOString().split('T')[0];
}

// Get date range helper
function getDateRange(from: string | null, to: string | null) {
    const today = new Date();
    const fromDate = from ? new Date(from) : today;
    const toDate = to ? new Date(to) : today;
    return { from: fromDate, to: toDate };
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const fromStr = url.searchParams.get("from");
        const toStr = url.searchParams.get("to");
        const period = url.searchParams.get("period") || "today"; // today, week, month, year
        
        // Calculate date range based on period
        const today = new Date();
        let from: Date, to: Date;
        
        if (fromStr && toStr) {
            from = new Date(fromStr);
            to = new Date(toStr);
        } else {
            to = today;
            switch (period) {
                case "week":
                    from = new Date(today);
                    from.setDate(from.getDate() - 7);
                    break;
                case "month":
                    from = new Date(today);
                    from.setMonth(from.getMonth() - 1);
                    break;
                case "year":
                    from = new Date(today);
                    from.setFullYear(from.getFullYear() - 1);
                    break;
                default: // today
                    from = today;
            }
        }
        
        const fromStr2 = toDateString(from);
        const toStr2 = toDateString(to);
        
        // Load CSV data
        const csvData = await loadCsvData();
        
        if (!csvData) {
            return NextResponse.json({
                error: "Failed to load data",
                range: { from: fromStr2, to: toStr2 }
            }, { status: 500 });
        }
        
        // Filter data by date range
        const filteredOrders = csvData.orders.filter(o => {
            const orderDate = toDateString(o.createdAt);
            return orderDate >= fromStr2 && orderDate <= toStr2;
        });
        
        const filteredReceipts = csvData.dailyReceipts.filter(r => {
            const receiptDate = toDateString(r.date);
            return receiptDate >= fromStr2 && receiptDate <= toStr2;
        });
        
        const filteredExpenses = csvData.expenses.filter(e => {
            const expenseDate = toDateString(e.date);
            return expenseDate >= fromStr2 && expenseDate <= toStr2;
        });
        
        // Calculate KPIs
        // Revenue from orders
        const orderRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        // Revenue from daily receipts (more accurate if available)
        const receiptRevenue = filteredReceipts.reduce((sum, r) => sum + r.totalSales, 0);
        
        // Use the higher value (receipts are usually more accurate)
        const revenue = Math.max(orderRevenue, receiptRevenue);
        
        // Expenses
        const expenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Expenses by category
        const expensesByCategory: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
        });
        
        // Payroll (from staff salaries - monthly)
        const totalMonthlySalaries = csvData.staff.reduce((sum, s) => sum + s.salary, 0);
        
        // Calculate daily payroll based on period
        const daysDiff = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
        const payrollForPeriod = (totalMonthlySalaries / 30) * daysDiff;
        
        // Net Profit
        const netProfit = revenue - expenses - payrollForPeriod;
        
        // Ratios
        const expenseRatio = revenue > 0 ? expenses / revenue : null;
        const salaryRatio = revenue > 0 ? payrollForPeriod / revenue : null;
        const profitMargin = revenue > 0 ? netProfit / revenue : null;
        
        // Order metrics
        const orderCount = filteredOrders.length;
        const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
        
        // Daily breakdown
        const dailyBreakdown: Record<string, { revenue: number; expenses: number; orders: number }> = {};
        
        filteredOrders.forEach(o => {
            const date = toDateString(o.createdAt);
            if (!dailyBreakdown[date]) {
                dailyBreakdown[date] = { revenue: 0, expenses: 0, orders: 0 };
            }
            dailyBreakdown[date].revenue += o.totalAmount;
            dailyBreakdown[date].orders += 1;
        });
        
        filteredExpenses.forEach(e => {
            const date = toDateString(e.date);
            if (!dailyBreakdown[date]) {
                dailyBreakdown[date] = { revenue: 0, expenses: 0, orders: 0 };
            }
            dailyBreakdown[date].expenses += e.amount;
        });
        
        // Top tables
        const tableStats: Record<string, { count: number; total: number }> = {};
        filteredOrders.forEach(o => {
            const table = o.tableNumber || 'takeaway';
            if (!tableStats[table]) {
                tableStats[table] = { count: 0, total: 0 };
            }
            tableStats[table].count += 1;
            tableStats[table].total += o.totalAmount;
        });
        
        const topTables = Object.entries(tableStats)
            .map(([table, stats]) => ({ table, ...stats }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
        
        // Hourly distribution
        const hourlyStats: number[] = new Array(24).fill(0);
        filteredOrders.forEach(o => {
            const hour = o.createdAt.getHours();
            hourlyStats[hour] += o.totalAmount;
        });
        
        // Burn rate (expenses per day for last 7 days)
        const last7DaysExpenses = csvData.expenses.filter(e => {
            const expDate = e.date;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return expDate >= sevenDaysAgo;
        });
        const burnRate = last7DaysExpenses.reduce((sum, e) => sum + e.amount, 0) / 7;
        
        // Alerts
        const alerts: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];
        
        if (revenue === 0 && (expenses + payrollForPeriod) > 0) {
            alerts.push({
                type: 'danger',
                message: '⚠️ مصاريف موجودة لكن المبيعات صفر ضمن الفترة المحددة.'
            });
        }
        
        if (expenseRatio !== null && expenseRatio > 0.6) {
            alerts.push({
                type: 'danger',
                message: '🚨 نسبة المصاريف عالية جداً (>60%).'
            });
        }
        
        if (salaryRatio !== null && salaryRatio > 0.35) {
            alerts.push({
                type: 'warning',
                message: '🚨 نسبة الرواتب عالية (>35%).'
            });
        }
        
        if (profitMargin !== null && profitMargin < 0.1) {
            alerts.push({
                type: 'warning',
                message: '📉 هامش الربح منخفض (<10%).'
            });
        }
        
        if (netProfit < 0) {
            alerts.push({
                type: 'danger',
                message: '🔴 خسارة! المصاريف تتجاوز الإيرادات.'
            });
        }
        
        // Today vs Yesterday comparison
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toDateString(yesterday);
        const todayStr = toDateString(today);
        
        const todayRevenue = csvData.orders
            .filter(o => toDateString(o.createdAt) === todayStr)
            .reduce((sum, o) => sum + o.totalAmount, 0);
        
        const yesterdayRevenue = csvData.orders
            .filter(o => toDateString(o.createdAt) === yesterdayStr)
            .reduce((sum, o) => sum + o.totalAmount, 0);
        
        const revenueChange = yesterdayRevenue > 0 
            ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
            : 0;
        
        // Staff summary
        const staffByRole: Record<string, { count: number; totalSalary: number }> = {};
        csvData.staff.forEach(s => {
            if (!staffByRole[s.role]) {
                staffByRole[s.role] = { count: 0, totalSalary: 0 };
            }
            staffByRole[s.role].count += 1;
            staffByRole[s.role].totalSalary += s.salary;
        });

        return NextResponse.json({
            range: { from: fromStr2, to: toStr2, period },
            
            // Main KPIs
            revenue,
            expenses,
            payroll: payrollForPeriod,
            cogs: 0, // TODO: implement COGS from recipes
            netProfit,
            
            // Ratios (as percentages)
            ratios: {
                expenseRatio: expenseRatio !== null ? (expenseRatio * 100).toFixed(1) : null,
                salaryRatio: salaryRatio !== null ? (salaryRatio * 100).toFixed(1) : null,
                profitMargin: profitMargin !== null ? (profitMargin * 100).toFixed(1) : null,
            },
            
            // Order metrics
            orders: {
                count: orderCount,
                avgTicket,
            },
            
            // Comparisons
            comparison: {
                todayRevenue,
                yesterdayRevenue,
                changePercent: revenueChange.toFixed(1),
                trend: revenueChange >= 0 ? 'up' : 'down'
            },
            
            // Burn rate
            burnRate,
            
            // Breakdowns
            expensesByCategory: Object.entries(expensesByCategory)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount),
            
            topTables,
            
            hourlyDistribution: hourlyStats.map((amount, hour) => ({
                hour: `${hour}:00`,
                amount
            })).filter(h => h.amount > 0),
            
            dailyBreakdown: Object.entries(dailyBreakdown)
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date)),
            
            // Staff
            staff: {
                total: csvData.staff.length,
                totalSalaries: totalMonthlySalaries,
                byRole: Object.entries(staffByRole)
                    .map(([role, data]) => ({ role, ...data }))
            },
            
            // Alerts
            alerts,
            
            // Meta
            dataSource: {
                orders: csvData.orders.length,
                receipts: csvData.dailyReceipts.length,
                expenses: csvData.expenses.length,
                staff: csvData.staff.length
            }
        });
        
    } catch (error) {
        console.error('KPI API Error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate KPIs' },
            { status: 500 }
        );
    }
}
