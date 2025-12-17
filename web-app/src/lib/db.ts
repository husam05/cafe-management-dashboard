
import { promises as fs } from 'fs';
import path from 'path';
import { getConfig, getConfigVersion } from './config';
import { prisma } from './prisma';
import {
    Category, MenuItem, OrderItem, DailyReceipt, Expense, Ingredient,
    InventoryTransaction, Staff, Order, Payment
} from '@prisma/client';

// Re-export types for usage in components if needed
export type { Category, MenuItem, OrderItem, DailyReceipt, Expense, Ingredient, InventoryTransaction, Staff };

export interface DatabaseData {
    Categories: Category[];
    MenuItems: MenuItem[];
    OrderItems: OrderItem[];
    DailyReceipts: DailyReceipt[];
    Expenses: Expense[];
    Ingredients: Ingredient[];
}

// Global cache for JSON
let cachedData: DatabaseData | null = null;
let lastFetch = 0;
let lastConfigVersion = -1; // Track config version for cache invalidation
const CACHE_TTL = 60000; // 1 minute

// Function to clear cache (called when settings change)
export function clearDataCache(): void {
    cachedData = null;
    lastFetch = 0;
    lastConfigVersion = -1;
    console.log('Data cache cleared');
}

// Helper to parse JSON string fields to match Prisma types
function parseJsonEntry(entry: any, type: string): any {
    const safeFloat = (v: any) => v ? parseFloat(v) : 0;
    const safeInt = (v: any) => v ? parseInt(v) : 0;
    const safeDate = (v: any) => v ? new Date(v) : new Date();
    const safeBool = (v: any) => v === '1' || v === 1 || v === true;

    if (type === 'Category') {
        return {
            id: safeInt(entry.idCategory),
            name: entry.categoryName,
            description: entry.description,
            displayOrder: safeInt(entry.displayOrder),
            imageUrl: entry.imageUrl,
            isActive: safeBool(entry.isActive),
            isKitchen: safeBool(entry.isKitchen),
            createdAt: safeDate(entry.createdAt),
            updatedAt: new Date()
        };
    }
    // ... implement other parsers if strictly needed for JSON fallback
    // For now, mapping basic fields to avoid breaking the app if JSON is used
    return entry;
}

// SIMPLIFIED JSON LOADER FOR BACKWARD COMPATIBILITY
// Note: This is a "Best Effort" mapping. 
// If specific fields are missing, it might break. 
// Ideally we move 100% to Prisma/DB.
async function loadJsonData(): Promise<DatabaseData> {
    const now = Date.now();
    const currentConfigVersion = getConfigVersion();
    
    // Check if cache is valid (not expired AND config hasn't changed)
    if (cachedData && (now - lastFetch < CACHE_TTL) && lastConfigVersion === currentConfigVersion) {
        return cachedData;
    }
    
    // Update config version tracker
    lastConfigVersion = currentConfigVersion;

    const filePath = path.join(process.cwd(), '../cafe_management.json');
    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContents);

        const data: any = {};
        if (Array.isArray(jsonData)) {
            jsonData.forEach((table: any) => {
                if (table.type === 'table') {
                    data[table.name] = table.data;
                }
            });
        }

        // Map legacy JSON keys to Prisma model keys
        // Categories
        const categories = (data.Categories || []).map((c: any) => ({
            id: parseInt(c.idCategory),
            name: c.categoryName,
            description: c.description,
            displayOrder: parseInt(c.displayOrder || '0'),
            imageUrl: c.imageUrl,
            isActive: c.isActive === '1',
            isKitchen: c.isKitchen === '1',
            createdAt: new Date(c.createdAt),
            updatedAt: new Date()
        }));

        // MenuItems
        const menuItems = (data.MenuItems || []).map((m: any) => ({
            id: parseInt(m.idMenuItem),
            categoryId: parseInt(m.categoryId),
            name: m.itemName,
            description: m.description,
            basePrice: parseFloat(m.basePrice),
            imageUrl: m.imageUrl,
            preparationTime: parseInt(m.preparationTime || '0'),
            itemType: m.itemType,
            isInventoryItem: m.isInventoryItem === '1',
            isAvailable: m.isAvailable === '1',
            isActive: m.isActive === '1',
            createdAt: new Date(m.createdAt),
            updatedAt: new Date()
        }));

        // OrderItems
        const orderItems = (data.OrderItems || []).map((o: any) => ({
            id: parseInt(o.idOrderItem),
            orderId: parseInt(o.orderId),
            menuItemId: parseInt(o.menuItemId),
            itemSizeId: o.itemSizeId ? parseInt(o.itemSizeId) : null,
            quantity: parseInt(o.quantity),
            price: parseFloat(o.price),
            specialInstructions: o.specialInstructions,
            status: o.status,
            preparedAt: o.preparedAt ? new Date(o.preparedAt) : null,
            completedAt: o.completedAt ? new Date(o.completedAt) : null,
            cancelledAt: o.cancelledAt ? new Date(o.cancelledAt) : null,
            preparedBy: o.preparedBy ? parseInt(o.preparedBy) : null,
            createdAt: new Date(o.createdAt || Date.now())
        }));

        // DailyReceipts
        const receipts = (data.DailyReceipts || []).map((r: any) => ({
            id: parseInt(r.idDailyReceipt),
            date: new Date(r.receiptDate),
            shiftNumber: parseInt(r.shiftNumber),
            openingCash: parseFloat(r.openingCash),
            totalSales: parseFloat(r.totalSales),
            totalExpenses: parseFloat(r.totalExpenses),
            closingCash: parseFloat(r.closingCash),
            expectedCash: parseFloat(r.expectedCash),
            discrepancy: parseFloat(r.discrepancy),
            openedBy: parseInt(r.openedBy),
            closedBy: r.closedBy ? parseInt(r.closedBy) : null,
            openedAt: r.openedAt ? new Date(r.openedAt) : null,
            closedAt: r.closedAt ? new Date(r.closedAt) : null,
            isClosed: r.isClosed === '1',
            notes: r.notes,
            createdAt: new Date(r.createdAt)
        }));

        // Expenses
        const expenses = (data.Expenses || []).map((e: any) => ({
            id: parseInt(e.idExpense),
            date: new Date(e.expenseDate),
            category: e.category,
            amount: parseFloat(e.amount),
            description: e.description,
            receiptNumber: e.receiptNumber,
            recordedBy: parseInt(e.recordedBy),
            dailyReceiptId: e.dailyReceiptId ? parseInt(e.dailyReceiptId) : null,
            createdAt: new Date(e.createdAt)
        }));

        // Ingredients
        const ingredients = (data.Ingredients || []).map((i: any) => ({
            id: parseInt(i.idIngredient),
            name: i.ingredientName,
            unit: i.unit,
            currentStock: parseFloat(i.currentStock),
            minStock: parseFloat(i.minStock),
            maxStock: parseFloat(i.maxStock),
            costPerUnit: parseFloat(i.costPerUnit),
            notes: i.notes,
            isActive: i.isActive === '1',
            createdAt: new Date(i.createdAt),
            updatedAt: new Date()
        }));

        cachedData = {
            Categories: categories,
            MenuItems: menuItems,
            OrderItems: orderItems,
            DailyReceipts: receipts,
            Expenses: expenses,
            Ingredients: ingredients
        };
        lastFetch = now;
        return cachedData;
    } catch (error) {
        console.error("Failed to load JSON data:", error);
        return { Categories: [], MenuItems: [], OrderItems: [], DailyReceipts: [], Expenses: [], Ingredients: [] };
    }
}

async function loadPrismaData(): Promise<DatabaseData> {
    try {
        const [categories, menuItems, orderItems, dailyReceipts, expenses, ingredients] = await Promise.all([
            prisma.category.findMany(),
            prisma.menuItem.findMany(),
            prisma.orderItem.findMany(),
            prisma.dailyReceipt.findMany(),
            prisma.expense.findMany(),
            prisma.ingredient.findMany()
        ]);

        return {
            Categories: categories,
            MenuItems: menuItems,
            OrderItems: orderItems,
            DailyReceipts: dailyReceipts,
            Expenses: expenses,
            Ingredients: ingredients
        };
    } catch (error) {
        console.error("Prisma Database Error:", error);
        throw error;
    }
}

export async function loadData(): Promise<DatabaseData> {
    const config = await getConfig();

    // Default to Prisma if config says mysql
    if (config.dataSource === 'mysql') {
        return await loadPrismaData();
    }

    return loadJsonData();
}

// ------------------------------------------------------------------
// Analytics Helpers (Refactored for Prisma Types / Numbers)
// ------------------------------------------------------------------

export async function getSalesStats() {
    const data = await loadData();
    const receipts = data.DailyReceipts;

    const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

    const totalSales = receipts.reduce((acc, r) => acc + toNum(r.totalSales), 0);

    // Group by date for chart
    const salesByDate = receipts.reduce((acc: Record<string, number>, r) => {
        const dateStr = r.date ? r.date.toISOString().split('T')[0] : 'Unknown';
        acc[dateStr] = (acc[dateStr] || 0) + toNum(r.totalSales);
        return acc;
    }, {});

    const chartData = Object.entries(salesByDate).map(([date, sales]) => ({
        date,
        sales,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

    // Calculate real comparison stats (today vs yesterday)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todaySales = salesByDate[today] || 0;
    const yesterdaySales = salesByDate[yesterday] || 0;
    
    let salesChangePercent = 0;
    if (yesterdaySales > 0) {
        salesChangePercent = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
    }

    // Calculate average daily sales
    const avgDailySales = chartData.length > 0 
        ? totalSales / chartData.length 
        : 0;

    return { 
        totalSales, 
        chartData,
        todaySales,
        yesterdaySales,
        salesChangePercent,
        avgDailySales
    };
}

export async function getTopProducts() {
    const data = await loadData();
    const items = data.OrderItems;
    const menu = data.MenuItems;

    const counts: Record<number, number> = {};
    items.forEach(item => {
        const qty = item.quantity; // Int
        counts[item.menuItemId] = (counts[item.menuItemId] || 0) + qty;
    });

    const topProducts = Object.entries(counts)
        .map(([idStr, count]) => {
            const id = parseInt(idStr);
            const menuItem = menu.find(m => m.id === id);
            return {
                name: menuItem ? menuItem.name : `Unknown Item (${id})`,
                count
            };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return topProducts;
}

export async function getExpensesStats() {
    const data = await loadData();
    const expenses = data.Expenses;

    const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + toNum(e.amount), 0);

    // Group expenses by date for comparison
    const expensesByDate: Record<string, number> = {};
    expenses.forEach(e => {
        const dateStr = e.date ? new Date(e.date).toISOString().split('T')[0] : 'Unknown';
        expensesByDate[dateStr] = (expensesByDate[dateStr] || 0) + toNum(e.amount);
    });

    // Calculate real comparison stats (today vs yesterday)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todayExpenses = expensesByDate[today] || 0;
    const yesterdayExpenses = expensesByDate[yesterday] || 0;
    
    let expensesChangePercent = 0;
    if (yesterdayExpenses > 0) {
        expensesChangePercent = ((todayExpenses - yesterdayExpenses) / yesterdayExpenses) * 100;
    }

    const byCategory = expenses.reduce((acc: any, e) => {
        acc[e.category] = (acc[e.category] || 0) + toNum(e.amount);
        return acc;
    }, {});

    const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

    return { 
        totalExpenses, 
        categoryData,
        todayExpenses,
        yesterdayExpenses,
        expensesChangePercent
    };
}

export async function getSalesByCategory() {
    const data = await loadData();
    const menu = data.MenuItems;
    const categories = data.Categories;
    const items = data.OrderItems;

    const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

    const salesByCategory: Record<string, number> = {};

    items.forEach(item => {
        const menuItem = menu.find(m => m.id === item.menuItemId);
        if (!menuItem) return;

        const category = categories.find(c => c.id === menuItem.categoryId);
        const categoryName = category ? category.name : 'Unknown';

        const price = toNum(item.price) * item.quantity;
        salesByCategory[categoryName] = (salesByCategory[categoryName] || 0) + price;
    });

    return Object.entries(salesByCategory).map(([name, value]) => ({ name, value }));
}

export async function getSalesByHour() {
    const data = await loadData();
    const items = data.OrderItems;

    const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

    const salesByHour: Record<string, number> = {};

    items.forEach(item => {
        if (!item.createdAt) return;
        const date = new Date(item.createdAt);
        const hour = date.getHours();
        const hourLabel = `${hour}:00`;

        const price = toNum(item.price) * item.quantity;
        salesByHour[hourLabel] = (salesByHour[hourLabel] || 0) + price;
    });

    return Object.entries(salesByHour)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));
}

// Helper for consistent number conversion
const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

export async function getInventory() {
    const data = await loadData();
    const ingredients = data.Ingredients;

    return ingredients.map(i => ({
        ...i,
        currentStock: toNum(i.currentStock),
        minStock: toNum(i.minStock),
        maxStock: toNum(i.maxStock),
        costPerUnit: toNum(i.costPerUnit)
    }));
}

export async function getRecentReceipts(limit = 5) {
    const data = await loadData();
    const receipts = data.DailyReceipts;

    return receipts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
}

export async function getRecentTransactions(limit = 5) {
    const data = await loadData();
    const items = data.OrderItems;
    const menu = data.MenuItems;

    const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

    const sortedItems = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

    return sortedItems.map(item => {
        const menuItem = menu.find(m => m.id === item.menuItemId);
        return {
            id: item.id.toString(), // Convert ID to string for consistency
            date: item.createdAt,
            itemName: menuItem ? menuItem.name : 'Unknown Item',
            amount: toNum(item.price) * item.quantity,
            status: item.status
        };
    });
}

export async function getShiftStats() {
    const data = await loadData();
    const receipts = data.DailyReceipts;
    const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

    const sorted = receipts.sort((a, b) => {
        const tA = a.openedAt ? new Date(a.openedAt).getTime() : 0;
        const tB = b.openedAt ? new Date(b.openedAt).getTime() : 0;
        return tB - tA;
    });

    // In SQL/JSON `isClosed` was "0" or "1" (string).
    // In Prisma, it is Boolean (or should be).
    // The JSON loader maps it to boolean.
    // The Prisma loader returns boolean.
    // So we check boolean.

    // Note: SQL definition had default(false).

    const currentShift = sorted.find(r => r.isClosed === false);
    const lastClosedShift = sorted.find(r => r.isClosed === true);

    const discrepancyShifts = sorted.slice(0, 5)
        .filter(r => toNum(r.discrepancy) !== 0)
        .map(r => ({
            ...r,
            discrepancy: toNum(r.discrepancy),
            openingCash: toNum(r.openingCash),
            totalSales: toNum(r.totalSales),
            totalExpenses: toNum(r.totalExpenses),
            closingCash: toNum(r.closingCash),
            expectedCash: toNum(r.expectedCash)
        }));

    const mapShift = (r: any) => r ? ({
        ...r,
        discrepancy: toNum(r.discrepancy),
        openingCash: toNum(r.openingCash),
        totalSales: toNum(r.totalSales),
        totalExpenses: toNum(r.totalExpenses),
        closingCash: toNum(r.closingCash),
        expectedCash: toNum(r.expectedCash)
    }) : null;

    return {
        currentShift: mapShift(currentShift),
        lastClosedShift: mapShift(lastClosedShift),
        discrepancyShifts
    };
}

export async function getDailyPerformance() {
    const data = await loadData();
    const receipts = data.DailyReceipts;
    const expenses = data.Expenses;
    const toNum = (v: any) => v && v.toNumber ? v.toNumber() : (Number(v) || 0);

    // Group expenses by date
    const expensesByDate: Record<string, number> = {};
    expenses.forEach(e => {
        const dateKey = new Date(e.date).toISOString().split('T')[0];
        expensesByDate[dateKey] = (expensesByDate[dateKey] || 0) + toNum(e.amount);
    });

    // Create daily performance records
    const dailyData = receipts.map(r => {
        const dateKey = new Date(r.date).toISOString().split('T')[0];
        const income = toNum(r.totalSales);
        const dayExpenses = expensesByDate[dateKey] || 0;
        const net = income - dayExpenses;

        return {
            date: dateKey,
            income,
            expenses: dayExpenses,
            net
        };
    });

    // Sort by date descending (newest first)
    return dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
