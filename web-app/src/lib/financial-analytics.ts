/**
 * Financial Analytics Engine
 * Implements the complete BI data model for cafe management
 * fact_inflow_sales, fact_outflow, fact_payroll, fact_waste
 */

// ================== TYPE DEFINITIONS ==================

export interface FactInflowSales {
    date: string;
    shiftNo: number;
    grossSales: number;
    netSales: number;
    discounts: number;
    refunds: number;
    cashSales: number;
    cardSales: number;
    ordersCount: number;
}

export interface FactOutflow {
    date: string;
    outflowType: 'EXPENSE' | 'PAYROLL' | 'WASTE';
    category: string;
    subcategory: string;
    vendor: string | null;
    paidBy: string | null;
    amount: number;
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
    receiptFlag: boolean;
    rawDescription: string;
}

export interface FactPayroll {
    payMonth: string;
    employeeName: string;
    role: string;
    payrollType: 'SALARY' | 'ADVANCE' | 'BONUS' | 'DEDUCTION' | 'OVERTIME';
    amount: number;
    paymentMethod: string;
    note: string;
}

export interface FactWaste {
    datetime: string;
    inventoryItem: string;
    qty: number;
    unitCost: number;
    estimatedValue: number;
    note: string;
}

export interface Alert {
    type: 'danger' | 'warning' | 'info';
    code: string;
    message: string;
    details?: string;
    date?: string;
}

export interface FinancialKPIs {
    revenue: number;
    totalOutflow: number;
    netProfit: number;
    burnRate: number;
    expenseRatio: number;
    payrollRatio: number;
    wasteRatio: number;
    runway: number;
    cashBalance: number;
    ordersCount: number;
    avgOrderValue: number;
    cashVsCard: { cash: number; card: number };
}

export interface AnalyticsData {
    inflow: FactInflowSales[];
    outflow: FactOutflow[];
    payroll: FactPayroll[];
    waste: FactWaste[];
    kpis: FinancialKPIs;
    alerts: Alert[];
    period: { from: string; to: string };
}

// ================== FEATURE ENGINEERING ==================

/**
 * Extract "paid_by" from Arabic text using regex
 * Pattern: بيد + name
 */
export function extractPaidBy(description: string): string | null {
    if (!description) return null;
    
    // Pattern: بيد followed by name
    const patterns = [
        /بيد\s+([^\s\/\+\-]+)/,
        /مستلم\s+([^\s\/\+\-]+)/,
        /استلم\s+([^\s\/\+\-]+)/,
        /صرف\s+([^\s\/\+\-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return null;
}

/**
 * Detect vendor from Arabic text
 */
export function extractVendor(description: string): string | null {
    if (!description) return null;
    
    // Known vendor keywords
    const vendorKeywords = [
        'شركة', 'ماركت', 'مطبعة', 'مصور', 'طلبات',
        'لافندر', 'العالمي', 'وفر', 'راشد'
    ];
    
    for (const keyword of vendorKeywords) {
        if (description.includes(keyword)) {
            // Try to extract full vendor name
            const regex = new RegExp(`(شركة\\s+[^\\s]+|${keyword}[^\\s]*)`);
            const match = description.match(regex);
            if (match) return match[1];
            return keyword;
        }
    }
    
    return null;
}

/**
 * Classify expense category from description
 */
export function classifyCategory(description: string, originalCategory: string): { category: string; subcategory: string } {
    const desc = description?.toLowerCase() || '';
    const origCat = originalCategory?.toLowerCase() || '';
    
    // Payroll detection - override category if needed
    if (desc.includes('راتب') || desc.includes('سلفة') || desc.includes('تكمله راتب') || desc.includes('رواتب')) {
        return { category: 'Payroll', subcategory: 'Salary' };
    }
    
    // Gas/Utilities
    if (desc.includes('غاز') || desc.includes('قناني')) {
        return { category: 'Utilities', subcategory: 'Gas' };
    }
    
    // Water
    if (desc.includes('ماء') || desc.includes('مياه')) {
        return { category: 'Utilities', subcategory: 'Water' };
    }
    
    // Maintenance
    if (desc.includes('صيانه') || desc.includes('صيانة') || desc.includes('تصليح')) {
        return { category: 'Maintenance', subcategory: 'Repair' };
    }
    
    // Supplies - Food
    if (desc.includes('جبنه') || desc.includes('سكر') || desc.includes('حليب') || desc.includes('قهوة')) {
        return { category: 'Supplies', subcategory: 'Food' };
    }
    
    // Delivery
    if (desc.includes('توصيل') || desc.includes('نقل')) {
        return { category: 'Logistics', subcategory: 'Delivery' };
    }
    
    // Printing/Marketing
    if (desc.includes('مطبعه') || desc.includes('مطبعة') || desc.includes('طباعة')) {
        return { category: 'Marketing', subcategory: 'Printing' };
    }
    
    // Equipment
    if (desc.includes('اكسسوارات') || desc.includes('ماك') || desc.includes('معدات')) {
        return { category: 'Equipment', subcategory: 'Accessories' };
    }
    
    // Default to original or Supplies
    return { 
        category: originalCategory || 'مستلزمات', 
        subcategory: 'General' 
    };
}

/**
 * Detect payroll type from description
 */
export function classifyPayrollType(description: string): 'SALARY' | 'ADVANCE' | 'BONUS' | 'DEDUCTION' | 'OVERTIME' {
    const desc = description?.toLowerCase() || '';
    
    if (desc.includes('سلفة') || desc.includes('سلف')) return 'ADVANCE';
    if (desc.includes('مكافأة') || desc.includes('بونص')) return 'BONUS';
    if (desc.includes('خصم') || desc.includes('حسم')) return 'DEDUCTION';
    if (desc.includes('اضافي') || desc.includes('overtime')) return 'OVERTIME';
    
    return 'SALARY';
}

// ================== DATA TRANSFORMATION ==================

import { ParsedCsvData, CsvOrder, CsvDailyReceipt, CsvExpense, CsvStaff } from './csv-parser';

/**
 * Transform parsed CSV data into analytics facts
 */
export function transformToAnalytics(data: ParsedCsvData, dateFrom?: Date, dateTo?: Date): AnalyticsData {
    const now = new Date();
    const from = dateFrom || new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateTo || now;
    
    // ========== FACT_INFLOW_SALES ==========
    const inflowMap = new Map<string, FactInflowSales>();
    
    // From DailyReceipts
    data.dailyReceipts.forEach(receipt => {
        const dateStr = receipt.date.toISOString().split('T')[0];
        const existing = inflowMap.get(dateStr) || {
            date: dateStr,
            shiftNo: receipt.shiftNumber,
            grossSales: 0,
            netSales: 0,
            discounts: 0,
            refunds: 0,
            cashSales: 0,
            cardSales: 0,
            ordersCount: 0
        };
        
        existing.grossSales += receipt.totalSales;
        existing.netSales += receipt.totalSales;
        // Assume 70% cash, 30% card (adjust based on actual data)
        existing.cashSales += receipt.totalSales * 0.7;
        existing.cardSales += receipt.totalSales * 0.3;
        
        inflowMap.set(dateStr, existing);
    });
    
    // Add orders count from Orders
    data.orders.forEach(order => {
        const dateStr = order.createdAt.toISOString().split('T')[0];
        const existing = inflowMap.get(dateStr);
        if (existing) {
            existing.ordersCount++;
            existing.discounts += order.discount;
        } else {
            inflowMap.set(dateStr, {
                date: dateStr,
                shiftNo: 1,
                grossSales: order.totalAmount,
                netSales: order.totalAmount - order.discount,
                discounts: order.discount,
                refunds: 0,
                cashSales: order.totalAmount * 0.7,
                cardSales: order.totalAmount * 0.3,
                ordersCount: 1
            });
        }
    });
    
    const inflow = Array.from(inflowMap.values())
        .filter(i => {
            const d = new Date(i.date);
            return d >= from && d <= to;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    
    // ========== FACT_OUTFLOW ==========
    const outflow: FactOutflow[] = data.expenses
        .filter(e => e.date >= from && e.date <= to)
        .map(expense => {
            const { category, subcategory } = classifyCategory(expense.description, expense.category);
            const paidBy = extractPaidBy(expense.description);
            const vendor = extractVendor(expense.description);
            
            // Determine outflow type
            let outflowType: 'EXPENSE' | 'PAYROLL' | 'WASTE' = 'EXPENSE';
            if (category === 'Payroll' || expense.description.includes('راتب') || expense.description.includes('سلفة')) {
                outflowType = 'PAYROLL';
            }
            if (expense.description.includes('هدر') || expense.description.includes('تالف')) {
                outflowType = 'WASTE';
            }
            
            return {
                date: expense.date.toISOString().split('T')[0],
                outflowType,
                category,
                subcategory,
                vendor,
                paidBy,
                amount: expense.amount,
                paymentMethod: 'CASH' as const,
                receiptFlag: !!expense.receiptNumber,
                rawDescription: expense.description
            };
        });
    
    // ========== FACT_PAYROLL ==========
    const payroll: FactPayroll[] = data.staff
        .filter(s => s.salary > 0)
        .map(staff => ({
            payMonth: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
            employeeName: staff.name,
            role: staff.role,
            payrollType: 'SALARY' as const,
            amount: staff.salary,
            paymentMethod: 'CASH',
            note: `راتب ${staff.name}`
        }));
    
    // Add payroll from expenses (detected via description)
    outflow
        .filter(o => o.outflowType === 'PAYROLL')
        .forEach(o => {
            payroll.push({
                payMonth: o.date.substring(0, 7) + '-01',
                employeeName: o.paidBy || 'غير محدد',
                role: 'Unknown',
                payrollType: classifyPayrollType(o.rawDescription),
                amount: o.amount,
                paymentMethod: o.paymentMethod,
                note: o.rawDescription
            });
        });
    
    // ========== FACT_WASTE ==========
    const waste: FactWaste[] = outflow
        .filter(o => o.outflowType === 'WASTE')
        .map(o => ({
            datetime: o.date + 'T00:00:00',
            inventoryItem: o.subcategory || 'Unknown',
            qty: -1,
            unitCost: o.amount,
            estimatedValue: o.amount,
            note: o.rawDescription
        }));
    
    // ========== CALCULATE KPIs ==========
    const revenue = inflow.reduce((sum, i) => sum + i.netSales, 0);
    const totalExpenses = outflow.filter(o => o.outflowType === 'EXPENSE').reduce((sum, o) => sum + o.amount, 0);
    const totalPayroll = payroll.reduce((sum, p) => sum + p.amount, 0);
    const totalWaste = waste.reduce((sum, w) => sum + w.estimatedValue, 0);
    const totalOutflow = totalExpenses + totalPayroll + totalWaste;
    const netProfit = revenue - totalOutflow;
    
    // Burn rate (last 7 days average)
    const last7Days = outflow
        .filter(o => {
            const d = new Date(o.date);
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return d >= weekAgo;
        })
        .reduce((sum, o) => sum + o.amount, 0) / 7;
    
    const ordersCount = inflow.reduce((sum, i) => sum + i.ordersCount, 0);
    const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;
    const cashTotal = inflow.reduce((sum, i) => sum + i.cashSales, 0);
    const cardTotal = inflow.reduce((sum, i) => sum + i.cardSales, 0);
    
    const kpis: FinancialKPIs = {
        revenue,
        totalOutflow,
        netProfit,
        burnRate: last7Days,
        expenseRatio: revenue > 0 ? (totalExpenses / revenue) * 100 : 0,
        payrollRatio: revenue > 0 ? (totalPayroll / revenue) * 100 : 0,
        wasteRatio: revenue > 0 ? (totalWaste / revenue) * 100 : 0,
        runway: last7Days > 0 ? netProfit / last7Days : 0,
        cashBalance: netProfit,
        ordersCount,
        avgOrderValue,
        cashVsCard: { cash: cashTotal, card: cardTotal }
    };
    
    // ========== GENERATE ALERTS ==========
    const alerts: Alert[] = [];
    
    // Alert: Zero sales with spending
    inflow.forEach(day => {
        if (day.netSales === 0) {
            const dayOutflow = outflow.filter(o => o.date === day.date).reduce((s, o) => s + o.amount, 0);
            if (dayOutflow > 0) {
                alerts.push({
                    type: 'danger',
                    code: 'ZERO_SALES_WITH_SPEND',
                    message: `⚠️ يوم ${day.date}: مصروفات ${formatCurrency(dayOutflow)} بدون مبيعات!`,
                    date: day.date
                });
            }
        }
    });
    
    // Alert: Expense spike (> 1.5x average)
    const avgDailyOutflow = totalOutflow / Math.max(outflow.length, 1);
    const dailyOutflows = new Map<string, number>();
    outflow.forEach(o => {
        dailyOutflows.set(o.date, (dailyOutflows.get(o.date) || 0) + o.amount);
    });
    
    dailyOutflows.forEach((amount, date) => {
        if (amount > avgDailyOutflow * 1.5 && avgDailyOutflow > 0) {
            alerts.push({
                type: 'warning',
                code: 'EXPENSE_SPIKE',
                message: `📈 ارتفاع مصروفات يوم ${date}: ${formatCurrency(amount)} (أعلى من المتوسط بـ ${((amount / avgDailyOutflow - 1) * 100).toFixed(0)}%)`,
                date
            });
        }
    });
    
    // Alert: High expense ratio
    if (kpis.expenseRatio > 60) {
        alerts.push({
            type: 'danger',
            code: 'HIGH_EXPENSE_RATIO',
            message: `🚨 نسبة المصروفات مرتفعة جداً: ${kpis.expenseRatio.toFixed(1)}% (يجب أن تكون أقل من 60%)`
        });
    }
    
    // Alert: High payroll ratio
    if (kpis.payrollRatio > 35) {
        alerts.push({
            type: 'warning',
            code: 'HIGH_PAYROLL_RATIO',
            message: `💰 نسبة الرواتب مرتفعة: ${kpis.payrollRatio.toFixed(1)}% (يجب أن تكون أقل من 35%)`
        });
    }
    
    // Alert: Negative profit
    if (netProfit < 0) {
        alerts.push({
            type: 'danger',
            code: 'NEGATIVE_PROFIT',
            message: `📉 خسارة مالية: ${formatCurrency(Math.abs(netProfit))}`
        });
    }
    
    // Alert: New/unusual vendors
    const vendorCounts = new Map<string, number>();
    outflow.forEach(o => {
        if (o.vendor) {
            vendorCounts.set(o.vendor, (vendorCounts.get(o.vendor) || 0) + 1);
        }
    });
    
    vendorCounts.forEach((count, vendor) => {
        if (count === 1) {
            const amount = outflow.filter(o => o.vendor === vendor).reduce((s, o) => s + o.amount, 0);
            if (amount > 100000) {
                alerts.push({
                    type: 'info',
                    code: 'NEW_VENDOR',
                    message: `🆕 مورد جديد: ${vendor} - ${formatCurrency(amount)}`
                });
            }
        }
    });
    
    return {
        inflow,
        outflow,
        payroll,
        waste,
        kpis,
        alerts,
        period: {
            from: from.toISOString().split('T')[0],
            to: to.toISOString().split('T')[0]
        }
    };
}

// ================== AGGREGATION HELPERS ==================

export function aggregateByCategory(outflow: FactOutflow[]): { category: string; amount: number; percentage: number }[] {
    const totals = new Map<string, number>();
    outflow.forEach(o => {
        totals.set(o.category, (totals.get(o.category) || 0) + o.amount);
    });
    
    const total = Array.from(totals.values()).reduce((s, v) => s + v, 0);
    
    return Array.from(totals.entries())
        .map(([category, amount]) => ({
            category,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);
}

export function aggregateBySubcategory(outflow: FactOutflow[]): { subcategory: string; amount: number }[] {
    const totals = new Map<string, number>();
    outflow.forEach(o => {
        totals.set(o.subcategory, (totals.get(o.subcategory) || 0) + o.amount);
    });
    
    return Array.from(totals.entries())
        .map(([subcategory, amount]) => ({ subcategory, amount }))
        .sort((a, b) => b.amount - a.amount);
}

export function aggregateByVendor(outflow: FactOutflow[]): { vendor: string; amount: number; count: number }[] {
    const totals = new Map<string, { amount: number; count: number }>();
    outflow.forEach(o => {
        const vendor = o.vendor || 'غير محدد';
        const existing = totals.get(vendor) || { amount: 0, count: 0 };
        existing.amount += o.amount;
        existing.count++;
        totals.set(vendor, existing);
    });
    
    return Array.from(totals.entries())
        .map(([vendor, data]) => ({ vendor, ...data }))
        .sort((a, b) => b.amount - a.amount);
}

export function aggregateByPaidBy(outflow: FactOutflow[]): { paidBy: string; amount: number; count: number }[] {
    const totals = new Map<string, { amount: number; count: number }>();
    outflow.forEach(o => {
        const paidBy = o.paidBy || 'غير محدد';
        const existing = totals.get(paidBy) || { amount: 0, count: 0 };
        existing.amount += o.amount;
        existing.count++;
        totals.set(paidBy, existing);
    });
    
    return Array.from(totals.entries())
        .map(([paidBy, data]) => ({ paidBy, ...data }))
        .sort((a, b) => b.amount - a.amount);
}

export function aggregatePayrollByEmployee(payroll: FactPayroll[]): { employee: string; role: string; total: number; breakdown: { type: string; amount: number }[] }[] {
    const employees = new Map<string, { role: string; items: FactPayroll[] }>();
    
    payroll.forEach(p => {
        const existing = employees.get(p.employeeName) || { role: p.role, items: [] };
        existing.items.push(p);
        employees.set(p.employeeName, existing);
    });
    
    return Array.from(employees.entries())
        .map(([employee, data]) => ({
            employee,
            role: data.role,
            total: data.items.reduce((s, i) => s + i.amount, 0),
            breakdown: data.items.map(i => ({ type: i.payrollType, amount: i.amount }))
        }))
        .sort((a, b) => b.total - a.total);
}

export function getDailyTrend(inflow: FactInflowSales[], outflow: FactOutflow[]): { date: string; revenue: number; expenses: number; profit: number }[] {
    const dates = new Set<string>();
    inflow.forEach(i => dates.add(i.date));
    outflow.forEach(o => dates.add(o.date));
    
    return Array.from(dates)
        .sort()
        .map(date => {
            const revenue = inflow.filter(i => i.date === date).reduce((s, i) => s + i.netSales, 0);
            const expenses = outflow.filter(o => o.date === date).reduce((s, o) => s + o.amount, 0);
            return {
                date,
                revenue,
                expenses,
                profit: revenue - expenses
            };
        });
}

// ================== FORMATTING HELPERS ==================

function formatCurrency(num: number): string {
    return new Intl.NumberFormat('ar-IQ', { 
        style: 'currency', 
        currency: 'IQD', 
        maximumFractionDigits: 0 
    }).format(num);
}

export { formatCurrency };
