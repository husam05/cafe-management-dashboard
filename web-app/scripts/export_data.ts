
import { loadData } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("🚀 Starting Data Export (via App Layer)...");

    // Use the app's own data loader to guarantee consistency
    const dbData = await loadData();

    const receipts = dbData.DailyReceipts;
    const orderItems = dbData.OrderItems;
    const expenses = dbData.Expenses;

    console.log(`info: Loaded ${receipts.length} receipts, ${orderItems.length} items, ${expenses.length} expenses.`);

    // Group data by YYYY-MM-DD
    const dailyStats = new Map<string, any>();

    // Initialize map with receipt dates
    receipts.forEach(r => {
        // r.date is a Date object from db.ts
        const date = r.date.toISOString().split('T')[0];

        if (!dailyStats.has(date)) {
            dailyStats.set(date, {
                day: date,
                total_sales: 0,
                receipt_expenses: 0,
                cash_sales: 0,
                orders_count: 0,
                order_sales: 0,
                discounts: 0,
                evening_shift_sales: 0,
                morning_shift_sales: 0,
                items_sold: 0,
                total_expenses: 0,
                inventory_waste_qty: 0,
                inventory_usage_qty: 0,
            });
        }

        const dayStat = dailyStats.get(date);
        // db.ts returns numbers (or Decimals transformed to numbers? check db.ts again. 
        // loadJsonData returns numbers. loadPrismaData returns Decimals.
        // We need a helper to safe convert.
        const safeNum = (v: any) => (v && v.toNumber) ? v.toNumber() : (Number(v) || 0);

        const sales = safeNum(r.totalSales);

        dayStat.total_sales += sales;
        // Shift logic
        if (r.shiftNumber === 1) {
            dayStat.morning_shift_sales += sales;
        } else {
            dayStat.evening_shift_sales += sales;
        }
    });

    // Process Expenses
    expenses.forEach(e => {
        const date = e.date.toISOString().split('T')[0];
        if (dailyStats.has(date)) {
            const dayStat = dailyStats.get(date);
            const safeNum = (v: any) => (v && v.toNumber) ? v.toNumber() : (Number(v) || 0);
            dayStat.total_expenses += safeNum(e.amount);
        }
    });

    // Process Orders/Items for count
    const ordersByDay = new Map<string, Set<string>>();

    orderItems.forEach(item => {
        const date = item.createdAt ? item.createdAt.toISOString().split('T')[0] : null;
        if (!date) return;

        if (!dailyStats.has(date)) {
            // Init if missing
            dailyStats.set(date, {
                day: date,
                total_sales: 0,
                receipt_expenses: 0,
                cash_sales: 0,
                orders_count: 0,
                order_sales: 0,
                discounts: 0,
                evening_shift_sales: 0,
                morning_shift_sales: 0,
                items_sold: 0,
                total_expenses: 0,
                inventory_waste_qty: 0,
                inventory_usage_qty: 0,
            });
        }
        const dayStat = dailyStats.get(date);

        const safeNum = (v: any) => (v && v.toNumber) ? v.toNumber() : (Number(v) || 0);
        const qty = safeNum(item.quantity);
        dayStat.items_sold += qty;

        const price = safeNum(item.price);
        dayStat.order_sales += price * qty;

        if (!ordersByDay.has(date)) {
            ordersByDay.set(date, new Set());
        }
        ordersByDay.get(date)?.add(String(item.orderId));
    });

    ordersByDay.forEach((orderSet, date) => {
        if (dailyStats.has(date)) {
            dailyStats.get(date).orders_count = orderSet.size;
        }
    });

    const headers = [
        "day", "total_sales", "receipt_expenses", "cash_sales", "orders_count",
        "order_sales", "discounts", "evening_shift_sales", "morning_shift_sales",
        "items_sold", "total_expenses", "inventory_waste_qty", "inventory_usage_qty",
        "average_order_value", "gross_profit", "profit_margin", "cash_ratio", "day_of_week", "is_weekend"
    ];

    const rows = Array.from(dailyStats.values()).sort((a, b) => a.day.localeCompare(b.day));

    const csvContent = [
        headers.join(","),
        ...rows.map(row => {
            const aov = row.orders_count > 0 ? row.total_sales / row.orders_count : 0;
            const gross_profit = row.total_sales - row.total_expenses;
            const profit_margin = row.total_sales > 0 ? (gross_profit / row.total_sales) * 100 : 0;
            const cash_ratio = 1;
            const dateObj = new Date(row.day);
            const dow = dateObj.getDay();
            const is_weekend = (dow === 5 || dow === 6) ? 1 : 0;

            return [
                row.day,
                row.total_sales.toFixed(2),
                row.receipt_expenses.toFixed(2),
                row.total_sales.toFixed(2),
                row.orders_count,
                row.order_sales.toFixed(2),
                0,
                row.evening_shift_sales.toFixed(2),
                row.morning_shift_sales.toFixed(2),
                row.items_sold,
                row.total_expenses.toFixed(2),
                0,
                0,
                aov.toFixed(2),
                gross_profit.toFixed(2),
                profit_margin.toFixed(2),
                cash_ratio,
                dow,
                is_weekend
            ].join(",");
        })
    ].join("\n");

    const outputPath = path.join(process.cwd(), 'Dataset-creat/daily_cafe_dataset.csv');
    fs.writeFileSync(outputPath, csvContent);

    console.log(`✅ Data Export Complete! Saved ${rows.length} days to ${outputPath}`);
}

main().catch(e => {
    console.error("Export Failed:", e);
    process.exit(1);
});
