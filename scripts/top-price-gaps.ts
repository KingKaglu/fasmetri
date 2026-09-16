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
 * A product whose CHEAPEST offer is out of stock is excluded by default. The
 * saving is real but unreachable: the visitor clicks, finds nothing to buy, and
 * concludes the site is wrong. Two of the ten products in the first ad kit were
 * in exactly that state. Pass --include-oos to see them anyway.
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
  const includeOutOfStock = process.argv.includes("--include-oos");

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
        select: { currentPrice: true, availability: true, shop: { select: { name: true } } },
      },
    },
  });

  const rows = products
    .map((product) => {
      const byShop = new Map<string, { price: number; availability: string }>();
      for (const offer of product.offers) {
        const price = Number(offer.currentPrice);
        const seen = byShop.get(offer.shop.name);
        if (seen === undefined || price < seen.price) {
          byShop.set(offer.shop.name, { price, availability: String(offer.availability) });
        }
      }
      if (byShop.size < 2) return null;
      const ranked = [...byShop.entries()].sort((a, b) => a[1].price - b[1].price);
      const cheapest = ranked[0][1];
      if (!includeOutOfStock && cheapest.availability === "OUT_OF_STOCK") return null;
      const prices = ranked.map(([, value]) => value.price);
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
        cheapestStock: cheapest.availability,
        shops: ranked.map(([shop, value]) => [shop, value.price, value.availability] as const),
      };
    })
    .filter(Boolean) as Array<{ name: string; slug: string; category: string; low: number; high: number; gap: number; pct: number; cheapestStock: string; shops: Array<readonly [string, number, string]> }>;

  rows.sort((a, b) => (byPct ? b.pct - a.pct : b.gap - a.gap));

  console.log(`${rows.length} genuine cross-shop comparisons${category ? ` in ${category}` : ""}; top ${Math.min(limit, rows.length)} by ${byPct ? "percentage" : "absolute saving"}:\n`);
  for (const row of rows.slice(0, limit)) {
    console.log(`${Math.round(row.gap).toString().padStart(5)} GEL  ${row.pct.toFixed(1).padStart(5)}%  ${row.category.padEnd(8)} ${row.name.slice(0, 44)}`);
    console.log(`                      ${row.shops.map(([shop, price, stock]) => `${shop} ${price}${stock === "OUT_OF_STOCK" ? " (out of stock)" : ""}`).join("  |  ")}`);
    console.log(`                      https://fasmetri.ge/products/${row.slug}`);
  }
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
