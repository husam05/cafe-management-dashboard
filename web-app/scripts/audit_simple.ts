import * as fs from 'fs';
import * as path from 'path';

const jsonPath = path.join(__dirname, '../../cafe_management.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log("🔍 Auditing Expenses from JSON...\n");

const expenses = data.Expenses || [];
console.log(`📊 Found ${expenses.length} Expense Records.`);

// Calculate total
const total = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
console.log(`💰 Total Expenses: ${total.toLocaleString()} IQD\n`);

// Sort by amount
const sorted = [...expenses].sort((a: any, b: any) => parseFloat(b.amount) - parseFloat(a.amount));

console.log("💸 Top 10 Most Expensive Items:");
sorted.slice(0, 10).forEach((e: any, i: number) => {
    console.log(`${i + 1}. [${e.category}] ${e.description || 'No Desc'}: ${parseFloat(e.amount).toLocaleString()} IQD (${e.expenseDate})`);
});

// Group by Category
const byCategory: Record<string, number> = {};
expenses.forEach((e: any) => {
    const amt = parseFloat(e.amount || 0);
    byCategory[e.category] = (byCategory[e.category] || 0) + amt;
});

console.log("\n📂 Expenses by Category:");
Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, total]) => {
        const pct = ((total / (total > 0 ? total : 1)) * 100).toFixed(1);
        console.log(` - ${cat}: ${total.toLocaleString()} IQD`);
    });

// Check for duplicates
console.log("\n⚠️ Checking for Suspicious Duplicates...");
const seen = new Set();
const duplicateList: any[] = [];
expenses.forEach((e: any) => {
    const key = `${e.expenseDate}-${e.amount}-${e.category}-${e.description}`;
    if (seen.has(key)) {
        duplicateList.push(e);
    }
    seen.add(key);
});

if (duplicateList.length === 0) {
    console.log("   ✅ No exact duplicates found.");
} else {
    console.log(`   ⚠️ Found ${duplicateList.length} potential duplicates:`);
    duplicateList.forEach(e => {
        console.log(`      ID: ${e.idExpense} | ${e.category} | ${parseFloat(e.amount).toLocaleString()} IQD | ${e.expenseDate}`);
    });
}

console.log("\n✅ Audit Complete!");
