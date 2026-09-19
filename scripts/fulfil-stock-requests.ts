import "./load-env";
import { fulfilPendingStockRequests } from "../src/server/alerts/stock-requests";
import { prisma } from "../src/lib/prisma";

// Runs alongside the alert evaluation at the end of each sync workflow
// (npm run stock-requests:fulfil). Checks every pending StockRequest — someone
// searched for something we did not carry and left an email — against the
// freshly synced catalog, and notifies once when it finally appears.

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const fulfilled = await fulfilPendingStockRequests();
  const notified = fulfilled.filter((entry) => entry.notifiedVia !== "none");
  console.log(`[stock-requests] ${notified.length} of ${fulfilled.length} matched request(s) notified.`);
  for (const entry of fulfilled) {
    console.log(`  ${entry.email}: "${entry.query}" → ${entry.productCount} product(s) [${entry.notifiedVia}]`);
  }
}

main()
  .catch((error) => {
    console.error("[stock-requests] Fulfilment failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
