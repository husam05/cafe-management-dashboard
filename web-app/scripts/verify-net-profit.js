const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
const envPath = path.resolve(__dirname, "../.env.local");
console.log("Loading env from:", envPath);
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function verifyNetProfit() {
  console.log("=".repeat(80));
  console.log("NET PROFIT VERIFICATION - Direct Database Query");
  console.log("=".repeat(80));

  // 1. Calculate Total Sales from DailyReceipts
  console.log("\n--- TOTAL SALES (from DailyReceipts) ---");
  const receipts = await prisma.shift.findMany({
    select: {
      totalSales: true,
      businessDate: true,
    },
  });

  const totalSales = receipts.reduce((sum, r) => {
    const sales = r.totalSales ? Number(r.totalSales) : 0;
    return sum + sales;
  }, 0);

  console.log(`Total Receipts: ${receipts.length}`);
  console.log(
    `Total Sales: ${totalSales.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} IQD`
  );

  // 2. Calculate Total Expenses
  console.log("\n--- TOTAL EXPENSES ---");
  const expenses = await prisma.expense.findMany({
    select: {
      amount: true,
      category: true,
      expenseDate: true,
    },
  });

  const totalExpenses = expenses.reduce((sum, e) => {
    const amount = e.amount ? Number(e.amount) : 0;
    return sum + amount;
  }, 0);

  console.log(`Total Expense Records: ${expenses.length}`);
  console.log(
    `Total Expenses: ${totalExpenses.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} IQD`
  );

  // 3. Calculate Net Profit
  const netProfit = totalSales - totalExpenses;
  console.log("\n--- NET PROFIT CALCULATION ---");
  console.log(
    `Total Sales:    ${totalSales.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} IQD`
  );
  console.log(
    `Total Expenses: ${totalExpenses.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} IQD`
  );
  console.log(
    `Net Profit:     ${netProfit.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} IQD`
  );
  console.log(`Status:         ${netProfit >= 0 ? "PROFIT ✓" : "LOSS ✗"}`);

  // 4. Show expense breakdown by category
  console.log("\n--- EXPENSE BREAKDOWN BY CATEGORY ---");
  const categoryTotals = {};
  expenses.forEach((e) => {
    const cat = e.category || "Unknown";
    const amount = Number(e.amount) || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
  });

  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, total]) => {
      console.log(
        `  ${cat}: ${total.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })} IQD`
      );
    });

  // 5. Show recent receipts for verification
  console.log("\n--- RECENT RECEIPTS (Last 5) ---");
  const recentReceipts = await prisma.shift.findMany({
    take: 5,
    orderBy: { businessDate: "desc" },
    select: {
      id: true,
      businessDate: true,
      totalSales: true,
      totalExpenses: true,
      shiftNo: true,
    },
  });

  recentReceipts.forEach((r) => {
    console.log(
      `  Shift ${r.shiftNo} (${
        r.businessDate.toISOString().split("T")[0]
      }): Sales=${Number(
        r.totalSales || 0
      ).toLocaleString()} IQD, Expenses=${Number(
        r.totalExpenses || 0
      ).toLocaleString()} IQD`
    );
  });

  console.log("\n" + "=".repeat(80));
  console.log("VERIFICATION COMPLETE");
  console.log("=".repeat(80));
}

verifyNetProfit()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
