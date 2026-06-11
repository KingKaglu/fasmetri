import "./load-env";
import { appendFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

// Weekly catalog health checks (catalog-audit.yml). Read-only except for the
// CatalogHealthReport snapshot row. Checks:
//   1. Canonicals with 0 active offers (orphans — clutter the public catalog)
//   2. Active offers unlinked to a canonical for > 7 days (matcher gaps)
//   3. Active offers not seen by a sync in > 5 days (sync may be degraded)
//   4. Duplicate canonical titles within a category (merge candidates)

const UNLINKED_DAYS = 7;
const STALE_DAYS = 5;
const SAMPLE_LIMIT = 15;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const db = prisma;

  const [orphans, unlinked, stale, titleGroups] = await Promise.all([
    db.canonicalProduct.findMany({
      where: { offers: { none: { isActive: true } } },
      select: { id: true, title: true, categorySlug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.productOffer.findMany({
      where: { isActive: true, canonicalProductId: null, firstSeenAt: { lt: daysAgo(UNLINKED_DAYS) } },
      select: { id: true, title: true, url: true, firstSeenAt: true, shop: { select: { slug: true } } },
      orderBy: { firstSeenAt: "asc" },
    }),
    db.productOffer.findMany({
      where: { isActive: true, lastSeenAt: { lt: daysAgo(STALE_DAYS) } },
      select: { id: true, title: true, lastSeenAt: true, shop: { select: { slug: true } } },
      orderBy: { lastSeenAt: "asc" },
    }),
    db.canonicalProduct.groupBy({
      by: ["categorySlug", "normalizedTitle"],
      _count: { _all: true },
      having: { normalizedTitle: { _count: { gt: 1 } } },
    }),
  ]);

  const sections = [
    {
      label: `Orphan canonicals (0 active offers)`,
      count: orphans.length,
      samples: orphans.slice(0, SAMPLE_LIMIT).map((c) => `${c.categorySlug}: ${c.title}`),
    },
    {
      label: `Offers unlinked > ${UNLINKED_DAYS} days`,
      count: unlinked.length,
      samples: unlinked.slice(0, SAMPLE_LIMIT).map((o) => `${o.shop.slug}: ${o.title} (since ${o.firstSeenAt.toISOString().slice(0, 10)})`),
    },
    {
      label: `Offers not seen by sync > ${STALE_DAYS} days (sync degraded?)`,
      count: stale.length,
      samples: stale.slice(0, SAMPLE_LIMIT).map((o) => `${o.shop.slug}: ${o.title} (last seen ${o.lastSeenAt.toISOString().slice(0, 10)})`),
    },
    {
      label: `Duplicate canonical titles (merge candidates)`,
      count: titleGroups.length,
      samples: titleGroups.slice(0, SAMPLE_LIMIT).map((g) => `${g.categorySlug}: "${g.normalizedTitle}" ×${g._count._all}`),
    },
  ];

  const summaryLines = [`## Catalog health (${new Date().toISOString().slice(0, 10)})`, ""];
  for (const section of sections) {
    const icon = section.count === 0 ? "🟢" : "🟠";
    summaryLines.push(`### ${icon} ${section.label}: ${section.count}`);
    for (const sample of section.samples) summaryLines.push(`- ${sample}`);
    if (section.count > section.samples.length) summaryLines.push(`- … and ${section.count - section.samples.length} more`);
    summaryLines.push("");
  }
  const summary = summaryLines.join("\n");
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);

  const report = await db.catalogHealthReport.create({
    data: {
      orphanCanonicals: orphans.length,
      unlinkedOffers: unlinked.length,
      staleOffers: stale.length,
      duplicateTitleGroups: titleGroups.length,
      detailsJson: JSON.parse(
        JSON.stringify({
          generatedAt: new Date().toISOString(),
          thresholds: { unlinkedDays: UNLINKED_DAYS, staleDays: STALE_DAYS },
          sections: sections.map((s) => ({ label: s.label, count: s.count, samples: s.samples })),
        }),
      ),
    },
  });
  console.log(`[catalog-health] Snapshot saved (${report.id}).`);
}

main()
  .catch((error) => {
    console.error("[catalog-health] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
