
import { getExpensesStats } from "../src/lib/db";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function auditExpenses() {
    console.log("🔍 Auditing Expenses Data...");

    // 1. Get High-Level Stats from our App Logic
    const stats = await getExpensesStats();
    console.log(`\n📊 Total Expenses Reported: ${stats.totalExpenses.toLocaleString()} IQD`);

    // 2. Deep Dive into Database
    const expenses = await prisma.expense.findMany({
        orderBy: { amount: 'desc' }
    });

    console.log(`\n📝 Found ${expenses.length} Expense Records.`);

    console.log("\n💰 Top 10 Most Expensive Items:");
    expenses.slice(0, 10).forEach(e => {
        console.log(` - [${e.category}] ${e.description || 'No Desc'}: ${Number(e.amount).toLocaleString()} IQD (${e.date.toISOString().split('T')[0]})`);
    });

    // 3. Group by Category
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
        const amt = Number(e.amount);
        byCategory[e.category] = (byCategory[e.category] || 0) + amt;
    });

    console.log("\n📂 Expenses by Category:");
    Object.entries(byCategory)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, total]) => {
            console.log(` - ${cat}: ${total.toLocaleString()} IQD`);
        });

    // 4. Check for potentially erroneous duplicates (Same amount, same date, same category)
    console.log("\n⚠️ Checking for Suspicious Duplicates...");
    const seen = new Set();
    let duplicates = 0;
    expenses.forEach(e => {
        const key = `${e.date.toISOString()}-${e.amount}-${e.category}-${e.description}`;
        if (seen.has(key)) {
            console.log(`   [Potential Duplicate] ID: ${e.id} | ${e.category} | ${e.amount}`);
            duplicates++;
        }
        seen.add(key);
    });

    if (duplicates === 0) console.log("   No exact duplicates found.");
}

auditExpenses()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
