# ფასმეტრი (Fasmetri)

Fasmetri is an **independent** Georgian price-comparison platform. The public MVP
compares **mobile phones and laptops only** across a few stable Georgian online
stores (Zoommer, EE.ge / Elite Electronics, PCShop) and answers one question:
*"Where can I buy this phone or laptop cheaper in Georgia?"*

Built with **Next.js 16** (App Router), **Prisma 7**, **PostgreSQL (Supabase)** and
**Tailwind CSS**. Deployed on **Vercel**.

> Fasmetri is not an official partner of any listed store unless explicitly stated.
> Prices and availability change — always verify the final price on the store's site.

## Setup

```bash
npm install            # installs deps + runs `prisma generate` (postinstall)
cp .env.example .env   # fill in DATABASE_URL + ADMIN_PASSWORD at minimum
npm run dev            # http://localhost:3000
```

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # TypeScript type-check (tsc --noEmit)
npm run db:deploy   # apply Prisma migrations to the database (prod)
npm run db:generate # regenerate Prisma client after schema changes
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres/Supabase connection string |
| `NEXT_PUBLIC_APP_URL` | recommended | Canonical site URL (sitemap/OG) |
| `ADMIN_PASSWORD` | ✅ for `/admin` | Password for the admin dashboard + `/admin/clicks` |
| `NEXT_PUBLIC_GA_ID` | optional | Google Analytics 4 ID (`G-XXXX…`) |
| `NEXT_PUBLIC_META_PIXEL_ID` | optional | Meta (Facebook) Pixel ID |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | optional | TikTok Pixel ID |
| `SCRAPER_ENABLED`, `SCRAPER_USER_AGENT`, `CRON_SECRET` | for imports | Scraper/import controls |

> **Note:** this is **Next.js**, so browser-exposed vars use the `NEXT_PUBLIC_`
> prefix (not `VITE_`). If an analytics ID is empty, that provider is skipped and
> the site runs cleanly.

## Analytics

`src/lib/analytics.ts` exposes a single `trackEvent(name, params)` that fans out to
whichever of GA4 / Meta Pixel / TikTok Pixel is configured (`src/components/analytics-scripts.tsx`).
Events tracked: `product_view`, `shop_click`, `search`, `category_view`, `filter_used`.
Analytics never blocks the UI — if it fails, pages and outbound links still work.

- **GA4:** create a Web data stream → copy the `G-…` ID into `NEXT_PUBLIC_GA_ID`.
- **Meta Pixel:** Events Manager → copy the pixel ID into `NEXT_PUBLIC_META_PIXEL_ID`.
- **TikTok Pixel:** Events → Web → copy the pixel ID into `NEXT_PUBLIC_TIKTOK_PIXEL_ID`.

Key KPI: **shop_click_rate = shop_clicks / product_views**.

## First-party shop-click storage (server-side)

Every outbound store button goes through `/api/out/[offerId]`, which:
1. records a `ClickEvent` row (server-side, via the existing `DATABASE_URL`), and
2. redirects to the store product URL with UTM tags.

`ClickEvent` stores a snapshot: `productId, productName, category, shopName, price,
utmSource/Medium/Campaign, referrer, userAgent, createdAt`. **No client-side Supabase
key is needed** — storage is server-side, so nothing sensitive is exposed.

Apply the reporting columns once (prod):
```bash
npm run db:deploy   # applies prisma/migrations/20260530150000_clickevent_reporting
```
Or run that migration's `ALTER TABLE` in the Supabase SQL editor.

**View the data:** `/admin/clicks` (password-protected) — clicks by shop, category,
product, and day for the last 30 days. Raw query example:
```sql
select "shopName", count(*) from "ClickEvent"
where "createdAt" > now() - interval '30 days'
group by "shopName" order by 2 desc;
```

## Catalog / import jobs

Ingestion saves `RawOffer`s; the pipeline then makes them public.

### Full-coverage import (every phone + laptop)

Discovers **every** product URL from each store's sitemaps and scrapes them all,
recording an explicit outcome (imported / failed / skipped) per URL plus a
completeness check. Stores: Zoommer + EE (phones & laptops), PCShop (laptops only).

```bash
# Dry run first (discovery + a few sample parses, no DB writes):
npm run import:full-coverage -- --dry-run --sample=3

# Full live import (set DATABASE_URL to the target DB; run from Georgia):
npm run import:full-coverage
# …or a single store/category, chunked:
npm run import:full-coverage -- --shop=ee --category=mobiles --limit=300 --offset=0

# Then publish what was imported:
npm run normalize-raw-offers -- --limit=100000
npm run match-offers-to-variants -- --limit=100000
npm run recategorize-products -- --limit=100000

# Coverage snapshot (DB-only, no scraping):
npm run import:coverage-report
```

A JSON report (incl. `failedUrls` / `skippedUrls` with reasons) is written to
`.codex-logs/import-reports/`. Flags: `--shop`, `--category` (comma-separated),
`--limit`, `--offset`, `--dry-run`, `--sample`.

> **Anti-bot note:** Zoommer and EE return **403 to non-Georgian / datacenter IPs**.
> Run the import from a **Georgian IP** (or a GE residential proxy). Vercel cron
> cannot perform the large scrape. The importer aborts a category after 10
> consecutive 403/429s and reports it rather than hammering the store.

## Deployment (Vercel)

- Auto-deploys from `main`. `.vercelignore` excludes `scripts/` from the build/type-check.
- Set the env vars above in Vercel (Project → Settings → Environment Variables).
- Apply DB migrations with `npm run db:deploy` against the production `DATABASE_URL`.

## Legal

Independent platform; see `/legal` (disclaimer), `/privacy`, `/terms`, and `/contact`
(takedown). Store names are plain-text source labels, not partnership claims.

## Manual testing checklist

Homepage / `/mobiles` / `/laptops` / search / filters / sorting / product page /
external store links / `shop_click` + `product_view` fire / works with empty analytics
env / production build passes / footer disclaimer visible / legal pages load / mobile
layout / no fake partnership wording / no fake reviews or discounts.
