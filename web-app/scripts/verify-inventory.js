const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function verifyInventory() {
  console.log("=".repeat(100));
  console.log("INVENTORY MANAGEMENT (إدارة المخزون) - DETAILED VERIFICATION");
  console.log("=".repeat(100));

  // Get all inventory items
  const inventory = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
  });

  console.log(`\n✓ Total Inventory Items: ${inventory.length}`);
  console.log("=".repeat(100));

  // Calculate totals
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let adequateStockCount = 0;

  console.log("\nDETAILED INVENTORY LIST:");
  console.log("-".repeat(100));
  console.log(
    "Item Name".padEnd(40) +
      "Current".padEnd(12) +
      "Min".padEnd(12) +
      "Max".padEnd(12) +
      "Unit".padEnd(10) +
      "Status"
  );
  console.log("-".repeat(100));

  inventory.forEach((item, index) => {
    const current = Number(item.currentStock || 0);
    const min = Number(item.minStock || 0);
    const max = Number(item.maxStock || 0);
    const cost = Number(item.costPerUnit || 0);
    const itemValue = current * cost;
    totalValue += itemValue;

    let status = "";
    if (current === 0) {
      status = "🔴 OUT OF STOCK";
      outOfStockCount++;
    } else if (current <= min) {
      status = "🟡 LOW STOCK";
      lowStockCount++;
    } else {
      status = "🟢 ADEQUATE";
      adequateStockCount++;
    }

    console.log(
      `${index + 1}. ${item.name}`.padEnd(40) +
        current.toString().padEnd(12) +
        min.toString().padEnd(12) +
        max.toString().padEnd(12) +
        (item.unit || "unit").padEnd(10) +
        status
    );
  });

  console.log("-".repeat(100));

  // Summary Statistics
  console.log("\nINVENTORY SUMMARY:");
  console.log("=".repeat(100));
  console.log(`✓ Total Items: ${inventory.length}`);
  console.log(`🟢 Adequate Stock: ${adequateStockCount} items`);
  console.log(`🟡 Low Stock: ${lowStockCount} items`);
  console.log(`🔴 Out of Stock: ${outOfStockCount} items`);
  console.log(`💰 Total Inventory Value: ${totalValue.toLocaleString()} IQD`);

  // Low Stock Details
  if (lowStockCount > 0 || outOfStockCount > 0) {
    console.log("\n⚠️  ITEMS REQUIRING ATTENTION:");
    console.log("-".repeat(100));

    const alertItems = inventory.filter((item) => {
      const current = Number(item.currentStock || 0);
      const min = Number(item.minStock || 0);
      return current <= min;
    });

    alertItems.forEach((item) => {
      const current = Number(item.currentStock || 0);
      const min = Number(item.minStock || 0);
      const shortage = min - current;

      console.log(`📦 ${item.name}`);
      console.log(`   Current: ${current} ${item.unit || "units"}`);
      console.log(`   Minimum: ${min} ${item.unit || "units"}`);
      if (current === 0) {
        console.log(`   ⚠️  CRITICAL: Item is completely out of stock!`);
      } else {
        console.log(
          `   ⚠️  Need to order: ${shortage} ${item.unit || "units"}`
        );
      }
      console.log("");
    });
  }

  // Category Analysis (if available)
  console.log("\nINVENTORY BY CATEGORY:");
  console.log("-".repeat(100));

  const categories = {};
  inventory.forEach((item) => {
    // Try to categorize by name patterns
    let category = "Other";
    const name = item.name.toLowerCase();

    if (
      name.includes("coffee") ||
      name.includes("قهو") ||
      name.includes("كوفي")
    ) {
      category = "Coffee";
    } else if (
      name.includes("milk") ||
      name.includes("حليب") ||
      name.includes("لبن")
    ) {
      category = "Dairy";
    } else if (name.includes("sugar") || name.includes("سكر")) {
      category = "Sweeteners";
    } else if (name.includes("tea") || name.includes("شاي")) {
      category = "Tea";
    } else if (name.includes("chocolate") || name.includes("شوكولا")) {
      category = "Chocolate";
    }

    if (!categories[category]) {
      categories[category] = { count: 0, items: [] };
    }
    categories[category].count++;
    categories[category].items.push(item.name);
  });

  Object.entries(categories).forEach(([cat, data]) => {
    console.log(`${cat}: ${data.count} items`);
    data.items.forEach((name) => console.log(`  - ${name}`));
  });

  console.log("\n" + "=".repeat(100));
  console.log("VERIFICATION COMPLETE");
  console.log("=".repeat(100));

  // Return summary for comparison
  return {
    totalItems: inventory.length,
    lowStock: lowStockCount,
    outOfStock: outOfStockCount,
    adequateStock: adequateStockCount,
    totalValue: totalValue,
  };
}

verifyInventory()
  .then((summary) => {
    console.log("\n✓ Database verification complete. Summary:");
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
