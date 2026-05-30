import "./load-env";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { findAdapter } from "../src/server/scrapers/shops";
import { saveRawOffer } from "../src/server/scrapers/runner";
import { robotsAllows, robotsPolicy } from "../src/server/scrapers/robots";
import { categorizeProduct } from "../src/lib/categorizeProduct";
import { extractProductIdentity } from "../src/lib/productIdentity";
import { prisma } from "../src/lib/prisma";

// ───────────────────────────────────────────────────────────────────────────
// Full-coverage importer.
//
// For each (store, category) it discovers EVERY product URL from the store's
// sitemaps and scrapes every one — no sampling, no popularity filter, no page
// cap. Each URL gets an explicit outcome (imported / failed / skipped) with a
// reason, so nothing is silently dropped. Writes a JSON import report plus a
// completeness check (discovered vs imported).
//
// Saves RawOffers (raw-only). Run the pipeline afterwards to publish:
//   normalize-raw-offers → match-offers-to-variants → recategorize-products
//
// IMPORTANT: Zoommer/EE return 403 to non-Georgian IPs — run this from Georgia
// (or a GE residential proxy). Set DATABASE_URL to the target (prod) database.
// ───────────────────────────────────────────────────────────────────────────

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)";
const DEFAULT_STORES = ["zoommer", "ee", "pcshop"];
const DEFAULT_CATEGORIES = ["mobiles", "laptops"];

// Which categories each store actually carries. PCShop is a computer store with
// no phones — without this guard its adapter returns the WHOLE catalog for the
// unsupported "mobiles" category (thousands of non-phone URLs).
const STORE_CATEGORIES: Record<string, string[]> = {
  zoommer: ["mobiles", "laptops"],
  ee: ["mobiles", "laptops"],
  pcshop: ["laptops"],
};
const BLOCK_ABORT_THRESHOLD = 10; // consecutive 403/429 before aborting a category

type UrlOutcome = { url: string; reason: string };

type CategoryReport = {
  store: string;
  category: string;
  productUrlsDiscovered: number;
  productPagesProcessed: number;
  imported: number;
  created: number;
  updated: number;
  duplicatesDetected: number;
  needsReview: number;
  failedUrls: UrlOutcome[];
  skippedUrls: UrlOutcome[];
  rows: { status: string; title: string; price: number; url: string }[];
  antiBotBlocks: number;
  abortedByAntiBot: boolean;
  startedAt: string;
  finishedAt: string;
};

type Args = {
  stores: string[];
  categories: string[];
  dryRun: boolean;
  skipExisting: boolean;
  limit?: number;
  offset: number;
  sample: number;
};

function parseArgs(): Args {
  const get = (name: string) => {
    const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split("=").slice(1).join("=") : undefined;
  };
  const list = (name: string, fallback: string[]) => {
    const v = get(name);
    return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback;
  };
  const num = (name: string) => {
    const v = get(name);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    stores: list("shop", DEFAULT_STORES),
    categories: list("category", DEFAULT_CATEGORIES),
    dryRun: process.argv.includes("--dry-run"),
    skipExisting: process.argv.includes("--skip-existing"),
    limit: num("limit"),
    offset: num("offset") ?? 0,
    sample: num("sample") ?? 3,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const delayMs = (base: number, robotsDelay?: number) => {
  const b = Math.max(base, robotsDelay ?? 0);
  return b + Math.floor(Math.random() * Math.max(300, Math.floor(b * 0.2)));
};

async function importCategory(store: string, category: string, args: Args): Promise<CategoryReport> {
  const startedAt = new Date().toISOString();
  const report: CategoryReport = {
    store, category,
    productUrlsDiscovered: 0, productPagesProcessed: 0,
    imported: 0, created: 0, updated: 0, duplicatesDetected: 0, needsReview: 0,
    failedUrls: [], skippedUrls: [], rows: [], antiBotBlocks: 0, abortedByAntiBot: false,
    startedAt, finishedAt: startedAt,
  };

  const adapter = findAdapter(store);
  if (!adapter?.listProductUrls || !adapter.parseProductPage) {
    report.skippedUrls.push({ url: "(adapter)", reason: "unsupported_adapter" });
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;

  // 1) Discover every product URL for this category (full sitemap).
  let discovered: string[] = [];
  try {
    discovered = [...new Set(await adapter.listProductUrls(category))].sort();
  } catch (error) {
    report.failedUrls.push({ url: "(sitemap discovery)", reason: errMsg(error) });
    report.finishedAt = new Date().toISOString();
    return report;
  }
  report.productUrlsDiscovered = discovered.length;

  // Chunking / sampling.
  let targets = discovered.slice(args.offset, args.limit ? args.offset + args.limit : undefined);
  if (args.dryRun) targets = targets.slice(0, args.sample);

  if (!targets.length) {
    report.finishedAt = new Date().toISOString();
    return report;
  }

  // Resolve the shop row (needed to save). Skipped in dry-run.
  let shopId = "";
  if (!args.dryRun) {
    if (!prisma) throw new Error("DATABASE_URL is required (set it to the target database).");
    const shop = await prisma.shop.upsert({
      where: { slug: adapter.slug },
      update: { name: adapter.name, baseUrl: adapter.baseUrl, needsConfiguration: adapter.needsConfiguration },
      create: { slug: adapter.slug, name: adapter.name, baseUrl: adapter.baseUrl, enabled: adapter.enabledByDefault, needsConfiguration: adapter.needsConfiguration },
    });
    shopId = shop.id;
  }

  const policy = await robotsPolicy(adapter.baseUrl);
  const batchId = `full-coverage:${store}:${category}:${Date.now()}`;
  const seenCanonical = new Set<string>();
  let consecutiveBlocks = 0;

  for (const rawUrl of targets) {
    const url = new URL(rawUrl, adapter.baseUrl);
    if (!robotsAllows(url, policy)) {
      report.skippedUrls.push({ url: rawUrl, reason: "robots_blocked" });
      continue;
    }

    // --skip-existing: if we already have this product, mark it "have" and don't
    // re-scrape it — only the genuinely missing products get fetched.
    if (args.skipExisting && !args.dryRun) {
      const existing = await prisma!.rawOffer
        .findUnique({
          where: { shopId_originalUrl: { shopId, originalUrl: url.toString() } },
          select: { originalTitle: true, rawPrice: true },
        })
        .catch(() => null);
      if (existing) {
        report.imported += 1;
        report.updated += 1;
        report.rows.push({ status: "have", title: existing.originalTitle ?? "", price: Number(existing.rawPrice) || 0, url: url.toString() });
        continue;
      }
    }

    await sleep(delayMs(adapter.rateLimitMs, policy.crawlDelayMs));

    let html: string;
    try {
      const res = await fetch(url, {
        headers: { "user-agent": userAgent, "accept-language": "ka-GE,ka;q=0.9,en;q=0.8" },
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
          report.antiBotBlocks += 1;
          consecutiveBlocks += 1;
          report.failedUrls.push({ url: rawUrl, reason: `anti_bot_${res.status}` });
          if (consecutiveBlocks >= BLOCK_ABORT_THRESHOLD) {
            report.abortedByAntiBot = true;
            console.log(`  ⚠ ${store}/${category}: ${consecutiveBlocks} consecutive ${res.status}s — aborting (anti-bot). Run from a Georgian IP / slower.`);
            break;
          }
        } else {
          report.failedUrls.push({ url: rawUrl, reason: `http_${res.status}` });
        }
        continue;
      }
      consecutiveBlocks = 0;
      html = await res.text();
    } catch (error) {
      report.failedUrls.push({ url: rawUrl, reason: errMsg(error) });
      continue;
    }

    let offer;
    try {
      offer = adapter.parseProductPage({ $: cheerio.load(html), html, url });
    } catch (error) {
      report.failedUrls.push({ url: rawUrl, reason: `parse_error: ${errMsg(error)}` });
      continue;
    }
    report.productPagesProcessed += 1;

    if (!offer) { report.failedUrls.push({ url: rawUrl, reason: "parse_failed_no_offer" }); continue; }
    if (!offer.url) { report.skippedUrls.push({ url: rawUrl, reason: "missing_url" }); continue; }
    if (!offer.title) { report.skippedUrls.push({ url: rawUrl, reason: "missing_title" }); continue; }
    if (!(offer.price > 0)) { report.skippedUrls.push({ url: rawUrl, reason: "missing_price" }); continue; }

    // Classification + duplicate signal (informational — duplicates are still imported).
    const decision = categorizeProduct({ title: offer.title, brand: offer.brand, model: offer.model, scrapedShopCategory: offer.categorySlug, breadcrumbs: offer.breadcrumbs });
    if (decision.needsReview) report.needsReview += 1;
    const identity = extractProductIdentity({ title: offer.title, brand: offer.brand, model: offer.model, categorySlug: decision.publicCategorySlug });
    if (identity.canonicalKey) {
      if (seenCanonical.has(identity.canonicalKey)) report.duplicatesDetected += 1;
      else seenCanonical.add(identity.canonicalKey);
    }

    if (args.dryRun) {
      report.imported += 1;
      report.rows.push({ status: "discovered", title: offer.title, price: offer.price, url: offer.url });
      continue;
    }

    try {
      const existed = await prisma!.rawOffer.findUnique({
        where: { shopId_originalUrl: { shopId, originalUrl: offer.url } },
        select: { id: true },
      });
      try {
        await saveRawOffer(shopId, offer, batchId);
      } catch (error) {
        // EE outlet products share an externalId/SKU with the new-condition item,
        // which violates the (shopId, externalId) unique constraint. Retry without
        // the colliding externalId so the offer still gets imported.
        if (/Unique constraint/i.test(errMsg(error)) && offer.externalId) {
          await saveRawOffer(shopId, { ...offer, externalId: undefined }, batchId);
        } else {
          throw error;
        }
      }
      report.imported += 1;
      if (existed) {
        report.updated += 1;
        report.rows.push({ status: "have", title: offer.title, price: offer.price, url: offer.url });
      } else {
        report.created += 1;
        report.rows.push({ status: "added", title: offer.title, price: offer.price, url: offer.url });
      }
    } catch (error) {
      report.failedUrls.push({ url: rawUrl, reason: `save_failed: ${errMsg(error)}` });
    }
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

function errMsg(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function printReport(r: CategoryReport) {
  const gap = r.productUrlsDiscovered - r.imported;
  const line = `${r.store} ${r.category}: ${r.productUrlsDiscovered} URLs discovered, ${r.imported} imported, ${r.failedUrls.length} failed, ${r.skippedUrls.length} skipped`;
  console.log(`\n  ── ${line}`);
  console.log(`     created=${r.created} updated=${r.updated} duplicates=${r.duplicatesDetected} needsReview=${r.needsReview} antiBotBlocks=${r.antiBotBlocks}${r.abortedByAntiBot ? " (ABORTED)" : ""}`);
  if (gap > 0) console.log(`     ⚠ COMPLETENESS: ${gap} discovered URL(s) not imported — see failed/skipped lists in the report JSON.`);
  for (const f of r.failedUrls.slice(0, 5)) console.log(`       ✗ failed  ${f.reason}  ${f.url}`);
  for (const s of r.skippedUrls.slice(0, 5)) console.log(`       • skipped ${s.reason}  ${s.url}`);
}

async function main() {
  const args = parseArgs();
  console.log("═".repeat(70));
  console.log(`  FULL-COVERAGE IMPORT  ${args.dryRun ? "[DRY RUN — discovery + sample parse, no DB writes]" : "[LIVE]"}`);
  console.log(`  stores=${args.stores.join(",")}  categories=${args.categories.join(",")}` +
    `${args.limit ? `  limit=${args.limit}` : ""}${args.offset ? `  offset=${args.offset}` : ""}${args.dryRun ? `  sample=${args.sample}` : ""}`);
  console.log("═".repeat(70));

  if (!args.dryRun && !prisma) {
    console.error("DATABASE_URL is required for a live run. Set it to the target database.");
    process.exit(1);
  }

  const reports: CategoryReport[] = [];
  for (const store of args.stores) {
    for (const category of args.categories) {
      const supported = STORE_CATEGORIES[store];
      if (supported && !supported.includes(category)) {
        console.log(`\n→ ${store} / ${category} … skipped (store does not carry ${category})`);
        continue;
      }
      console.log(`\n→ ${store} / ${category} …`);
      const report = await importCategory(store, category, args);
      printReport(report);
      reports.push(report);
    }
  }

  // Persist the full report (+ failed/skipped URLs).
  const dir = path.join(process.cwd(), ".codex-logs", "import-reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `full-coverage-${args.dryRun ? "dryrun-" : ""}${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: args.dryRun, args, reports }, null, 2));

  // Excel-compatible CSV (UTF-8 BOM) — every product with its status:
  //   added = newly imported (we didn't have it) · have = already in DB ·
  //   failed / skipped = with reason.
  const csvFile = path.join(dir, `products-${args.dryRun ? "dryrun-" : ""}${stamp}.csv`);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["store,category,status,title,price,url,reason"];
  for (const r of reports) {
    for (const row of r.rows) lines.push([r.store, r.category, row.status, row.title, row.price, row.url, ""].map(esc).join(","));
    for (const f of r.failedUrls) lines.push([r.store, r.category, "failed", "", "", f.url, f.reason].map(esc).join(","));
    for (const s of r.skippedUrls) lines.push([r.store, r.category, "skipped", "", "", s.url, s.reason].map(esc).join(","));
  }
  fs.writeFileSync(csvFile, "﻿" + lines.join("\r\n"), "utf8");
  console.log(`  Excel/CSV written: ${csvFile}`);

  // Summary table + per-store phone/laptop totals.
  console.log("\n" + "═".repeat(70));
  console.log("  COVERAGE SUMMARY");
  console.log("  " + "STORE".padEnd(10) + "CATEGORY".padEnd(10) + "DISCOVERED".padStart(11) + "IMPORTED".padStart(10) + "FAILED".padStart(8) + "SKIPPED".padStart(9));
  let anyGap = false;
  for (const r of reports) {
    const gap = r.productUrlsDiscovered - r.imported;
    if (gap > 0) anyGap = true;
    console.log("  " + r.store.padEnd(10) + r.category.padEnd(10) + String(r.productUrlsDiscovered).padStart(11) + String(r.imported).padStart(10) + String(r.failedUrls.length).padStart(8) + String(r.skippedUrls.length).padStart(9) + (gap > 0 ? "  ⚠" : ""));
  }
  const phones = reports.filter((r) => r.category === "mobiles");
  const laptops = reports.filter((r) => r.category === "laptops");
  console.log(`\n  Phones imported:  ${phones.reduce((s, r) => s + r.imported, 0)}  (${phones.map((r) => `${r.store}:${r.imported}`).join(", ")})`);
  console.log(`  Laptops imported: ${laptops.reduce((s, r) => s + r.imported, 0)}  (${laptops.map((r) => `${r.store}:${r.imported}`).join(", ")})`);
  if (anyGap) console.log("\n  ⚠ Some categories have discovered > imported. Inspect the report JSON's failedUrls/skippedUrls.");
  console.log(`\n  Report written: ${file}`);
  if (!args.dryRun) {
    console.log("\n  Next: publish the imported offers:");
    console.log("    npm run normalize-raw-offers -- --limit=100000");
    console.log("    npm run match-offers-to-variants -- --limit=100000");
    console.log("    npm run recategorize-products -- --limit=100000");
  }
  console.log("═".repeat(70));
}

main()
  .finally(async () => { if (prisma) await prisma.$disconnect(); })
  .catch((error) => { console.error(errMsg(error)); process.exit(1); });
