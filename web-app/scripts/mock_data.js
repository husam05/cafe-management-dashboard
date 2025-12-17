const fs = require('fs');
const path = require('path');

const filePath = '/home/ai/Desktop/database-coffe-madrel/cafe_management.json';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Find DailyReceipts
    const receiptsTable = data.find(t => t.name === 'DailyReceipts');
    if (!receiptsTable) {
        process.exit(1);
    }

    const receipts = receiptsTable.data;

    // Sort by openedAt desc
    const sorted = receipts.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));

    // Keep top one as OPEN (Current)
    // Modify second one to be CLOSED and have DISCREPANCY
    if (sorted.length > 1) {
        sorted[1].isClosed = "1";
        sorted[1].closedBy = "Staff 10";
        sorted[1].closedAt = sorted[1].receiptDate + " 23:00:00";
        sorted[1].discrepancy = "-5000.00"; // 5000 IQD discrepancy
        sorted[1].expectedCash = "100000.00";
        sorted[1].closingCash = "95000.00";

        console.log("Mocked Shift:", sorted[1]);
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("Data updated successfully.");

} catch (e) {
    console.error(e);
}
