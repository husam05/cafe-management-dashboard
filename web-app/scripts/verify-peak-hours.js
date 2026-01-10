const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Load env
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = require("dotenv").parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const prisma = new PrismaClient();

async function verify() {
  console.log("Fetching orders and items...");
  // Explicitly select createdAt to be sure (REMOVED: createdAt)
  const orders = await prisma.sale.findMany({
    select: { id: true, businessDate: true }, // Removed createdAt
  });
  const items = await prisma.saleItem.findMany();

  console.log(`Orders: ${orders.length}`);
  console.log(`Items: ${items.length}`);

  const orderDateMap = new Map();
  orders.forEach((o) => {
    const d = o.businessDate ? new Date(o.businessDate) : null;
    if (d) orderDateMap.set(Number(o.id), d);
  });

  const hourCounts = {};
  let matchedCount = 0;

  items.forEach((item) => {
    const orderId = Number(item.saleId || item.orderId); // Schema says saleId maps to orderId
    const date = orderDateMap.get(orderId);
    if (date) {
      matchedCount++;
      const h = date.getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  });

  console.log(`Matched Items: ${matchedCount} / ${items.length}`);
  console.log("Peak Hours Distribution (Item Count):");
  console.log(hourCounts);

  if (Object.keys(hourCounts).length === 0) {
    console.error("FAIL: No hourly data found.");
    process.exit(1);
  } else {
    console.log("SUCCESS: Hourly data populated.");
  }
}

verify()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
