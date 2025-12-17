const fs = require('fs');
const path = require('path');

const filePath = '/home/ai/Desktop/database-coffe-madrel/cafe_management.csv';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // CSV format is messy (mixed tables).
    // I need to look for lines that look like DailyReceipts.
    // DailyReceipts columns: idDailyReceipt, receiptDate, ...
    // Row 43 in JSON was: "43","2025-12-16", ...

    console.log("Searching for ID 43 or higher...");

    const relevantLines = lines.filter(l => l.includes('"2025-12-16"'));
    relevantLines.forEach(l => console.log(l));

} catch (e) {
    console.error(e);
}
