# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

ფასმეტრი (Fasmetri) is a Georgian e-commerce price comparison platform. It scrapes product data from Georgian online shops, normalizes and matches offers across stores, and presents a unified catalog to users.

## Commands

```bash
# Development
npm run dev          # Next.js dev server (webpack)
npm run build        # Production build
npm run lint         # TypeScript type-check only (tsc --noEmit)

# Database
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run migrations (dev)
npm run db:deploy    # Apply migrations (production)

# Catalog pipeline (run in order after ingestion)
npm run normalize-raw-offers -- --shop=zoommer --limit=300
npm run match-offers-to-variants -- --limit=300
npm run recategorize-products -- --limit=300
npm run catalog-coverage

# Ingestion (raw-only — saves RawOffer, no Product/ProductOffer)
npm run import:store:full -- --shop=zoommer --category=mobiles --limit=300 --offset=0
npm run import:store:full -- --shop=ee --category=mobiles --limit=300 --offset=0

# Validation
npm run validate-category-assignments
npm run validate-variant-matching
npm run audit-public-catalog
```

All batch scripts accept `--limit`, `--offset`, `--shop`, `--category`, `--dry-run`, and `--resume`. `--resume` reads from `.codex-logs/checkpoints/{jobName}.json` — **one file per job name, shared across all categories** — so use explicit `--offset=N` instead of `--resume` when looping over multiple categories.

## Architecture

### Stack

- **Next.js 16** App Router with React Server Components, TypeScript strict mode, Tailwind CSS v4
- **Prisma 7** with `@prisma/adapter-pg` (PgAdapter + connection pooling, not the default Prisma client)
- **PostgreSQL** — schema in `prisma/schema.prisma`
- Scripts run with `tsx` (no compilation step)

### Two Adapter Systems

There are two parallel adapter patterns — understanding the distinction is critical:

**`src/server/scrapers/shops/` — `ShopAdapter`** (legacy, used by `scrape.ts`)
- One file per shop (zoommer.ts, ee.ts, alta.ts, …)
- Implements `listProductUrls()`, `parseProductDetail()`, `categoryProductPathPrefixes`, `preferProductUrlsForCategory`
- Used by `src/server/scrapers/runner.ts` for actual HTTP scraping
- `scrape.ts` needs `--live` flag (sets `SCRAPER_ENABLED=true`); `import-store.ts` sets it automatically

**`src/server/stores/` — `StoreAdapter`** (newer, used for coverage/dry-run)
- Implements coverage maps, dry-run URLs, category status (`ready`/`needs_configuration`/`unsupported`)
- Used by admin coverage reports and `import-store.ts` for validation before scraping

### Data Ingestion Pipeline

```
import-store.ts (rawOnly mode)
  → ShopAdapter.listProductUrls()   ← sitemap-based URL discovery
  → runner.scrapeShop()             ← HTTP scrape + parse
  → saveRawOffer()                  ← upserts RawOffer on (shopId, originalUrl)
                                       sets canonicalKey, categorySlug, productIdentity

normalize-raw-offers.ts
  → RawOffer (PENDING) → NORMALIZED  ← title normalization, identity extraction

match-offers-to-variants.ts
  → NORMALIZED RawOffer → ProductVariant/ProductOffer
  → only processes: status IN [NORMALIZED, ATTACHED], rawPrice NOT NULL,
    categoryNeedsReview=false, canonicalParentKey+canonicalVariantKey set

recategorize-products.ts
  → fixes products where categoryNeedsReview=true
```

`saveRawOffer` upserts on `shopId_originalUrl` unique constraint — safe to re-run.

### Sitemap-Based Product Discovery

- **Zoommer**: `loadProductUrlsFromIndexes(["https://zoommer.ge/sitemap_index.xml"])` — fetches all ~74 sub-sitemaps per call (~1-2 min per batch). Filters by `categoryProductPathPrefixes` regexes.
- **EE**: `fetchSitemapLocs()` called directly on per-category product sitemap URLs (NOT `loadProductUrlsFromIndexes` — that's two-stage and won't work on leaf sitemaps). Per-category sitemaps defined in `EE_CATEGORY_SITEMAPS`.

`preferProductUrlsForCategory: true` + `listProductUrls(categorySlug)` triggers `scrapeProductMode` in runner.ts. With `--limit`/`--offset`, uses `stableBatch=true` → `uniqueUrls.slice(offset, offset+limit)` for deterministic pagination.

### Product Identity & Matching

- `src/lib/productIdentity.ts` — extracts brand, model, storage, RAM, color, variant attributes
- `src/lib/productMatching.ts` — multi-signal scoring: title similarity, identity match, canonical keys
- `src/lib/productNormalization.ts` — title cleaning, noise word removal
- `src/lib/variantMatching.ts` — groups normalized offers into product variants
- `src/config/productAliases.ts` — brand/model name normalizations
- `src/config/matchingRules.ts` — scoring thresholds and decision rules

Canonical key format: `brand|model|ram|storage|color` (e.g. `xiaomi|poco_f7_ultra|12gb|256gb|yellow`)

### Category System

- `src/config/categoryMapping.ts` — `FasmetriCategorySlug` union type, `PUBLIC_CATEGORY_TAXONOMY`
- `src/config/categoryRules.ts` — keyword/negative-keyword rules for auto-categorization
- `src/lib/categorizeProduct.ts` — assigns categorySlug + sets `categoryNeedsReview` flag
- 19 Zoommer categories, 18 EE categories — slugs must match `FasmetriCategorySlug`

### Store Configuration

`src/config/enabledStores.ts` — `STORE_CONFIGS` array controls which stores are enabled. Currently enabled: zoommer, alta, ee, pcshop, extra, veli. Gorgia, domino, kontakt, primestore, kalo, isurve, citrus, gaming_laptops are disabled.

`scrapeShop()` in runner.ts checks `effectiveShop.enabled` AND `process.env.SCRAPER_ENABLED === "true"` before proceeding.

### Special Cases

- **EE outlet products**: URL path `/autleti/` → `breadcrumbs=["outlet"]`, `condition=outlet` — not compared as new-product prices
- **Checkpoint bug**: `--resume` shares a single `.codex-logs/checkpoints/{jobName}.json` across ALL categories. When looping over multiple categories, always reset offset to 0 and use `--offset=N` explicitly — never `--resume` across category boundaries.
- **grep on Windows**: `grep -P` fails on Windows Git-bash. Use `grep -Eo 'pattern'` (POSIX extended) instead.

### Safety Constraints

- Default mode must be dry-run for destructive catalog operations
- `CONFIRM_PRODUCT_RESET=true` env var required for destructive resets (`reset-product-catalog`)
- Do not show `RawOffer` data publicly (admin-only)
- Do not show uncertain matches publicly (`categoryNeedsReview=true` or unmatched variants)
- Do not scrape all stores simultaneously
- Do not run `import:all` without dry-run validation first
- Stop at EE — do not enable or import PCShop, Extra, Veli, or other stores without explicit instruction

## Adding a New Store

This documents the **per-store sync pipeline** (`src/server/{store}{Category}/sync.ts`) — the system that actually runs in production via GitHub Actions. It is separate from (and newer than) the legacy `import-store.ts` / `ShopAdapter` pipeline described above. The sync pipeline does NOT use `src/config/enabledStores.ts` or `SCRAPER_ENABLED` — those only gate the legacy pipeline.

### 1. How an existing store sync works

There are four self-contained sync modules, one per store+category (each ~1600 lines, deliberately copy-pasted rather than abstracted):

| Module | CLI wrapper | Listing source | Category |
|---|---|---|---|
| `src/server/zoommerPhones/sync.ts` | `scripts/zoommer-phones.ts` | JSON API | mobiles (id 855) |
| `src/server/zoommerLaptops/sync.ts` | `scripts/zoommer-laptops.ts` | JSON API | laptops (id 531) |
| `src/server/eePhones/sync.ts` | `scripts/ee-phones.ts` | HTML `__NEXT_DATA__` | mobiles (id 377) |
| `src/server/eeLaptops/sync.ts` | `scripts/ee-laptops.ts` | HTML `__NEXT_DATA__` | laptops (id 58) |

**Modes** (`--mode=`): `discover` (listing only, no detail pages), `prices` (listing + detail pages only for new/changed offers), `full` (listing + all detail pages), `validate` / `promote` (re-read last snapshot from disk). DB writes happen only with `--promote` and never with `--dry-run`. Scheduled jobs run `--mode=prices --promote` every 3h and `--mode=full --promote` nightly (see `package.json` scripts `sync:{store}:{cat}` / `scrape:{store}:{cat}:full`).

**Listing / pagination:**
- **Zoommer**: first GET the category HTML page to harvest the `zoommer-access_token` cookie from `Set-Cookie`, then page through the JSON API `https://zoommer.ge/api/proxy/v1/Products/v3?CategoryId={id}&Page={n}&Limit=28` (must send `os: web`, `referer`, and the cookie). Total pages = `ceil(productsCount / 28)`.
- **EE**: GET plain category pages `https://ee.ge/en/{slug}-c{id}t?page={n}` (16 products/page), parse the `__NEXT_DATA__` script tag → `props.pageProps.initialListingData.products`. Keeps paging until a page returns no *new* product keys (overshoots `totalPagesExpected` by one to confirm exhaustion).

**Listing fields extracted**: `name`, `price` / `previousPrice` / `discountAmount` / `discountPercent`, `isInStock` (EE also `storageQuantity` + `disableBuyButton`), `imageUrl`, `barCode` (→ sku/productCode), `routeEn`/`route` (→ product URL), `brandName`, `categoryId`. The numeric product id comes from the listing `id` field or the `-p{digits}` URL suffix.

**Detail pages**: fetch the product URL HTML, parse `__NEXT_DATA__` → `props.pageProps.initialProductData.product` (+ `sharePageData`), flatten `specificationGroup`/`keySpecification` into `{groupName, specificationName, specificationMeaning}` rows, then normalize into typed specs (brand, model, storageGb, ramGb, color, simType, chipset, battery, … — laptops have CPU/GPU/screen instead). Spec lookups accept both English and Georgian spec names. In `prices` mode a detail page is only fetched when the offer is new, its title changed, or its stored `rawSpecsJson` has no normalized specs — otherwise prior specs are merged in from the existing `RawOffer`.

**Politeness/limits**: 450ms between listing pages, 1250ms between detail fetches, detail concurrency 2, 2 retries with exponential backoff, 25s/35s timeouts, UA `FasmetriPriceBot/0.1 (+hello@fasmetri.ge)` (override with `SCRAPER_USER_AGENT`).

**Snapshot + validation**: every scrape writes a raw snapshot to `.codex-logs/{job}/raw/*.json` and a report to `reports/`. `validateSnapshot` produces **hard failures** that block promotion (and exit 1): wrong-category products, duplicate uniqueKeys, non-store URLs, listing pagination not exhausted, >10% missing prices, and — critically — new product count < 70% of the currently active DB count (protects the catalog from a partial scrape marking everything inactive).

**Concurrency guards**: a file lock in `.codex-logs/` (auto-expires after 6h) plus a Postgres advisory lock (`pg_try_advisory_lock`) with a per-module `ADVISORY_LOCK_ID` (convention: `{categoryId}{YYYYMMDD}`, e.g. 855 → `85520260605`).

### 2. How matching / deduplication works

There are two layers:

**Layer 1 — within-store identity (in each sync's `promoteSnapshot`):**
- `uniqueKey = "{store}:{sourceCategory}:{productId}"` (e.g. `zoommer:mobile-phones:12345`); falls back to a sha1 of the URL if no id.
- `RawOffer` upserted on `@@unique([shopId, originalUrl])`; `ProductOffer` upserted on `@@unique([shopId, url])`. Both are idempotent — re-running a sync is safe.
- Each offer gets a **store-scoped** `Product` found by `canonicalKey = uniqueKey` (so each store initially gets its own Product row); slug collisions on create are retried with a hash suffix.
- A `PriceHistory` row is appended only when `currentPrice` or `oldPrice` changed.
- **Disappearance handling**: offers whose URL is absent from the latest listing get `missedSyncCount += 1`, availability → `OUT_OF_STOCK`, `possiblyInactiveAt` set; after **3 consecutive misses** they become `isActive=false`, `matchStatus/verificationStatus = REJECTED`, and the linked RawOffer → `EXCLUDED`. A reappearing URL resets all of this.

**Layer 2 — cross-store canonical matching (`scripts/match-products.ts`, `npm run match:phones` / `match:laptops`):**
- Reads `RawOffer`s (`categoryNeedsReview=false`, `rawPrice` set, not excluded), normalizes each into a `SafeProductIdentity` via `src/server/matching/safeProductMatcher.ts` (`SAFE_MATCHER_VERSION = "safe-products-v1"`). Brand + (model or modelCode) are required, otherwise the offer is rejected.
- Candidates = `CanonicalProduct`s with the **same category and same brand**. Scoring is additive with **hard conflicts** (different storage/RAM/CPU/color/suffix when both sides know the value → instant `REJECTED`) and **caps** (unknown values cap the max confidence, e.g. unknown storage caps at 70). Bands: `AUTO` (≥70, phones and laptops) auto-links the offer; `WEAK` (60–69 phones / 65–69 laptops) writes a `PossibleMatch` row for admin review (never auto-links); otherwise a **new** `CanonicalProduct` + legacy `Product` is created with `canonicalKey = exactKey` (`phone|{brand}|{model}|{storage}|{ram}|{sim}|{color}`).
- An offer that already has a confident link is never silently moved to a different canonical — a `PossibleMatch` is written instead.
- Display-level dedupe: `productView` in `src/lib/catalog.ts` keeps only the **cheapest offer per shop** for each product (color variants share a product record).

### 3. Steps to add a new store (e.g. "alta" phones)

1. **Recon the site first**: find how listings paginate (JSON API like Zoommer, or `__NEXT_DATA__` HTML like EE), where the product detail data lives, the product-id pattern in URLs, and the category page URL + id. Use `--mode=discover` output to verify counts against the website.
2. **Create the sync module** `src/server/altaPhones/sync.ts`: copy `zoommerPhones/sync.ts` (JSON API stores) or `eePhones/sync.ts` (`__NEXT_DATA__` stores) and change:
   - Constants: `STORE`, `SOURCE`, `SOURCE_CATEGORY`, `FASMETRI_CATEGORY` (must be a valid `FasmetriCategorySlug` — `mobiles`/`laptops` for the public MVP), `CATEGORY_ID`, `CATEGORY_URL`, `PAGE_LIMIT`, and a **unique** `ADVISORY_LOCK_ID`.
   - `discoverListing` / `fetchCategoryPage` / `scrapeDetail` for the store's HTML/API shape.
   - The category validation guard (`isMobilePhoneListing` equivalent) and the `Shop`/`Category` upserts in `promoteSnapshot` (name, baseUrl).
   - Snapshot/report/lock file names and log strings.
3. **Create the CLI wrapper** `scripts/alta-phones.ts` (copy any existing one, swap the import) and add `package.json` scripts: `"sync:alta:phones": "tsx scripts/alta-phones.ts --mode=prices --promote"` and `"scrape:alta:phones:full": "... --mode=full --promote"`.
4. **DB registration is automatic** — `promoteSnapshot` upserts the `Shop` (by slug) and `Category` (by slug) on first promote. No manual inserts, no `enabledStores.ts` change needed for the sync pipeline.
5. **Allowlist the store's image CDN** in two places: `next.config.ts` `images.remotePatterns` and `nextOptimizedHosts` in `src/components/product-image.tsx` (images load through wsrv.nl with a direct fallback).
6. **GitHub Action**: copy `.github/workflows/zoommer-phones-sync.yml` → `alta-phones-sync.yml`. It needs the `DATABASE_URL` secret, `DATABASE_POOL_MAX: "1"` (Supabase pooler), and the "Ensure sync columns exist" step (`npx prisma db execute --file prisma/migrations/20260605000000_zoommer_phone_sync_state/migration.sql` — idempotent `ADD COLUMN IF NOT EXISTS`). **Stagger the crons** — existing slots are `0/15/30/45 */3 * * *` for price syncs and `2:20/2:40/3:00/3:10` UTC for nightly fulls; pick free slots. Note the step `if:` conditions compare `github.event.schedule` against the **exact cron string** — if you change a cron, update the matching `if:` too.
7. **Roll out in this order**, locally:
   ```bash
   npx tsx scripts/alta-phones.ts --mode=discover            # listing only, no DB writes
   npx tsx scripts/alta-phones.ts --mode=full --dry-run      # + details, check reports/ for hardFailures/warnings
   npx tsx scripts/alta-phones.ts --mode=full --promote      # first real promotion
   npm run match:phones -- --shop=alta --dry-run             # cross-store matching preview
   npm run match:phones -- --shop=alta                       # link/create canonicals; review PossibleMatch rows in admin
   ```

### 4. Gotchas

- **Prisma 7 externalId conflict (fixed pattern — keep it)**: `RawOffer` and `ProductOffer` both have `@@unique([shopId, externalId])`. Upserts key on URL, so if a store reuses/changes a product's URL the upsert can hit a P2002 on `externalId` held by another row. Both the syncs and `match-products.ts` catch P2002-mentioning-`externalId` and **retry once with `externalId: null`**. Replicate this in any new store sync.
- **Low-count guard on first run**: passes trivially for a new store (old active count = 0), but if a later scrape is blocked/partial, the 70% guard aborts promotion — that's intentional; don't "fix" it by promoting anyway.
- **Skipped ≠ dropped**: offers missing a price or title are skipped from `ProductOffer` but still upserted as `RawOffer` (with error context) so nothing is lost.
- **EE availability** is not just `isInStock` — it falls back to `storageQuantity > 0 && !disableBuyButton`. EE `previousPrice` is only honored when it's actually greater than the current price.
- **URL churn looks like removal**: the disappearance logic keys on URL, so a store-side URL change marks the old offer inactive after 3 misses and creates a fresh offer/product. Cross-store matching re-merges them at the canonical level.
- **Advisory lock ids must be unique per module** or two syncs will block each other; follow the `{categoryId}{YYYYMMDD}` convention.
- **`DATABASE_POOL_MAX=1` in CI** — the Supabase pooler chokes on more; the Prisma client uses `@prisma/adapter-pg`, not the default engine.
- **Don't bypass validation**: `--mode=promote` re-reads the *last snapshot from disk* and still runs `validateSnapshot`. Hard failures intentionally exit 1 so the GitHub Action shows red.
- **`isExternalIdConflict` also matches plain-text errors** (the adapter-pg error path doesn't always produce a `PrismaClientKnownRequestError`), which is why it string-matches `"externalId"` in addition to checking `error.code === "P2002"`.
