/**
 * CSV Parser for Cafe Management Data
 * Parses the combined cafe_management.csv file
 */

export interface ParsedCsvData {
    categories: CsvCategory[];
    dailyReceipts: CsvDailyReceipt[];
    expenses: CsvExpense[];
    orders: CsvOrder[];
    staff: CsvStaff[];
    menuItems: CsvMenuItem[];
}

export interface CsvCategory {
    id: number;
    name: string;
    description: string | null;
    displayOrder: number;
    imageUrl: string | null;
    isActive: boolean;
    isKitchen: boolean;
    createdAt: Date;
}

export interface CsvDailyReceipt {
    id: number;
    date: Date;
    shiftNumber: number;
    openingCash: number;
    totalSales: number;
    totalExpenses: number;
    closingCash: number;
    expectedCash: number;
    discrepancy: number;
    openedBy: number;
    closedBy: number | null;
    openedAt: Date | null;
    closedAt: Date | null;
    isClosed: boolean;
    notes: string | null;
    createdAt: Date;
}

export interface CsvExpense {
    id: number;
    date: Date;
    category: string;
    amount: number;
    description: string;
    receiptNumber: string | null;
    recordedBy: number;
    dailyReceiptId: number | null;
    createdAt: Date;
}

export interface CsvOrder {
    id: number;
    orderNumber: string;
    orderType: string;
    tableNumber: string | null;
    status: string;
    totalAmount: number;
    createdBy: number;
    discount: number;
    createdAt: Date;
    completedAt: Date | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
    notes: string | null;
}

export interface CsvStaff {
    id: number;
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    hireDate: Date;
    salary: number;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt: Date;
}

export interface CsvMenuItem {
    id: number;
    categoryId: number;
    name: string;
    description: string | null;
    basePrice: number;
    imageUrl: string | null;
    preparationTime: number;
    itemType: string;
    isInventoryItem: boolean;
    isAvailable: boolean;
    isActive: boolean;
    createdAt: Date;
}

// Parse a single CSV line, handling quoted fields
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result.map(val => val.trim());
}

// Parse value helpers
const parseNull = (val: string): string | null => 
    val === 'NULL' || val === '' ? null : val;

const parseFloat2 = (val: string): number => {
    if (val === 'NULL' || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

const parseInt2 = (val: string): number => {
    if (val === 'NULL' || val === '') return 0;
    const num = parseInt(val);
    return isNaN(num) ? 0 : num;
};

const parseDate2 = (val: string): Date | null => {
    if (val === 'NULL' || val === '') return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
};

const parseBool = (val: string): boolean => 
    val === '1' || val.toLowerCase() === 'true';

/**
 * Detect the row type based on its content pattern
 */
function detectRowType(fields: string[]): 'category' | 'dailyReceipt' | 'expense' | 'order' | 'staff' | 'menuItem' | 'unknown' {
    // Check for Order pattern: ORD-xxxxx in second field
    if (fields[1] && fields[1].startsWith('ORD-')) {
        return 'order';
    }
    
    // Staff pattern: has email with @ and password hash starting with $2a$
    if (fields[2] && fields[2].includes('@') && fields[4] && fields[4].startsWith('$2a$')) {
        return 'staff';
    }
    
    // DailyReceipt pattern: second field is a date (YYYY-MM-DD), has many numeric fields
    if (fields[1] && /^\d{4}-\d{2}-\d{2}$/.test(fields[1]) && fields.length >= 15) {
        return 'dailyReceipt';
    }
    
    // Expense pattern: second field is date, third is category text (Arabic), fourth is amount
    if (fields[1] && /^\d{4}-\d{2}-\d{2}$/.test(fields[1]) && fields.length >= 8 && fields.length < 15) {
        // Check if it looks like expense (has Arabic category name)
        const possibleCategory = fields[2];
        if (possibleCategory && !possibleCategory.startsWith('ORD-') && isNaN(parseFloat(possibleCategory))) {
            return 'expense';
        }
    }
    
    // Category pattern: Arabic name in second field, short record
    if (fields.length >= 7 && fields.length <= 8 && fields[1] && !fields[1].includes('@')) {
        // Check if second field looks like category name (Arabic text)
        const name = fields[1];
        if (name && /[\u0600-\u06FF]/.test(name)) {
            return 'category';
        }
    }
    
    return 'unknown';
}

/**
 * Parse the entire CSV file into structured data
 */
export function parseCsvData(csvContent: string): ParsedCsvData {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    const result: ParsedCsvData = {
        categories: [],
        dailyReceipts: [],
        expenses: [],
        orders: [],
        staff: [],
        menuItems: []
    };
    
    for (const line of lines) {
        const fields = parseCsvLine(line);
        const rowType = detectRowType(fields);
        
        try {
            switch (rowType) {
                case 'category':
                    result.categories.push({
                        id: parseInt2(fields[0]),
                        name: fields[1] || '',
                        description: parseNull(fields[2]),
                        displayOrder: parseInt2(fields[3]),
                        imageUrl: parseNull(fields[4]),
                        isActive: parseBool(fields[5]),
                        isKitchen: parseBool(fields[6]),
                        createdAt: parseDate2(fields[7]) || new Date()
                    });
                    break;
                    
                case 'dailyReceipt':
                    result.dailyReceipts.push({
                        id: parseInt2(fields[0]),
                        date: parseDate2(fields[1]) || new Date(),
                        shiftNumber: parseInt2(fields[2]),
                        openingCash: parseFloat2(fields[3]),
                        totalSales: parseFloat2(fields[4]),
                        totalExpenses: parseFloat2(fields[5]),
                        closingCash: parseFloat2(fields[6]),
                        expectedCash: parseFloat2(fields[7]),
                        discrepancy: parseFloat2(fields[8]),
                        openedBy: parseInt2(fields[9]),
                        closedBy: fields[10] && fields[10] !== 'NULL' ? parseInt2(fields[10]) : null,
                        openedAt: parseDate2(fields[11]),
                        closedAt: parseDate2(fields[12]),
                        isClosed: parseBool(fields[13]),
                        notes: parseNull(fields[14]),
                        createdAt: parseDate2(fields[15]) || new Date()
                    });
                    break;
                    
                case 'expense':
                    result.expenses.push({
                        id: parseInt2(fields[0]),
                        date: parseDate2(fields[1]) || new Date(),
                        category: fields[2] || '',
                        amount: parseFloat2(fields[3]),
                        description: fields[4] || '',
                        receiptNumber: parseNull(fields[5]),
                        recordedBy: parseInt2(fields[6]),
                        dailyReceiptId: fields[7] && fields[7] !== 'NULL' ? parseInt2(fields[7]) : null,
                        createdAt: parseDate2(fields[8]) || new Date()
                    });
                    break;
                    
                case 'order':
                    result.orders.push({
                        id: parseInt2(fields[0]),
                        orderNumber: fields[1] || '',
                        orderType: fields[2] || 'cashier',
                        tableNumber: parseNull(fields[3]),
                        status: fields[4] || 'pending',
                        totalAmount: parseFloat2(fields[5]),
                        createdBy: parseInt2(fields[6]),
                        discount: parseFloat2(fields[7]),
                        createdAt: parseDate2(fields[8]) || new Date(),
                        completedAt: parseDate2(fields[9]),
                        cancelledAt: parseDate2(fields[10]),
                        cancelReason: parseNull(fields[11]),
                        notes: parseNull(fields[12])
                    });
                    break;
                    
                case 'staff':
                    result.staff.push({
                        id: parseInt2(fields[0]),
                        name: fields[1] || '',
                        email: fields[2] || '',
                        phone: fields[3] || '',
                        password: fields[4] || '',
                        role: fields[5] || 'waiter',
                        hireDate: parseDate2(fields[6]) || new Date(),
                        salary: parseFloat2(fields[7]),
                        isActive: parseBool(fields[8]),
                        lastLogin: parseDate2(fields[9]),
                        createdAt: parseDate2(fields[10]) || new Date()
                    });
                    break;
            }
        } catch (e) {
            // Skip malformed rows
            console.warn('Skipping malformed row:', line.substring(0, 50));
        }
    }
    
    return result;
}

/**
 * Generate comprehensive analytics from CSV data
 */
export function generateCsvAnalytics(data: ParsedCsvData) {
    const now = new Date();
    
    // Orders analysis
    const totalOrders = data.orders.length;
    const totalRevenue = data.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Daily sales from receipts
    const salesByDate = new Map<string, number>();
    for (const receipt of data.dailyReceipts) {
        const dateStr = receipt.date.toISOString().split('T')[0];
        salesByDate.set(dateStr, (salesByDate.get(dateStr) || 0) + receipt.totalSales);
    }
    
    // Also aggregate from orders
    for (const order of data.orders) {
        const dateStr = order.createdAt.toISOString().split('T')[0];
        salesByDate.set(dateStr, (salesByDate.get(dateStr) || 0) + order.totalAmount);
    }
    
    // Weekly patterns
    const salesByDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const countByDayOfWeek = [0, 0, 0, 0, 0, 0, 0];
    
    for (const order of data.orders) {
        const day = order.createdAt.getDay();
        salesByDayOfWeek[day] += order.totalAmount;
        countByDayOfWeek[day]++;
    }
    
    const avgByDayOfWeek = salesByDayOfWeek.map((total, i) => 
        countByDayOfWeek[i] > 0 ? total / countByDayOfWeek[i] : 0
    );
    
    // Hourly patterns
    const salesByHour = new Array(24).fill(0);
    const countByHour = new Array(24).fill(0);
    
    for (const order of data.orders) {
        const hour = order.createdAt.getHours();
        salesByHour[hour] += order.totalAmount;
        countByHour[hour]++;
    }
    
    // Top tables
    const tableStats = new Map<string, { count: number; total: number }>();
    for (const order of data.orders) {
        const table = order.tableNumber || 'takeaway';
        const stats = tableStats.get(table) || { count: 0, total: 0 };
        stats.count++;
        stats.total += order.totalAmount;
        tableStats.set(table, stats);
    }
    
    // Expenses analysis
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = new Map<string, number>();
    for (const expense of data.expenses) {
        expensesByCategory.set(
            expense.category, 
            (expensesByCategory.get(expense.category) || 0) + expense.amount
        );
    }
    
    // Staff analysis
    const totalSalaries = data.staff.reduce((sum, s) => sum + s.salary, 0);
    const staffByRole = new Map<string, number>();
    for (const staff of data.staff) {
        staffByRole.set(staff.role, (staffByRole.get(staff.role) || 0) + 1);
    }
    
    // Recent trends (last 7 days)
    const last7Days: { date: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push({
            date: dateStr,
            sales: salesByDate.get(dateStr) || 0
        });
    }
    
    return {
        summary: {
            totalOrders,
            totalRevenue,
            avgOrderValue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            totalStaff: data.staff.length,
            totalSalaries,
            categories: data.categories.length
        },
        patterns: {
            salesByDayOfWeek,
            avgByDayOfWeek,
            salesByHour,
            countByHour
        },
        tables: Array.from(tableStats.entries())
            .map(([table, stats]) => ({ table, ...stats }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10),
        expenses: Array.from(expensesByCategory.entries())
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount),
        staff: {
            byRole: Array.from(staffByRole.entries())
                .map(([role, count]) => ({ role, count })),
            totalSalaries
        },
        trends: {
            last7Days,
            dailySalesMap: Object.fromEntries(salesByDate)
        }
    };
}
