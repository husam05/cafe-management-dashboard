const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function checkOrdersVsReceipts() {
  console.log("=".repeat(80));
  console.log("ORDERS vs DAILY RECEIPTS COMPARISON");
  console.log("=".repeat(80));

  // Check Orders table
  console.log("\n--- ORDERS TABLE (Sales) ---");
  const orders = await prisma.sale.findMany({
    select: {
      id: true,
      total: true,
      businessDate: true,
      invoiceNo: true,
    },
    orderBy: { businessDate: "desc" },
    take: 10,
  });

  const totalFromOrders = orders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  console.log(`Total Orders in DB: ${orders.length} (showing last 10)`);
  console.log(`Sum of last 10 orders: ${totalFromOrders.toLocaleString()} IQD`);

  orders.forEach((o) => {
    console.log(
      `  Order ${o.invoiceNo}: ${Number(o.total).toLocaleString()} IQD (${
        o.businessDate.toISOString().split("T")[0]
      })`
    );
  });

  // Get ALL orders total
  const allOrders = await prisma.sale.findMany({
    select: { total: true },
  });
  const grandTotalOrders = allOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  console.log(
    `\nGRAND TOTAL from ALL Orders: ${grandTotalOrders.toLocaleString()} IQD`
  );
  console.log(`Total Order Count: ${allOrders.length}`);

  // Check DailyReceipts
  console.log("\n--- DAILY RECEIPTS (Shifts) ---");
  const receipts = await prisma.shift.findMany({
    select: {
      id: true,
      businessDate: true,
      shiftNo: true,
      totalSales: true,
      totalExpenses: true,
    },
    orderBy: { businessDate: "desc" },
    take: 10,
  });

  const totalFromReceipts = receipts.reduce(
    (sum, r) => sum + Number(r.totalSales || 0),
    0
  );
  console.log(`Total Receipts: ${receipts.length} (showing last 10)`);
  console.log(
    `Sum of last 10 receipts: ${totalFromReceipts.toLocaleString()} IQD`
  );

  receipts.forEach((r) => {
    console.log(
      `  Shift ${r.shiftNo} (${
        r.businessDate.toISOString().split("T")[0]
      }): ${Number(r.totalSales || 0).toLocaleString()} IQD`
    );
  });

  // Get ALL receipts total
  const allReceipts = await prisma.shift.findMany({
    select: { totalSales: true },
  });
  const grandTotalReceipts = allReceipts.reduce(
    (sum, r) => sum + Number(r.totalSales || 0),
    0
  );
  console.log(
    `\nGRAND TOTAL from ALL Receipts: ${grandTotalReceipts.toLocaleString()} IQD`
  );
  console.log(`Total Receipt Count: ${allReceipts.length}`);

  // Comparison
  console.log("\n--- COMPARISON ---");
  console.log(
    `Orders Total:   ${grandTotalOrders.toLocaleString()} IQD (${
      allOrders.length
    } orders)`
  );
  console.log(
    `Receipts Total: ${grandTotalReceipts.toLocaleString()} IQD (${
      allReceipts.length
    } shifts)`
  );
  console.log(
    `Difference:     ${(
      grandTotalOrders - grandTotalReceipts
    ).toLocaleString()} IQD`
  );

  if (Math.abs(grandTotalOrders - grandTotalReceipts) > 100) {
    console.log("\n⚠️  WARNING: Significant discrepancy detected!");
    console.log("The Orders table and DailyReceipts table do not match.");
    console.log(
      "This suggests that shift summaries may not be synchronized with actual sales."
    );
  } else {
    console.log("\n✓ Data is synchronized between Orders and DailyReceipts");
  }

  console.log("\n" + "=".repeat(80));
}

checkOrdersVsReceipts()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
