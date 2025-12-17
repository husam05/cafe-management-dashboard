const fs = require('fs');

const filePath = '/home/ai/Desktop/database-coffe-madrel/cafe_management.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const ordersTable = data.find(t => t.name === 'OrderItems');
if (ordersTable) {
    const orders = ordersTable.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log("Latest 5 Orders:");
    orders.slice(0, 5).forEach(o => {
        console.log(`${o.createdAt}: Item ${o.menuItemId} - ${o.price} IQD`);
    });
}
