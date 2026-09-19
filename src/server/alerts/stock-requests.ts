import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/config/site";
// listProducts, not listPublicProducts: the public wrapper is memoized with
// unstable_cache, which only exists inside a Next.js request and throws
// "Invariant: incrementalCache missing" from a standalone script. `publicSafe`
// is what the wrapper actually adds, so pass it through by hand.
import { listProducts } from "@/lib/catalog";
import { activeEmailProvider, sendAlertEmail, stockRequestEmailHtml } from "@/server/alerts/email";

// Closes the loop on StockRequest: someone searched for something the catalog
// did not have and left an email. Once that search starts returning products,
// tell them once and mark the row notified.
//
// Unlike UserPriceAlert this is a ONE-SHOT notification, not a subscription —
// there is nothing to unsubscribe from after it fires, which is why the row is
// simply marked `notified` instead of being given a status machine.

// Requests are grouped by `normalized`, so two people asking for the same thing
// cost one catalog query, not two.
const MAX_QUERIES_PER_RUN = 200;

export type FulfilledStockRequest = {
  email: string;
  query: string;
  productCount: number;
  notifiedVia: "none" | "console" | "resend" | "smtp";
};

export async function fulfilPendingStockRequests(): Promise<FulfilledStockRequest[]> {
  if (!prisma) return [];

  const pending = await prisma.stockRequest.findMany({
    where: { notified: false },
    select: { id: true, email: true, query: true, normalized: true },
    orderBy: { createdAt: "asc" },
  });
  if (!pending.length) return [];

  // One catalog probe per distinct term.
  const byTerm = new Map<string, typeof pending>();
  for (const request of pending) {
    const group = byTerm.get(request.normalized);
    if (group) group.push(request);
    else byTerm.set(request.normalized, [request]);
  }

  const provider = activeEmailProvider();
  // Without a transport every request below would be closed having told nobody,
  // and a one-shot notification cannot be re-sent once the row is marked. Say
  // so loudly and change nothing.
  if (!provider && process.env.ALERT_PROVIDER !== "console") {
    console.error(
      `[stock-requests] ${pending.length} pending request(s) but no email transport configured ` +
        "(set RESEND_API_KEY or SMTP_*). Not marking anything notified.",
    );
    return [];
  }

  const fulfilled: FulfilledStockRequest[] = [];
  for (const [, group] of [...byTerm].slice(0, MAX_QUERIES_PER_RUN)) {
    const term = group[0].query;
    let products: Awaited<ReturnType<typeof listProducts>> = [];
    try {
      products = await listProducts({ q: term, page: 1, pageSize: 3, publicSafe: true });
    } catch (error) {
      console.error(`[stock-requests] catalog lookup failed for "${term}":`, error);
      continue;
    }
    if (!products.length) continue;

    const searchUrl = new URL(`/search?q=${encodeURIComponent(term)}`, siteUrl()).toString();
    for (const request of group) {
      let notifiedVia: FulfilledStockRequest["notifiedVia"] = "none";
      if (provider) {
        const sent = await sendAlertEmail(
          request.email,
          `„${request.query}“ უკვე ფასმეტრზეა`,
          stockRequestEmailHtml({
            query: request.query,
            searchUrl,
            productCount: products.length,
            topProductName: products[0].name,
          }),
        );
        notifiedVia = sent ?? "none";
      } else {
        console.log(`[stock-requests] (console) ${request.email}: "${request.query}" → ${searchUrl}`);
        notifiedVia = "console";
      }

      // Only close the row when someone was actually told. A failed send stays
      // pending so the next run retries it.
      if (notifiedVia !== "none") {
        await prisma.stockRequest.update({ where: { id: request.id }, data: { notified: true } });
      }
      fulfilled.push({ email: request.email, query: request.query, productCount: products.length, notifiedVia });
    }
  }

  return fulfilled;
}
