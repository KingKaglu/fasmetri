import "./load-env";
import { prepareTriggeredAlerts } from "../src/server/alerts/evaluate";
import { prisma } from "../src/lib/prisma";

// Runs at the end of each sync workflow (npm run alerts:evaluate). Evaluates
// ACTIVE UserPriceAlerts against fresh prices: triggered alerts are recorded
// as AlertEvent rows (and emailed when RESEND_API_KEY is configured), then
// marked TRIGGERED.

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const triggered = await prepareTriggeredAlerts();
  console.log(`[alerts] ${triggered.length} alert(s) triggered.`);
  for (const alert of triggered) {
    const offer = alert.product.offers[0];
    console.log(
      `  ${alert.email}: "${alert.product.name}" target ${Number(alert.targetPrice).toFixed(2)}` +
        ` → now ${Number(offer.currentPrice).toFixed(2)} (${offer.shop.name})`,
    );
  }
}

main()
  .catch((error) => {
    console.error("[alerts] Evaluation failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
