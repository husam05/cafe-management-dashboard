const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspect() {
  // Access internal dmmf if available
  // or just try to create one expense to see error
  try {
    // Log dmmf
    const dmmf = await prisma._getDmmf(); // Private API, might not work in all versions
    const expenseModel = dmmf.datamodel.models.find(
      (m) => m.name === "Expense"
    );
    console.log(JSON.stringify(expenseModel, null, 2));
  } catch (e) {
    console.log("Could not accessing DMMF:", e.message);
  }

  // Fallback: try to select just ID
  try {
    console.log("Trying to select just ID...");
    const res = await prisma.expense.findFirst({
      select: { id: true },
    });
    console.log("Success selection ID:", res);
  } catch (e) {
    console.log("Failed selecting ID:", e.message);
  }
}

inspect().finally(() => prisma.$disconnect());
