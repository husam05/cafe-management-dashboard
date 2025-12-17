const fs = require('fs');
const path = require('path');

const filePath = '/home/ai/Desktop/database-coffe-madrel/cafe_management.json';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Find DailyReceipts
    const receiptsTable = data.find(t => t.name === 'DailyReceipts');
    if (receiptsTable) {
        const receipts = receiptsTable.data;
        // Find ID 42 and Reset
        const r42 = receipts.find(r => r.idDailyReceipt === '42');
        if (r42) {
            console.log("Found ID 42. Resetting...");
            r42.isClosed = '0'; // Was '1' in mock? Actually CSV says '0'
            r42.discrepancy = '0.00';
            r42.closingCash = '0.00';
            r42.closedBy = null;
            r42.closedAt = null;
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("Data Reverted.");

} catch (e) {
    console.error(e);
}
