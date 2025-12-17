const fs = require('fs');
const path = require('path');

const filePath = '/home/ai/Desktop/database-coffe-madrel/cafe_management.json';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Find DailyReceipts table
    const receiptsTable = data.find(t => t.name === 'DailyReceipts');
    if (!receiptsTable) {
        console.log("DailyReceipts table not found");
        process.exit(1);
    }

    const receipts = receiptsTable.data;

    // Sort by openedAt desc
    const sorted = receipts.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));

    console.log("=== LAST 5 SHIFTS ===");
    sorted.slice(0, 5).forEach(r => {
        console.log(`Shift ${r.shiftNumber} (${r.receiptDate}): Closed=${r.isClosed}, Discrepancy=${r.discrepancy}`);
    });

} catch (e) {
    console.error(e);
}
