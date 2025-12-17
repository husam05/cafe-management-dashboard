const fs = require('fs');
const path = require('path');

const filePath = '/home/ai/Desktop/database-coffe-madrel/cafe_management.json';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    const receipts = data.find(t => t.name === 'DailyReceipts')?.data || [];
    const expenses = data.find(t => t.name === 'Expenses')?.data || [];
    const orderItems = data.find(t => t.name === 'OrderItems')?.data || [];
    const menuItems = data.find(t => t.name === 'MenuItems')?.data || [];

    // 1. Total Income (from DailyReceipts)
    const totalIncome = receipts.reduce((acc, r) => acc + parseFloat(r.totalSales || 0), 0);

    // 2. Total Expenses
    const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    // 3. Net Profit
    const netProfit = totalIncome - totalExpenses;

    // 4. Top Product
    const counts = {};
    orderItems.forEach(item => {
        const qty = parseInt(item.quantity || 0);
        const id = item.menuItemId;
        counts[id] = (counts[id] || 0) + qty;
    });

    const sortedProducts = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const bestSellerId = sortedProducts[0][0];
    const bestSellerCount = sortedProducts[0][1];
    const bestSellerName = menuItems.find(m => m.idMenuItem === bestSellerId)?.itemName || 'Unknown';

    console.log("=== KPI VERIFICATION ===");
    console.log(`Total Income: ${totalIncome.toLocaleString()} IQD`);
    console.log(`Total Expenses: ${totalExpenses.toLocaleString()} IQD`);
    console.log(`Net Profit: ${netProfit.toLocaleString()} IQD`);
    console.log(`Top Product: ${bestSellerName} (${bestSellerCount} sales)`);
    console.log("========================");

} catch (e) {
    console.error(e);
}
