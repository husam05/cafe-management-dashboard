const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

// Helper to format values for CSV
const fmt = (val) => {
  if (val === null || val === undefined) return "NULL";
  if (val instanceof Date)
    return `"${val.toISOString().replace("T", " ").split(".")[0]}"`;
  if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
  return `"${val}"`;
};

const fmtDateOnly = (val) => {
  if (!val) return "NULL";
  const d = new Date(val);
  return `"${d.toISOString().split("T")[0]}"`;
};

async function main() {
  console.log("🔄 Syncing MySQL Database to cafe_management.csv...");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not found in .env.local");
  }

  const connection = await mysql.createConnection(dbUrl);

  try {
    const lines = [];

    // 1. Categories
    console.log("📦 Exporting Categories...");
    const [categories] = await connection.execute("SELECT * FROM Categories");
    for (const c of categories) {
      lines.push(
        [
          fmt(c.idCategory),
          fmt(c.categoryName), // Corrected: categoryName
          fmt(c.description),
          fmt(c.displayOrder),
          fmt(c.imageUrl),
          fmt(c.isActive),
          fmt(c.isKitchen),
          fmt(c.createdAt),
        ].join(",")
      );
    }

    // 2. DailyReceipts
    console.log("🧾 Exporting DailyReceipts...");
    const [receipts] = await connection.execute("SELECT * FROM DailyReceipts");
    for (const r of receipts) {
      lines.push(
        [
          fmt(r.idDailyReceipt),
          fmtDateOnly(r.receiptDate),
          fmt(r.shiftNumber),
          fmt(r.openingCash),
          fmt(r.totalSales),
          fmt(r.totalExpenses),
          fmt(r.closingCash),
          fmt(r.expectedCash),
          fmt(r.discrepancy),
          fmt(r.openedBy),
          fmt(r.closedBy),
          fmt(r.openedAt),
          fmt(r.closedAt),
          fmt(r.isClosed),
          fmt(r.notes),
          fmt(r.createdAt),
        ].join(",")
      );
    }

    // 3. Expenses
    console.log("💸 Exporting Expenses...");
    const [expenses] = await connection.execute("SELECT * FROM Expenses");
    for (const e of expenses) {
      lines.push(
        [
          fmt(e.idExpense),
          fmtDateOnly(e.expenseDate),
          fmt(e.category),
          fmt(e.amount),
          fmt(e.description),
          fmt(e.receiptNumber),
          fmt(e.recordedBy),
          fmt(e.dailyReceiptId),
          fmt(e.createdAt),
        ].join(",")
      );
    }

    // 4. Orders
    console.log("🛒 Exporting Orders...");
    const [orders] = await connection.execute("SELECT * FROM Orders");
    for (const o of orders) {
      lines.push(
        [
          fmt(o.idOrder),
          fmt(o.orderNumber),
          fmt(o.orderType),
          fmt(o.tableNumber),
          fmt(o.status),
          fmt(o.totalAmount),
          fmt(o.cashierId), // Corrected: cashierId
          fmt(o.discount),
          fmt(o.orderDate), // Corrected: orderDate
          fmt(o.completedAt),
          fmt(o.cancelledAt),
          fmt(o.cancelReason), // Assuming this exists or returns NULL
          fmt(o.notes),
        ].join(",")
      );
    }

    // 5. Staff
    console.log("👥 Exporting Staff...");
    const [staff] = await connection.execute("SELECT * FROM Staff");
    for (const s of staff) {
      lines.push(
        [
          fmt(s.idStaff),
          fmt(s.fullName),
          fmt(s.email),
          fmt(s.phone),
          fmt(s.password), // Corrected: password
          fmt(s.role),
          fmtDateOnly(s.hireDate),
          fmt(s.salary),
          fmt(s.isActive),
          fmt(s.lastLogin),
          fmt(s.createdAt),
        ].join(",")
      );
    }

    // Write file
    const csvPath = path.join(__dirname, "../../cafe_management.csv");
    console.log(`💾 Writing ${lines.length} rows to ${csvPath}...`);
    await fs.writeFile(csvPath, lines.join("\n"));
    console.log("✅ Sync Complete!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await connection.end();
  }
}

main();
