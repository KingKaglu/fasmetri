# CODER.md — Executor playbook (the "hands")

Role: **Coder** = the executor (the `fasmetri-dev` subagent). Receives precise numbered
tasks from **Genius** (the orchestrator), writes/edits the exact code, runs the gates, and
reports back. Pairs with [GENIUS.md](GENIUS.md) — that file is the brain; this is the hands.

## Operating contract
- **Do exactly what the task says — no scope creep.** Edit only the files named (or strictly
  required to make them compile). Don't refactor neighbours, rename things, or "improve" code
  that wasn't in the task.
- **If a task is ambiguous or looks wrong, STOP and flag it.** Ask Genius rather than guessing
  the intent. A wrong guess costs a full review+ship loop.
- **Leave changes in the working tree.** Genius reviews, tests, and ships (commit → push `main`
  → Vercel). Do NOT commit/push unless explicitly told to.
- **Report concisely:** what changed (absolute paths), the gate result, and anything you noticed
  but didn't touch. Don't write summary `.md` files — return findings as text.

## Tools available to Coder (and the limits)
Coder runs as the `fasmetri-dev` subagent. Available tools: **Read, Edit, Write, Grep, Glob, Bash,
PowerShell, WebFetch**. You do **NOT** have the Skill tool or the Agent tool — you cannot invoke
`/code-review`, `/fasmetri-ship`, etc., and you cannot spawn sub-subagents. So:
- Do the code work with Edit/Write; locate with Grep/Glob; verify with PowerShell/Bash (tsc, build,
  dry-runs). Use **WebFetch** for external docs/recon when needed (no context7 MCP here).
- **Prod-DB scripts: use PowerShell, not Bash** — git-bash can't parse `.env.eu` (see GENIUS.md block).
- Genius runs the heavyweight passes on your output — `/code-review`, `/security-review`, `/verify`,
  and `/fasmetri-ship` for the deploy. That's why you **return findings as text and leave changes in the
  working tree**: it lets Genius review + ship. Don't try to self-deploy or invoke skills you don't have.

## Inbound task shape (from Genius)
Genius delegates via a Task Spec (`CONTEXT / FILES / TASK / DO NOT / VERIFY / REPORT`). The full shape
lives in the shared **Handoff Protocol** in [GENIUS.md](GENIUS.md) — read it there, don't restate it.
If any field is missing or contradicts the repo, STOP and flag it rather than guessing.

## Report-back template
Report to Genius as **text** (never a `.md` file), using this block so the review/ship loop is fast:
```
Files changed:
  - <abs path> — <one line: what changed and to what>
Gates:
  - tsc (npm run lint): PASS | FAIL <error>
  - next build: PASS | FAIL | not run (markdown/docs only)
Verified:
  - <the specific proof produced — count, curl result, rendered PNG, before/after value>
Noticed but did NOT touch:
  - <anything out of scope worth Genius knowing; "nothing" if clean>
```

## Self-check before reporting
- [ ] `npx tsc --noEmit` clean (skip only for docs/markdown-only changes).
- [ ] Only the named files changed — confirm with `git diff --stat` (no scope creep).
- [ ] No stray debug / `console.log` / commented-out experiments left behind.
- [ ] If a pipeline/sync script was touched: ran the relevant `--dry-run` / `--mode=discover` and it
      behaved (never `--promote` to prove a change).
- [ ] Anything ambiguous or that looked wrong is **flagged to Genius**, not silently guessed.

## The gates that actually matter
- `npm run lint` → `tsc --noEmit`. **This is the ONLY real build gate** — run it after every
  change set. Type errors here = not done.
- `npm run build` → `next build` for the production gate (run before handing off risky changes).
- **Next 16 does NOT run ESLint during `next build`** — don't rely on the build to catch lint/style
  issues; `tsc` is what guards correctness.
- Scripts run via `tsx` (no compile step), so a script can be type-clean yet fail at runtime —
  dry-run any pipeline script before trusting it.

## Two adapter systems — edit the RIGHT one
Touching the wrong system is the classic Coder mistake. There are two parallel pipelines:

1. **Legacy `ShopAdapter`** — `src/server/scrapers/shops/*.ts` (zoommer.ts, ee.ts, alta.ts, …),
   driven by `src/server/scrapers/runner.ts` + `import-store.ts`/`scrape.ts`. Does raw-offer
   ingestion (`saveRawOffer` → RawOffer), gated by `src/config/enabledStores.ts` + `SCRAPER_ENABLED`.
   **Mostly legacy** — only touch it if the task explicitly names `import-store`, `scrape.ts`,
   `runner.ts`, or a `shops/*` adapter.
2. **Per-store sync modules** — `src/server/{store}{Category}/sync.ts`:
   `zoommerPhones`, `zoommerLaptops`, `eePhones`, `eeLaptops` (each ~1600 lines, deliberately
   copy-pasted, NOT abstracted). CLI wrappers `scripts/{store}-{phones|laptops}.ts`. **This is
   what runs in production** (GitHub Actions + the self-hosted Windows runner). It ignores
   `enabledStores.ts` and `SCRAPER_ENABLED`. Cross-store matching is `scripts/match-products.ts`
   (`npm run match:phones` / `match:laptops`).

Rule of thumb: anything about live prod scraping/sync/matching → **sync modules**. Anything about
the old `RawOffer → normalize → match-offers-to-variants` flow → legacy.

## Adding a new store — ordered checklist
Distilled from CLAUDE.md "Adding a New Store" (sync pipeline). Follow in order:

1. **Recon** the site: pagination style (JSON API like Zoommer vs `__NEXT_DATA__` HTML like EE),
   where detail data lives, product-id pattern in URLs, category page URL + id. Confirm live counts
   via `--mode=discover`.
2. **Create `src/server/{store}{Cat}/sync.ts`** — copy `zoommerPhones/sync.ts` (JSON API) or
   `eePhones/sync.ts` (`__NEXT_DATA__`). Change constants: `STORE`, `SOURCE`, `SOURCE_CATEGORY`,
   `FASMETRI_CATEGORY` (valid `FasmetriCategorySlug` — `mobiles`/`laptops`), `CATEGORY_ID`,
   `CATEGORY_URL`, `PAGE_LIMIT`, and a **UNIQUE `ADVISORY_LOCK_ID`** (convention `{categoryId}{YYYYMMDD}`).
   Rewrite `discoverListing`/`fetchCategoryPage`/`scrapeDetail`, the category guard, the `Shop`/`Category`
   upserts in `promoteSnapshot`, and all snapshot/report/lock file names + log strings.
3. **Create CLI wrapper** `scripts/{store}-{cat}.ts` (copy an existing one, swap the import).
4. **Add `package.json` scripts**: `sync:{store}:{cat}` (`--mode=prices --promote`) and
   `scrape:{store}:{cat}:full` (`--mode=full --promote`).
5. **Make sure the store's images render** — the site loads every external image through the
   **wsrv.nl** proxy by default (the `wsrvLoader` in `src/components/product-image.tsx`); most hosts
   work through it with NO allowlist. There is no "optimized-hosts" list anymore (`7dca0db` renamed
   and inverted that set). For a new store:
   - **Verify wsrv can fetch the host first:** `curl 'https://wsrv.nl/?url=<a real product image url>'`.
     If wsrv returns the image → nothing to add in `product-image.tsx`.
   - **If wsrv 404s it** (WordPress/WooCommerce CDNs often do — e.g. pcshop.ge) → add that host to the
     `wsrvBlockedHosts` set in `src/components/product-image.tsx` (currently `{"pcshop.ge"}`). Blocked
     hosts load the raw URL **unoptimized** instead. The Next optimizer (`/_next/image`) is NOT usable
     on this deploy — it 400s every host — so "blocked" never falls back to it.
   - Either way, **still list the host in `next.config.ts` → `images.remotePatterns`** (required for any
     external src to render at all).
6. **GitHub Action**: copy `.github/workflows/zoommer-phones-sync.yml`. Needs `EU_DATABASE_URL`
   secret mapped to `DATABASE_URL` (plain URL, **no `sslmode=no-verify`** — Prisma 7 CLI rejects
   it with P1013), `DATABASE_POOL_MAX: "1"`, and the "Ensure sync columns exist" `prisma db execute`
   step. **Stagger the cron** into a free slot (price syncs `0/15/30/45 */3 * * *`; nightly fulls
   ~`2:20/2:40/3:00/3:10` UTC) and update the matching step `if:` cron-string conditions.
   DB registration is automatic (`promoteSnapshot` upserts Shop+Category) — no manual inserts.
7. **Roll out locally in this exact order** (DB writes ONLY with `--promote`, NEVER with `--dry-run`):
   ```
   discover            # listing only, no DB writes — verify counts vs live site
   full --dry-run      # + detail pages; read reports/ for hardFailures/warnings
   full --promote      # first real promotion
   match:{cat} --shop={store} --dry-run   # cross-store match preview
   match:{cat} --shop={store}             # link/create canonicals; review PossibleMatch in admin
   ```

### Real gotchas to preserve
- **P2002 on `externalId`** (both RawOffer & ProductOffer have `@@unique([shopId, externalId])`):
  upserts key on URL, so a reused/changed URL can collide. The syncs + `match-products.ts` catch a
  P2002 mentioning `externalId` and **retry once with `externalId: null`**. Replicate in any new sync.
  `isExternalIdConflict` also string-matches `"externalId"` (adapter-pg doesn't always throw a typed
  `PrismaClientKnownRequestError`).
- **70% low-count guard is intentional** — `validateSnapshot` hard-fails (exit 1) if new product
  count < 70% of active DB count. Don't "fix" a blocked partial scrape by promoting anyway.
- **`--mode=promote` still runs `validateSnapshot`** on the last on-disk snapshot; hard failures
  intentionally exit 1 so the Action goes red. Don't suppress them.
- **Skipped ≠ dropped**: offers missing price/title skip `ProductOffer` but still upsert as `RawOffer`.

## Known repo gotchas
- **`--resume` shares one checkpoint per job name** (`.codex-logs/checkpoints/{jobName}.json`, shared
  across ALL categories). When looping categories, reset offset and use explicit `--offset=N` — never
  `--resume` across category boundaries.
- **Public visibility is status-gated** by `PUBLIC_OFFER_MATCH_STATUSES` in `src/lib/catalog-types.ts`
  (`CONFIRMED, SAFE_AUTO, CANONICAL_CREATED`). If a task adds/changes a match status, grep EVERY public
  `where` filter (`catalog.ts`, `productCuration`, `sitemap.ts`, `catalogCoverage.ts`, product badge)
  for hard-coded status strings — a missed one once hid 946 products. Validate by rendered page counts.
- **Not every "audit/validate" script is read-only** — `audit-public-catalog` WRITES by default.
  Safe read-only: `validate:counts`, `validate:matches`. Check for `prisma.*.update` before running
  anything against prod.
- **Bump search cache keys** (`public-products-v*`, `public-product-matches-v*`) on any ranking change
  or stale results persist ~300s.
- **`grep -P` fails on Windows git-bash** — use `grep -Eo 'pattern'` (POSIX extended).
- **`DATABASE_POOL_MAX=1`** for the Supabase pooler (Prisma uses `@prisma/adapter-pg`, not the default
  engine); the pooler chokes on more.
- **Destructive ops need `CONFIRM_PRODUCT_RESET=true`**. Don't enable disabled stores or scrape all
  stores at once. **Stop at EE.**
- **`.env`→localhost fixture DB (empty)**; **`.env.eu`→Supabase EU = prod**. Local build can render
  empty home category rows (fixture DB has product fixtures but zero category rows) — verify category
  UI on prod, not locally.

## Expected catalog reference (living sanity-floor — re-derive, don't trust the constant)
These are reference floors, not invariants — the catalog grows. Use them only to sniff out a
regression (a sudden drop = something broke status-gating or a partial scrape promoted).
- **Zoommer + EE baseline:** ~1,091 public products (697 mobiles + 394 laptops).
- **Post-PCShop:** ~1,227 public products (697 mobiles + 514 laptops; ~235 of them PCShop).

Re-derive the **live** number before relying on it — run `validate-counts` (per-category + per-store,
read-only) via the PowerShell block in [GENIUS.md](GENIUS.md); never quote a hardcoded total back.

## Lessons learned (newest first — append every session)
- 2026-06-16: Design batch shipped (commit **d7e7e17**): richer home category-row cards, desktop grid
  stays 5-col until ≥1536px (`2xl`), softened product-card compare CTA. Verify grid column counts on a
  real wide viewport — Tailwind breakpoint guesses are error-prone.
- 2026-06-16: Dynamic OG social card + loosened historical-low badge (now ≥2 points) shipped (commit
  **cc101f2**). When a task involves the OG image, render the actual PNG to confirm — don't trust the route compiling.
- 2026-06-16: **Image rendering = wsrv.nl by default; allowlist is now `wsrvBlockedHosts`** (commit
  `7dca0db` renamed `nextOptimizedHosts` and inverted it). Hosts wsrv can fetch need nothing in
  `product-image.tsx`; hosts wsrv 404s (pcshop.ge / WooCommerce CDNs) go in `wsrvBlockedHosts` to load
  raw **unoptimized** — `/_next/image` 400s every host on this deploy and is never a fallback. The host
  still needs a `next.config.ts` `remotePatterns` entry to render at all.
