const fs = require('fs');
const path = require('path');

const filePath = '/home/ai/Desktop/database-coffe-madrel/cafe_management.json';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Find DailyReceipts
    const receiptsTable = data.find(t => t.name === 'DailyReceipts');
    if (receiptsTable) {
        const sorted = receiptsTable.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log("JSON Latest:", sorted[0]);
    } else {
        console.log("No DailyReceipts in JSON");
    }

} catch (e) {
    console.error(e);
}
