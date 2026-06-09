import { AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/config/site";

export async function prepareTriggeredAlerts() {
  if (!prisma) return [];
  const alerts = await prisma.userPriceAlert.findMany({
    where: { status: AlertStatus.ACTIVE },
    include: { product: { include: { offers: { orderBy: { currentPrice: "asc" }, take: 1 } } } },
  });
  const triggered = alerts.filter((alert) => alert.product.offers[0] && Number(alert.product.offers[0].currentPrice) <= Number(alert.targetPrice));

  // Replace this console provider with Resend, SES, or another configured sender.
  if (process.env.ALERT_PROVIDER === "console") {
    for (const alert of triggered) {
      const unsubscribeUrl = `${siteUrl()}/alerts/unsubscribe/${alert.id}`;
      console.log(`Alert ready for ${alert.email}: ${alert.product.name}; unsubscribe=${unsubscribeUrl}`);
    }
  }
  await prisma.userPriceAlert.updateMany({
    where: { id: { in: triggered.map((alert) => alert.id) } },
    data: { status: AlertStatus.TRIGGERED, lastNotifiedAt: new Date() },
  });
  return triggered;
}
