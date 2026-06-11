import { AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/config/site";

type NotifiedVia = "none" | "console" | "resend";

// Sends one alert email through Resend's plain HTTP API when RESEND_API_KEY
// is configured. Returns false (and logs) on any failure so the alert is
// still recorded as an AlertEvent and marked TRIGGERED.
async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM ?? "Fasmetri <alerts@fasmetri.ge>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!response.ok) {
      console.error(`[alerts] Resend send failed (${response.status}): ${(await response.text().catch(() => "")).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[alerts] Resend send failed:", error);
    return false;
  }
}

export async function prepareTriggeredAlerts() {
  if (!prisma) return [];
  const alerts = await prisma.userPriceAlert.findMany({
    where: { status: AlertStatus.ACTIVE },
    include: {
      product: {
        include: {
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
            include: { shop: { select: { name: true } } },
          },
        },
      },
    },
  });
  const triggered = alerts.filter((alert) => alert.product.offers[0] && Number(alert.product.offers[0].currentPrice) <= Number(alert.targetPrice));

  for (const alert of triggered) {
    const offer = alert.product.offers[0];
    const unsubscribeUrl = `${siteUrl()}/alerts/unsubscribe/${alert.id}`;
    let notifiedVia: NotifiedVia = "none";

    if (process.env.RESEND_API_KEY) {
      const price = Number(offer.currentPrice).toFixed(2);
      const sent = await sendResendEmail(
        alert.email,
        `ფასი დაიკლო: ${alert.product.name} — ${price} ₾`,
        `<p>${alert.product.name} ახლა ${price} ₾ ღირს (${offer.shop.name}) — შენი სამიზნე ფასი იყო ${Number(alert.targetPrice).toFixed(2)} ₾.</p>` +
          `<p><a href="${offer.url}">მაღაზიაში ნახვა</a></p>` +
          `<p><a href="${unsubscribeUrl}">გამოწერის გაუქმება</a></p>`,
      );
      if (sent) notifiedVia = "resend";
    } else if (process.env.ALERT_PROVIDER === "console") {
      console.log(`Alert ready for ${alert.email}: ${alert.product.name}; unsubscribe=${unsubscribeUrl}`);
      notifiedVia = "console";
    }

    // Always record the event so /admin can see what fired even without email.
    await prisma.alertEvent.create({
      data: {
        alertId: alert.id,
        email: alert.email,
        productId: alert.productId,
        productName: alert.product.name,
        targetPrice: alert.targetPrice,
        offerPrice: offer.currentPrice,
        shopName: offer.shop.name,
        notifiedVia,
      },
    });
  }

  await prisma.userPriceAlert.updateMany({
    where: { id: { in: triggered.map((alert) => alert.id) } },
    data: { status: AlertStatus.TRIGGERED, lastNotifiedAt: new Date() },
  });
  return triggered;
}
