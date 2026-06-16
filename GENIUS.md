# GENIUS.md — Orchestrator playbook (the "brain")

Role: **Genius** = main thread. Audits, thinks critically, plans, writes precise numbered
tasks for **Coder** (the `fasmetri-dev` subagent), reviews + TESTS Coder's output, and loops
until the goal is provably done. Genius does **not** write feature code itself — it instructs,
verifies, and ships. Pairs with [CODER.md](CODER.md).

## Operating loop
1. **Recon first.** Establish ground truth (DB counts, live screenshots, store totals) before
   issuing any task. Never instruct from assumption.
2. **Prioritize by severity:** Critical bug → Broken feature → Design/UX → Optimization.
3. **Write precise tasks:** exact files, line refs, acceptance criteria, and "do NOT" guardrails.
   One batch at a time. Coder executes; Genius does not pre-write the code.
4. **Test the result, don't trust the report.** Re-run the gate, re-screenshot, re-query the DB.
   Verify the *riskiest* claim with your own eyes (e.g. rendered the OG PNG, counted grid columns).
5. **Ship + verify live.** Commit → push `main` → Vercel auto-deploys prod → confirm on
   `fasmetri.vercel.app`. Keep the prior deploy as a rollback candidate.

## Verified tooling (works on this machine)
- **Read-only prod DB query:** point a read-only script at prod by setting `DATABASE_URL` from
  `.env.eu` + `DATABASE_POOL_MAX=1`, then `npx tsx scripts/<script>.ts`. `.env`→localhost (empty
  fixture DB); `.env.eu`→Supabase EU = prod. `@next/env` does NOT override an already-set
  `process.env.DATABASE_URL`, so the inline override wins. `validate-counts.ts` is read-only and
  prints per-category + per-store counts — the go-to completeness check.
- **Design QA:** headless Chrome screenshots at mobile (390) + desktop (1366). Command +
  `--virtual-time-budget=10000` gotcha documented in [[project-fasmetri]] memory.
- **Store completeness check:** `npx tsx scripts/<store>-<cat>.ts --mode=discover` prints the LIVE
  website product count with **no DB writes** — compare to `validate-counts` to see what's missing.
- **This machine has a Georgian IP** → can scrape zoommer/ee/etc. directly (CI runners are
  Cloudflare-403'd; that's why prod sync runs on the self-hosted Windows runner here).

## Hard guardrails (from CLAUDE.md — never violate)
- Prod-DB writes happen ONLY via `--promote` and never with `--dry-run`. Always dry-run + read the
  `reports/` hardFailures first. The 70%-of-active-count guard is a feature; don't bypass it.
- Don't scrape all stores simultaneously. Destructive ops need `CONFIRM_PRODUCT_RESET=true`.
- Public visibility is status-gated (`PUBLIC_OFFER_MATCH_STATUSES`) — when any new match status is
  introduced, grep EVERY public `where` for hard-coded status strings (this once hid 946 products).
- `npm run lint` = `tsc` is the only build gate; `next build` does not run ESLint.

## Lessons learned (append every session — don't repeat mistakes)
- 2026-06-16: **Broken store images = the wsrv.nl proxy can't fetch that host.** PCShop images were
  blank because the site renders ALL images through `wsrv.nl` (`product-image.tsx` `wsrvLoader`), and
  wsrv **404s** pcshop.ge (IP/hotlink blocked) — even though the raw pcshop URL returns 200. The old
  fallback routed through Next's optimizer `/_next/image`, which **400s for every host on this deploy**
  (site is wsrv-only), so it died → placeholder. Fix (commit `7dca0db`): a `wsrvBlockedHosts` set in
  product-image.tsx; blocked hosts load the raw URL **unoptimized** (next/image `unoptimized`, no wsrv,
  no /_next/image) from first render. To debug image issues: `curl` the raw URL, then
  `curl 'https://wsrv.nl/?url=<raw>'`, then `curl '<prod>/_next/image?url=<enc>'` — compare codes.
- 2026-06-16: **Prod-DB CLI scripts: use PowerShell, not the Bash tool.** `.env.eu` is encoded such
  that `grep -m1 '^DATABASE_URL=' .env.eu` in git-bash returns EMPTY (extraction len=0), so the
  inline `DATABASE_URL=…` never reaches node and `prisma` is null ("DATABASE_URL is required").
  PowerShell `Get-Content -Raw` + regex `DATABASE_URL\s*=\s*"?([^"\r\n]+)` works reliably — set
  `$env:DATABASE_URL` + `$env:DATABASE_POOL_MAX="1"`, then `npx tsx scripts/…`. This is the proven
  path for validate-counts, import-store dry-runs, and real imports against prod.
- 2026-06-16: **Adding PCShop didn't need new sync modules.** PCShop is WooCommerce and already has
  a legacy `ShopAdapter` (`src/server/scrapers/shops/pcshop.ts`) wired into `scrapers/shops/index`.
  The legacy ingestion pipeline (`scripts/import-store.ts --shop=pcshop --category=… [--dry-run]`
  → `normalize-raw-offers` → `match-products`) handles it. `--dry-run` fetches ~5 live pages, NO DB
  writes, and prints parsed identity/canonicalKey/category — the perfect pre-promote test. PCShop
  laptops+mobiles parsed clean (canonicalKey format matches the cross-store matcher), so ingestion
  needed zero code changes; the iteration risk is at the cross-store MATCH stage, not ingestion.
- 2026-06-16: discover mode still acquires a Postgres advisory lock (`$queryRawUnsafe`), so it needs
  a reachable DB even though it writes nothing — point it at prod (`.env.eu`) when local PG is down.
- 2026-06-16: PowerShell here-strings with inner `"` / Georgian chars break `git commit -m`. Use
  `git commit -F <file>` instead.
- 2026-06-16: `PowerShell Start-Process "npx"` fails ("not a valid Win32 application") — npx is a
  shell script. Use the Bash tool (`npx … &`) or call `node` directly for background servers.
- 2026-06-16: local build renders empty home "popular categories" — fixture DB has product
  fixtures but ZERO category rows. Verify home-category UI on **prod** after deploy, not locally.
- 2026-06-16: `.env.eu` `DATABASE_URL` parse — match `DATABASE_URL\s*=\s*"?([^"\r\n]+)` (anchored
  `^…$` multiline match failed in PowerShell).

## Current backlog / improvement ideas (most recent first)
- [x] **PCShop added + fully integrated (2026-06-16).** Reused the legacy `import-store` pipeline (no
  new sync modules). After a spec-parser fix (commit `2a60c6c`): **235 public products** (93% of 252),
  catalog 1031→1227, **42 phones auto-merged** with Zoommer/EE (~35 shared multi-store pages, PCShop
  price beside the others — verified live). Key lesson: when a store omits specs in titles, parse its
  detail-page spec table (PCShop = WooCommerce `table.shop_attributes`) into the offer `description`
  (the field `extractProductAttributes` reads) — lifted weak-identity 106→7 and AUTO-matches 0→42.
  - Residual: ~7 weak-identity + a few SIM-unknown iPhones in admin review queue (correct conservative
    behavior — don't globally loosen the matcher). Nightly auto-refresh for PCShop not wired (the
    legacy import is manual; the cron syncs only cover zoommer/ee). Add a PCShop sync later if wanted.
- [ ] Add one more fully-scrapable Georgian store (phones + laptops only) — DONE via PCShop.
- [ ] Home `FeaturedDeal` still uses a heavy black CTA (page.tsx) — soften like product-card.
- [ ] Mobile: hero search vs header search redundancy — evaluate.
- [ ] Historical-low badge: now ≥2 points; revisit once catalog has more daily history.
