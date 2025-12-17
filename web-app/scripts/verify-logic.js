const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), '../cafe_management.json');

function loadData() {
    try {
        const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
        const json = JSON.parse(fileContent);
        const data = {};
        if (Array.isArray(json)) {
            for (const table of json) {
                if (table.type === 'table') {
                    data[table.name] = table.data;
                }
            }
        }
        return data;
    } catch (error) {
        console.error("Failed to load data:", error);
        return { Categories: [], MenuItems: [], OrderItems: [], DailyReceipts: [], Expenses: [], Ingredients: [] };
    }
}

async function verify() {
    console.log("Loading data from:", DATA_PATH);
    const data = loadData();
    console.log("Tables found:", Object.keys(data).join(", "));

    // 1. Verify Income (Total Sales)
    const receipts = data.DailyReceipts || [];
    console.log(`\n--- Verifying Income ---`);
    console.log(`Total DailyReceipts: ${receipts.length}`);
    if (receipts.length > 0) {
        console.log("Sample Receipt:", JSON.stringify(receipts[0].totalSales));
    }
    const totalSales = receipts.reduce((acc, r) => acc + parseFloat(r.totalSales || '0'), 0);
    console.log(`Calculated Total Income: ${totalSales.toLocaleString()}`);

    // 2. Verify Stats by Category
    const menu = data.MenuItems || [];
    const categories = data.Categories || [];
    const items = data.OrderItems || [];

    console.log(`\n--- Verifying Categories ---`);
    console.log(`MenuItems: ${menu.length}, Categories: ${categories.length}, OrderItems: ${items.length}`);

    const salesByCategory = {};
    let matchedItems = 0;

    items.forEach(item => {
        const menuItem = menu.find(m => m.idMenuItem === item.menuItemId);
        if (menuItem) {
            matchedItems++;
            const category = categories.find(c => c.idCategory === menuItem.categoryId);
            const categoryName = category ? category.categoryName : 'Unknown';
            const price = parseFloat(item.price || '0') * parseFloat(item.quantity || '0');
            salesByCategory[categoryName] = (salesByCategory[categoryName] || 0) + price;
        }
    });

    console.log(`Matched OrderItems to MenuItems: ${matchedItems} / ${items.length}`);
    console.log("Sales by Category Result:");
    Object.entries(salesByCategory).forEach(([name, val]) => {
        console.log(`  - ${name}: ${val.toLocaleString()}`);
    });

    // 3. Verify Inventory
    const ingredients = data.Ingredients || [];
    console.log(`\n--- Verifying Inventory ---`);
    console.log(`Total Ingredients: ${ingredients.length}`);
    if (ingredients.length > 0) {
        console.log(`First Ingredient: ${ingredients[0].ingredientName} (Stock: ${ingredients[0].currentStock})`);
    }

}

verify();
