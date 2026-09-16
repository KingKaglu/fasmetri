/**
 * Prints the biggest genuine cross-shop price gaps, newest prices first.
 *
 * This is the source for anything advertised. Prices move, and a figure that
 * has gone stale is worse than no figure at all: the comments correct it in
 * public, and accuracy is the only thing a comparison site really sells. Run
 * it before posting, and rebuild the ad kit from what it prints.
 *
 * Only offers the public catalogue actually shows are counted, and only the
 * cheapest offer per shop, so the gap quoted is the gap a visitor sees.
 *
 *   npm run gaps                 # top 15 by absolute saving
 *   npm run gaps -- --pct        # by percentage instead
 *   npm run gaps -- --category=laptops --limit=25
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";

const PUBLIC_MATCH_STATUSES = ["CONFIRMED", "SAFE_AUTO", "CANONICAL_CREATED"];

function arg(name: string) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const byPct = process.argv.includes("--pct");
  const limit = Number(arg("limit") ?? 15);
  const category = arg("category");
  // Percentage on a cheap item is loud but not useful to a buyer; keep a floor.
  const minPrice = Number(arg("min-price") ?? (byPct ? 300 : 0));

  const products = await prisma.product.findMany({
    where: {
      isPublic: true,
      archivedAt: null,
      ...(category ? { category: { slug: category } } : {}),
      offers: { some: { isActive: true } },
    },
    select: {
      name: true, slug: true,
      category: { select: { slug: true } },
      offers: {
        where: { isActive: true, verificationStatus: "CONFIRMED", matchStatus: { in: PUBLIC_MATCH_STATUSES } },
        select: { currentPrice: true, shop: { select: { name: true } } },
      },
    },
  });

  const rows = products
    .map((product) => {
      const byShop = new Map<string, number>();
      for (const offer of product.offers) {
        const price = Number(offer.currentPrice);
        const seen = byShop.get(offer.shop.name);
        if (seen === undefined || price < seen) byShop.set(offer.shop.name, price);
      }
      if (byShop.size < 2) return null;
      const prices = [...byShop.values()];
      const low = Math.min(...prices);
      const high = Math.max(...prices);
      if (low < minPrice) return null;
      return {
        name: product.name,
        slug: product.slug,
        category: product.category?.slug ?? "-",
        low, high,
        gap: high - low,
        pct: ((high - low) / low) * 100,
        shops: [...byShop.entries()].sort((a, b) => a[1] - b[1]),
      };
    })
    .filter(Boolean) as Array<{ name: string; slug: string; category: string; low: number; high: number; gap: number; pct: number; shops: Array<[string, number]> }>;

  rows.sort((a, b) => (byPct ? b.pct - a.pct : b.gap - a.gap));

  console.log(`${rows.length} genuine cross-shop comparisons${category ? ` in ${category}` : ""}; top ${Math.min(limit, rows.length)} by ${byPct ? "percentage" : "absolute saving"}:\n`);
  for (const row of rows.slice(0, limit)) {
    console.log(`${Math.round(row.gap).toString().padStart(5)} GEL  ${row.pct.toFixed(1).padStart(5)}%  ${row.category.padEnd(8)} ${row.name.slice(0, 44)}`);
    console.log(`                      ${row.shops.map(([shop, price]) => `${shop} ${price}`).join("  |  ")}`);
    console.log(`                      https://fasmetri.ge/products/${row.slug}`);
  }
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
