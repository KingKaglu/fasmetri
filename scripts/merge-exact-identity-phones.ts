/**
 * Merges phone products that are the same handset in different shops.
 *
 *   Zoommer            Apple iPhone 17 Pro Max | 256GB Cosmic Orange   3949
 *   Elite Electronics  Apple iPhone 17 Pro Max 256GB Cosmic Orange     4049.99
 *
 * Phones have no usable part number to match on — only EE prints one, and not
 * a single code appears in two shops — so identity has to come from the
 * attributes, and it only holds if ALL of brand, model, storage, colour and
 * SIM variant are present and equal. A group missing any one of them is
 * skipped rather than guessed at.
 *
 * SIM is read from the TITLE, not the stored spec. It is the one signal both
 * shops express comparably: Zoommer writes "e-SIM Only", EE appends "eSIM",
 * while the specs say "E Sim" at one shop and "Nano Sim + E Sim" at the other
 * and cannot be compared. An eSIM-only handset is a separate SKU at a separate
 * price — often 100 GEL below the physical-SIM one in the same shop — so
 * merging the two would invent a discount that does not exist.
 *
 *   npx tsx scripts/merge-exact-identity-phones.ts --dry-run
 *   npx tsx scripts/merge-exact-identity-phones.ts
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";

const dryRun = process.argv.includes("--dry-run");

function simOf(title: string) {
  const t = title.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return /\be ?sim\b/.test(t) ? "esim" : "physical";
}

function norm(value: unknown) {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]+/g, "") : value ? String(value) : "";
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");

  const raw = await prisma.rawOffer.findMany({
    where: {
      categorySlug: "mobiles",
      productOffer: { isActive: true, product: { isPublic: true, archivedAt: null, matchingLocked: false } },
    },
    select: {
      originalTitle: true,
      productIdentity: true,
      shop: { select: { name: true } },
      productOffer: {
        select: {
          id: true, currentPrice: true, productId: true,
          product: { select: { id: true, name: true, offers: { where: { isActive: true }, select: { id: true } } } },
        },
      },
    },
  });

  type Entry = {
    shop: string; title: string; offerId: string; price: string;
    productId: string; product: { id: string; name: string; offers: Array<{ id: string }> } | null;
  };
  const groups = new Map<string, Entry[]>();

  for (const row of raw) {
    const offer = row.productOffer;
    if (!offer) continue;
    const identity = (row.productIdentity ?? {}) as Record<string, unknown>;
    const specs = (identity.specs ?? {}) as Record<string, unknown>;
    const pick = (key: string) => identity[key] ?? specs[key];

    const parts = [
      norm(pick("brand")),
      norm(pick("model")),
      String(pick("storageGb") ?? pick("storage") ?? ""),
      norm(pick("color")),
      simOf(row.originalTitle),
    ];
    if (!parts.every(Boolean)) continue;

    const key = parts.join("|");
    groups.set(key, [...(groups.get(key) ?? []), {
      shop: row.shop.name,
      title: row.originalTitle,
      offerId: offer.id,
      price: String(offer.currentPrice),
      productId: offer.productId,
      product: offer.product,
    }]);
  }

  let merged = 0;
  let moved = 0;

  for (const [key, group] of groups) {
    if (new Set(group.map((entry) => entry.shop)).size < 2) continue;
    if (new Set(group.map((entry) => entry.productId)).size < 2) continue;

    // Prefer a surviving product whose own name agrees with the group's SIM
    // variant. Some names are stale — a physical-SIM group can otherwise end up
    // on a page titled "... Mist Blue eSIM", which reads as the wrong handset
    // even though every offer under it is right. Offer count breaks the tie
    // after that, since the richer product carries the history and images.
    const groupSim = key.split("|").at(-1);
    const keep = group
      .map((entry) => entry.product)
      .filter((product): product is NonNullable<Entry["product"]> => Boolean(product))
      .sort((a, b) => {
        const aFits = simOf(a.name) === groupSim ? 1 : 0;
        const bFits = simOf(b.name) === groupSim ? 1 : 0;
        return bFits - aFits || b.offers.length - a.offers.length;
      })[0];
    if (!keep) continue;

    const strays = group.filter((entry) => entry.productId !== keep.id);
    if (!strays.length) continue;

    merged += 1;
    moved += strays.length;
    console.log(`\n${key}  ->  ${keep.name.slice(0, 46)}`);
    for (const entry of group) {
      const mark = entry.productId === keep.id ? "keep" : "move";
      console.log(`  ${mark}  ${entry.shop.padEnd(18)} ${entry.price.padStart(9)}  ${entry.title.slice(0, 44)}`);
    }
    if (dryRun) continue;

    await prisma.productOffer.updateMany({
      where: { id: { in: strays.map((entry) => entry.offerId) } },
      data: { productId: keep.id },
    });

    for (const orphanId of new Set(strays.map((entry) => entry.productId))) {
      const left = await prisma.productOffer.count({ where: { productId: orphanId, isActive: true } });
      if (left === 0) {
        await prisma.product.update({ where: { id: orphanId }, data: { isPublic: false, archivedAt: new Date() } });
      }
    }
  }

  console.log(`\n${dryRun ? "would merge" : "merged"} ${merged} identity groups, moving ${moved} offers`);
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
