const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables - pointing to parent of scripts dir
const envPath = path.resolve(__dirname, "../.env.local");
console.log("Loading env from:", envPath);
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function checkFields() {
  console.log("--- Checking Shifts (DailyReceipts) ---");
  // Order by ID desc to see latest
  const shifts = await prisma.shift.findMany({
    take: 3,
    orderBy: { id: "desc" },
    select: {
      id: true,
      openedById: true,
      openedBy: {
        select: { fullName: true },
      },
    },
  });
  console.log("Shifts:", JSON.stringify(shifts, null, 2));

  console.log("\n--- Checking Expenses ---");
  const expenses = await prisma.expense.findMany({
    take: 3,
    orderBy: { id: "desc" },
  });
  console.log("Expenses first item keys:", Object.keys(expenses[0] || {}));

  // Check if category is a string or object
  if (expenses.length > 0) {
    console.log("Sample Expense Category:", expenses[0].category);
  }

  console.log("\n--- Checking Categories ---");
  const categories = await prisma.category.findMany({ take: 3 });
  console.log("Categories:", JSON.stringify(categories, null, 2));
}

checkFields()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
