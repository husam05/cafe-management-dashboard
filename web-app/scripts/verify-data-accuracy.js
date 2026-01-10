const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Load .env.local manually for script execution
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = require("dotenv").parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const prisma = new PrismaClient();

async function verifyData() {
  console.log("🔍 Starting Data Verification...");

  // 1. Get Totals via Raw SQL (The Truth)
  const sqlSales =
    await prisma.$queryRaw`SELECT SUM(totalSales) as total FROM DailyReceipts`;
  const sqlExpenses =
    await prisma.$queryRaw`SELECT SUM(amount) as total FROM Expenses`;
  const sqlOrders =
    await prisma.$queryRaw`SELECT COUNT(*) as count FROM Orders`;

  // 2. Get Totals via Application Logic (Prisma Models)
  // Note: We replicate the logic from db.ts here to verify the model mapping works as expected.
  // 2. Get Totals via Application Logic (Prisma Models)
  // Note: We replicate the logic from db.ts here to verify the model mapping works as expected.
  const appShifts = await prisma.shift.findMany();
  // Using explicit select to avoid potential P2022 ghost field issues
  const appExpenses = await prisma.expense.findMany({
    select: {
      id: true,
      amount: true,
    },
  });
  // const appExpenses = await prisma.expense.findMany();
  // Using explicit select for Sales too
  const appOrders = await prisma.sale.findMany({
    select: {
      id: true,
      total: true,
    },
  });
  // const appOrders = await prisma.sale.findMany(); // 'Sale' maps to 'Orders'

  const appTotalSales = appShifts.reduce(
    (acc, s) => acc + (Number(s.totalSales) || 0),
    0
  );

  const appTotalOrders = appOrders.reduce(
    (acc, s) => acc + (Number(s.total) || 0),
    0
  );

  const appTotalExpenses = appExpenses.reduce(
    (acc, e) => acc + (Number(e.amount) || 0),
    0
  );

  console.log("\n📊 Comparison Results:");
  console.log("--------------------------------------------------");
  console.log(`Metric          | Database (SQL)       | App Logic (Prisma)`);
  console.log("--------------------------------------------------");

  const dbSales = Number(sqlSales[0].total) || 0;
  const dbExpenses = Number(sqlExpenses[0].total) || 0;
  const dbOrderCount = Number(sqlOrders[0].count) || 0;

  console.log(
    `Total Sales (Shifts)| ${dbSales
      .toFixed(2)
      .padEnd(20)} | ${appTotalSales.toFixed(2)}`
  );
  console.log(
    `Total Orders Sum    | ${"N/A".padEnd(20)} | ${appTotalOrders.toFixed(
      2
    )} (Ref Only)`
  );
  console.log(
    `Total Expenses  | ${dbExpenses
      .toFixed(2)
      .padEnd(20)} | ${appTotalExpenses.toFixed(2)}`
  );
  console.log(
    `Order Count     | ${dbOrderCount.toString().padEnd(20)} | ${
      appOrders.length
    }`
  );

  console.log("--------------------------------------------------");

  let match = true;
  if (Math.abs(dbSales - appTotalSales) > 0.01) match = false;
  if (Math.abs(dbExpenses - appTotalExpenses) > 0.01) match = false;
  if (dbOrderCount !== appOrders.length) match = false;

  if (match) {
    console.log("✅ SUCCESS: All data matches 100%.");
  } else {
    console.error("❌ FAILURE: Data mismatch detected!");
    process.exit(1);
  }
}

verifyData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
