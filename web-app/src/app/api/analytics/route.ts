/**
 * Financial Analytics API
 * Provides comprehensive financial data for owner dashboard
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCsvData } from '@/lib/csv-parser';
import { 
    transformToAnalytics, 
    aggregateByCategory,
    aggregateBySubcategory,
    aggregateByVendor,
    aggregateByPaidBy,
    aggregatePayrollByEmployee,
    getDailyTrend,
    type FactOutflow,
    type FactPayroll,
    type FactWaste
} from '@/lib/financial-analytics';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

async function loadCsvData() {
    try {
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

function aggregatePayrollByType(payroll: FactPayroll[]) {
    const typeMap = new Map<string, { type: string; amount: number; count: number }>();
    
    for (const p of payroll) {
        const key = p.payrollType.toLowerCase();
        const existing = typeMap.get(key) || { type: key, amount: 0, count: 0 };
        existing.amount += p.amount;
        existing.count += 1;
        typeMap.set(key, existing);
    }
    
    const total = payroll.reduce((s, p) => s + p.amount, 0);
    return Array.from(typeMap.values())
        .map(t => ({ ...t, percentage: total > 0 ? (t.amount / total) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount);
}

function aggregatePayrollMonthly(payroll: FactPayroll[]) {
    const monthMap = new Map<string, number>();
    
    for (const p of payroll) {
        const month = p.payMonth || 'Unknown';
        monthMap.set(month, (monthMap.get(month) || 0) + p.amount);
    }
    
    return Array.from(monthMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

function aggregateWasteByItem(waste: FactWaste[]) {
    const itemMap = new Map<string, { item: string; amount: number; count: number }>();
    
    for (const w of waste) {
        const item = w.inventoryItem || 'غير محدد';
        const existing = itemMap.get(item) || { item, amount: 0, count: 0 };
        existing.amount += w.estimatedValue;
        existing.count += 1;
        itemMap.set(item, existing);
    }
    
    return Array.from(itemMap.values()).sort((a, b) => b.amount - a.amount);
}

function getWasteTrend(waste: FactWaste[]) {
    const dayMap = new Map<string, number>();
    
    for (const w of waste) {
        const date = w.datetime.split(' ')[0];
        dayMap.set(date, (dayMap.get(date) || 0) + w.estimatedValue);
    }
    
    return Array.from(dayMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const period = url.searchParams.get('period') || 'month';
        const view = url.searchParams.get('view') || 'overview';
        
        // Calculate date range
        const now = new Date();
        let from: Date;
        const to = now;
        
        switch (period) {
            case 'today':
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                from = new Date(now);
                from.setDate(from.getDate() - 7);
                break;
            case 'month':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                from = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                from = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        // Load data
        const csvData = await loadCsvData();
        if (!csvData) {
            return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
        }
        
        // Transform to analytics
        const analytics = transformToAnalytics(csvData, from, to);
        
        // Base response
        const baseResponse = {
            period: analytics.period,
            alerts: analytics.alerts.filter(a => a.code.startsWith(view.toUpperCase()) || view === 'overview'),
            dataSource: {
                orders: csvData.orders.length,
                receipts: csvData.dailyReceipts.length,
                expenses: csvData.expenses.length,
                staff: csvData.staff.length
            }
        };
        
        switch (view) {
            case 'overview':
                return NextResponse.json({
                    ...baseResponse,
                    kpis: analytics.kpis,
                    trend: getDailyTrend(analytics.inflow, analytics.outflow).slice(-14),
                    outflowByCategory: aggregateByCategory(analytics.outflow).slice(0, 6),
                    topVendors: aggregateByVendor(analytics.outflow).slice(0, 5),
                    cashVsCard: analytics.kpis.cashVsCard
                });
                
            case 'outflow':
                // Filter out payroll from outflow for dedicated expense view
                const expenseOutflow = analytics.outflow.filter(o => o.outflowType === 'EXPENSE');
                return NextResponse.json({
                    ...baseResponse,
                    kpis: {
                        totalOutflow: analytics.kpis.totalOutflow,
                        expenseRatio: analytics.kpis.expenseRatio
                    },
                    byCategory: aggregateByCategory(expenseOutflow),
                    bySubcategory: aggregateBySubcategory(expenseOutflow),
                    byVendor: aggregateByVendor(analytics.outflow),
                    byPaidBy: aggregateByPaidBy(analytics.outflow),
                    transactions: analytics.outflow.slice(0, 100).map(o => ({
                        date: o.date,
                        description: o.rawDescription,
                        category: o.category,
                        subcategory: o.subcategory,
                        amount: o.amount,
                        paidBy: o.paidBy || 'غير محدد',
                        vendor: o.vendor
                    }))
                });
                
            case 'payroll':
                const payrollTotal = analytics.payroll.reduce((s, p) => s + p.amount, 0);
                const uniqueEmployees = new Set(analytics.payroll.map(p => p.employeeName)).size;
                return NextResponse.json({
                    ...baseResponse,
                    kpis: {
                        totalPayroll: payrollTotal,
                        payrollRatio: analytics.kpis.payrollRatio,
                        employeeCount: uniqueEmployees,
                        avgSalary: uniqueEmployees > 0 ? payrollTotal / uniqueEmployees : 0
                    },
                    byEmployee: analytics.payroll.map(p => ({
                        employee: p.employeeName,
                        amount: p.amount,
                        count: 1,
                        type: p.payrollType.toLowerCase()
                    })),
                    byType: aggregatePayrollByType(analytics.payroll),
                    monthly: aggregatePayrollMonthly(analytics.payroll),
                    transactions: analytics.payroll.map(p => ({
                        date: p.payMonth,
                        description: p.note,
                        employee: p.employeeName,
                        type: p.payrollType.toLowerCase(),
                        amount: p.amount
                    }))
                });
                
            case 'waste':
                const wasteTotal = analytics.waste.reduce((s, w) => s + w.estimatedValue, 0);
                return NextResponse.json({
                    ...baseResponse,
                    kpis: {
                        totalWaste: wasteTotal,
                        wasteRatio: analytics.kpis.wasteRatio,
                        wasteEventsCount: analytics.waste.length
                    },
                    byItem: aggregateWasteByItem(analytics.waste),
                    trend: getWasteTrend(analytics.waste),
                    events: analytics.waste.map(w => ({
                        date: w.datetime,
                        description: w.note,
                        item: w.inventoryItem,
                        quantity: w.qty,
                        amount: w.estimatedValue
                    }))
                });
                
            case 'sales':
                return NextResponse.json({
                    ...baseResponse,
                    kpis: {
                        revenue: analytics.kpis.revenue,
                        ordersCount: analytics.kpis.ordersCount,
                        avgOrderValue: analytics.kpis.avgOrderValue,
                        cashVsCard: analytics.kpis.cashVsCard
                    },
                    dailySales: analytics.inflow,
                    trend: getDailyTrend(analytics.inflow, analytics.outflow)
                });
                
            default:
                return NextResponse.json({
                    ...baseResponse,
                    kpis: analytics.kpis
                });
        }
        
    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
