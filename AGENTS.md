# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

# TechnoBoom (JSON API store — no HTML scraping, no sitemap)
npm run discover:technoboom              # read-only: fetch the catalogue, write a snapshot + report
npm run scrape:technoboom:full           # listing + per-item spec dimensions, then promote raw offers
npm run sync:technoboom                  # price/stock refresh (one API call, reuses stored specs)

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

### TechnoBoom: API-only ingestion

`technoboom.ge` is a client-rendered Next.js storefront with **no sitemap and no
product markup in the served HTML**, so neither `ShopAdapter` hook can see a
product. `src/server/technoboom/sync.ts` reads the store's own public JSON API
instead:

- `GET /api/Items/web-items-short` — the entire catalogue (~684 items) in one call
- `GET /api/Items/web/{id}` — one item plus its spec dimensions
- `GET /api/Categories/web-categories` — taxonomy

Notes that matter when changing it:

- **There is no product-name field.** The storefront renders
  category / brand / subcategory / `description`, where `description` holds the
  model code. Titles are composed as `<Georgian noun> <BRAND> <MODEL>`.
- **Product URLs** follow the storefront's four-segment route:
  `/maincategory={m}/category={c}/subcategory={s}/item={id}`.
- **Spec text is matcher input, not prose.** Values are sanitized and parts are
  joined with `" | "`, because a trailing full stop turns `60HZ` into the token
  `60HZ.`, which `modelCodes()` then prefers over the real model code and which
  also breaks the screen-size regex after `inch`. An explicit `NN inch` token is
  emitted so televisions get a parent key at all.
- The store's own category is trusted: `categorizeProduct` scores an explicitly
  stated public category at 78, which clears the review threshold on its own.
  Before that, Georgian appliance titles matched none of the mostly-English
  keyword rules and fell through to `other`.
- The module is **raw-only**: it writes `RawOffer` rows through the shared
  `saveRawOffer` and leaves matching to normalize → match-offers-to-variants →
  recategorize.

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

`src/config/enabledStores.ts` — `STORE_CONFIGS` array controls which stores are enabled. Currently enabled: zoommer, ee, pcshop, technoboom, extra, veli, kontakt. Alta (Cloudflare), gorgia, domino, primestore, kalo, isurve, citrus, gaming_laptops are disabled.

Public categories (`PUBLIC_CATEGORY_SLUGS`) are mobiles, laptops, gaming,
televisions, audio, wearables plus the appliance scope opened for TechnoBoom:
home-appliances, small-appliances, beauty, refrigerators, washing-machines,
monitors, tv-mounts.

`scrapeShop()` in runner.ts checks `effectiveShop.enabled` AND `process.env.SCRAPER_ENABLED === "true"` before proceeding.

### Special Cases

- **EE outlet products**: URL path `/autleti/` → `breadcrumbs=["outlet"]`, `condition=outlet` — not compared as new-product prices
- **Checkpoint bug**: `--resume` shares a single `.codex-logs/checkpoints/{jobName}.json` across ALL categories. When looping over multiple categories, always reset offset to 0 and use `--offset=N` explicitly — never `--resume` across category boundaries.
- **grep on Windows**: `grep -P` fails on Windows Git-bash. Use `grep -Eo 'pattern'` (POSIX extended) instead.
- **The self-hosted GE runner is Windows**, so every multi-line `run:` step in a
  `runs-on: self-hosted` workflow executes in **PowerShell**, not bash. A bash
  loop (`for shop in a b; do … done`) is a parse error on its first line and
  kills the step immediately — this is what stopped `catalog-ingest.yml` from
  ever ingesting anything. Only `sync-watchdog.yml` may use bash: it runs on
  `ubuntu-latest`.
- **`--limit` is capped at 300.** `job-utils.clampLimit` silently clamps every
  batch script to 300 rows, so `--limit=800` processes 300 and looks like it
  finished. Loop over `--offset=0,300,600,…` for a catalogue bigger than that.
- **Connection pool**: the Supabase pooler runs session mode (port 5432) with a
  hard cap of 15 clients across Vercel, CI and any local script. Vercel now uses
  the transaction pooler (6543) so the syncs have headroom; CI stays on 5432
  because the sync modules guard themselves with session-scoped
  `pg_try_advisory_lock`. Always pass `DATABASE_POOL_MAX=1` from a local script.

### Safety Constraints

- Default mode must be dry-run for destructive catalog operations
- `CONFIRM_PRODUCT_RESET=true` env var required for destructive resets (`reset-product-catalog`)
- Do not show `RawOffer` data publicly (admin-only)
- Do not show uncertain matches publicly (`categoryNeedsReview=true` or unmatched variants)
- Do not scrape all stores simultaneously
- Do not run `import:all` without dry-run validation first
- Stop at EE — do not enable or import PCShop, Extra, Veli, or other stores without explicit instruction
