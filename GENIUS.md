# GENIUS.md — Orchestrator playbook (the "brain")

Role: **Genius** = main thread. Audits, thinks critically, plans, writes precise tasks for
**Coder** (the `fasmetri-dev` subagent), reviews + TESTS Coder's output, and loops until the goal
is *provably* done. Genius does **not** write feature code — it recons, instructs, verifies, ships.
Pairs with [CODER.md](CODER.md). Together they follow the shared **Handoff Protocol** below.

## Operating loop
1. **Recon first.** Establish ground truth (DB counts, live screenshots, store totals, the actual
   file) before issuing any task. Never instruct from assumption.
2. **Prioritize by severity:** Critical bug → Broken feature → Design/UX → Optimization.
3. **Delegate the edit, not the thinking.** Genius does recon/run/test itself (read-only scripts,
   screenshots, curl, git, deploys). Code edits go to Coder via a Task Spec. One batch at a time.
4. **Test the result — don't trust the report.** Re-run the gate, re-screenshot, re-query the DB.
   Verify the *riskiest* claim with your own eyes (render the OG PNG, count grid columns, load the image).
5. **Ship + verify live.** Commit → push `main` → Vercel auto-deploys prod → confirm on
   `fasmetri.vercel.app`. Keep the prior deploy as a rollback candidate.

## Genius does inline vs. delegates to Coder
- **Genius does itself:** recon, read-only DB queries, `--dry-run` pipeline runs, screenshots, curl
  probes, diff review, commits, pushes, deploy verification, memory/playbook updates.
- **Delegate to Coder:** any source-code edit/creation, multi-file refactors, new components,
  parser/adapter changes. Give a Task Spec; never pre-write the code for them.
- **Don't spawn a subagent** for a one-line read, a doc/markdown tweak, or a question you can answer
  from the repo. Spawning is the expensive path — only delegate real code work. (These two playbooks
  are docs — Genius edits them inline; don't spawn Coder for a `.md` change.)

## Handoff Protocol (Genius → Coder Task Spec)
Every delegated task uses this shape so Coder never has to guess:
```
CONTEXT:    one-paragraph diagnosis — the symptom + the verified root cause (with evidence).
FILES:      exact path(s) to edit. "likely the only file" if confident.
TASK:       numbered, concrete steps. What to change and to WHAT.
DO NOT:     explicit out-of-scope guardrails (don't touch X, don't refactor Y, don't commit).
VERIFY:     the gates + the specific proof to produce (tsc, next build, a before/after value).
REPORT:     "return exact diff summary + gate results + anything noticed-but-untouched."
```
Coder returns findings as **text** (no summary `.md` files), leaves changes in the working tree, and
flags ambiguity instead of guessing. Genius then runs the Acceptance checklist before shipping.

## Acceptance checklist (Genius runs BEFORE shipping Coder's work)
- [ ] `npx tsc --noEmit` clean (independently, not just Coder's word).
- [ ] `git diff` reviewed — only the intended files/lines changed, no scope creep, no stray debug.
      For a big/multi-file diff, run the **`/code-review`** skill (or spawn **`cavecrew-reviewer`**) for
      a second pass; for security-relevant changes run **`/security-review`**.
- [ ] The riskiest behavior verified with my own eyes (screenshot / curl / DB count / rendered PNG).
      For end-to-end "does it actually work" use the **`/verify`** or **`/run`** skill.
- [ ] No guardrail violated (prod-write rules, status-gating, "Stop at EE").
- [ ] If risky: `npx next build --webpack` exits 0.

## Ship checklist (Definition of Done)
- [ ] Commit with a clear conventional message (`git commit -F <file>` — PS here-strings break `-m`).
      End the message with the `Co-Authored-By:` line.
- [ ] `git push origin main` → confirm `HEAD == origin/main`. (Or run the **`/fasmetri-ship`** skill,
      which builds + verifies + deploys in one step — prefer it for a routine code ship.)
- [ ] Vercel deploy reaches `READY`, aliased to `fasmetri.vercel.app` (check via the vercel MCP
      `get_deployment` / `list_deployments`); prior prod deploy retained as rollback candidate.
- [ ] If the change includes a Prisma schema change: apply the **additive, idempotent** migration to
      prod FIRST (CLAUDE.md pattern). The Prisma 7 `prisma db execute` CLI can flag out here — fall back
      to a tiny repo `scripts/_*.ts` running `$executeRawUnsafe` (then delete it).
- [ ] Verified the change LIVE on prod (not just local) — data changes need ≤300s cache (pages on
      `/shops` etc. are 10-min ISR, lag longer).
- [ ] Lesson appended here; durable facts saved to `[[project-fasmetri]]` memory (or run **`/save-md`**).

## Skills, subagents & MCP tools available (use the right one — don't reinvent)
Genius can invoke skills via the Skill tool and spawn subagents via the Agent tool. Map the job → tool:

**Skills (Genius runs these):**
- **`/fasmetri-ship`** — build + verify + deploy Fasmetri to prod in one step. The routine ship path.
- **`/code-review`** — review the current diff for correctness + reuse/simplification. Run on big diffs
  before shipping. `/simplify` applies quality cleanups (no bug-hunting).
- **`/security-review`** — security pass over pending changes; use for auth/crypto/route changes.
- **`/verify`** / **`/run`** — drive the real app to confirm a change works end-to-end (not just tsc).
- **`/save-md`** — update persistent memory at session end / after meaningful progress.
- **`/daily-check`** — start-of-session: confirm best model + tooling updates.
- Docs: **context7 MCP** (`resolve-library-id` → `query-docs`) for current Next/Prisma/Tailwind/etc. API
  — prefer over guessing; training data lags.

**Subagents (Genius spawns via Agent tool):**
- **`fasmetri-dev`** = **Coder** — the default executor for Fasmetri code edits, builds, syncs, deploys.
- **`cavecrew-investigator`** — read-only code locator ("where is X", "what calls Y"); ~60% cheaper
  than vanilla Explore. Use for cheap recon before writing a Task Spec.
- **`cavecrew-builder`** — surgical 1–2 file edit (typo, single-function rewrite, mechanical rename).
  Cheaper than fasmetri-dev for a tiny bounded change; it hard-refuses 3+ file scope.
- **`cavecrew-reviewer`** — one-line-per-finding diff/branch review; second opinion on Coder's diff.
- **`web-researcher`** — anything time-sensitive (current prices, model/version availability, live facts)
  — searches + cross-checks instead of answering from memory.
- **`vercel:deployment-expert` / `vercel:performance-optimizer`** — deep Vercel deploy/perf questions.

**MCP tools:** vercel (`get_deployment`, `list_deployments`, build/runtime logs) for deploy verification;
apify (store-scraping actors) if a store needs a residential-proxy scrape the local runner can't do.

Rule: a bounded 1–2-file change → `cavecrew-builder`; a real multi-file feature/fix → `fasmetri-dev`
(Coder); pure read/locate → `cavecrew-investigator`; never spawn anything for a doc/markdown tweak.

## Verified tooling — copy-paste ready
**Read-only / write prod-DB script (PowerShell — NOT the Bash tool; git-bash can't parse `.env.eu`):**
```powershell
$d="C:\Users\user\Desktop\fasmetri"; Set-Location $d
$raw = Get-Content "$d\.env.eu" -Raw
if($raw -match 'DATABASE_URL\s*=\s*"?([^"\r\n]+)'){ $env:DATABASE_URL = $Matches[1].Trim() } else { throw "no url" }
$env:DATABASE_POOL_MAX = "1"
npx tsx scripts/validate-counts.ts   # read-only; per-category + per-store counts = go-to completeness check
$env:DATABASE_URL=$null
```
`.env`→localhost (empty fixture DB); `.env.eu`→Supabase EU = prod. `@next/env` does NOT override an
already-set `process.env.DATABASE_URL`. For a throwaway query, write `scripts/_tmp.ts` (imports
resolve from `scripts/`), run, then delete it — don't put temp scripts outside the repo.

**Design/visual QA (headless Chrome; `--virtual-time-budget` is REQUIRED or it shoots blank):**
```powershell
$c="C:\Program Files\Google\Chrome\Application\chrome.exe"; $t=$env:TEMP
& $c --headless=new --disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=11000 `
  --window-size=1366,1700 --screenshot="$t\shot.png" --user-data-dir="$t\cr1" "https://fasmetri.vercel.app/"
```
Then `Read` the PNG. Mobile = `--window-size=390,2200`. One `--user-data-dir` per parallel shot.

**Image-rendering debug (broken store images):** compare three fetches —
`curl <rawUrl>` (store), `curl 'https://wsrv.nl/?url=<rawUrl>'` (proxy), `curl '<prod>/_next/image?url=<enc>'`
(optimizer). On this deploy wsrv works for most hosts but 404s some (pcshop.ge); `/_next/image` 400s
for everything. Blocked host → add to `wsrvBlockedHosts` in `product-image.tsx` (raw unoptimized load).

**Store completeness:** `npx tsx scripts/<store>-<cat>.ts --mode=discover` prints LIVE site count, no
DB writes (but it acquires a Postgres advisory lock, so it needs a reachable DB — point at `.env.eu`).
**This machine has a Georgian IP** → can scrape directly (CI runners are Cloudflare-403'd).

## Hard guardrails (from CLAUDE.md — never violate)
- Prod-DB writes ONLY via `--promote`, never `--dry-run`. Always dry-run + read `reports/` hardFailures
  first. The 70%-of-active-count guard is a feature; don't bypass it.
- Don't scrape all stores at once. Destructive ops need `CONFIRM_PRODUCT_RESET=true`. **Stop at EE**
  (don't enable new stores without explicit instruction — PCShop was explicitly authorized).
- Public visibility is status-gated (`PUBLIC_OFFER_MATCH_STATUSES`) — when any new match status is
  introduced, grep EVERY public `where` for hard-coded status strings (this once hid 946 products).
- `npm run lint` = `tsc` is the only build gate; `next build` does not run ESLint.
- Outward-facing/irreversible acts (prod deploy, scrape promote) follow the goal's authorization; when
  unauthorized and unclear, surface to the user rather than guess.

## Lessons learned (newest first — append every session, keep it deduped)
- 2026-06-16: **Mobile audit (commit `f57618c`).** The layout was already mobile-solid (verified
  320–390px: no horizontal overflow, `mobile-bottom-nav` + `mobile-filter-drawer`, sticky product CTA,
  responsive grids, `mobile-bottom-safe` padding). Real gaps were missing metadata: added a Next
  `viewport` export (App-Router-correct spot for `themeColor` — Next 16 ignores it in `metadata`;
  used `#ffffff` to match the white header) + `colorScheme:"light"`, a web app manifest
  (`src/app/manifest.ts` → served at `/manifest.webmanifest`, `display:standalone`, `theme_color
  #15172b`, icon `/icon.svg`) for add-to-homescreen, and `appleWebApp` for iOS. To audit mobile:
  screenshot at 390 AND 320px (overflow check), and `curl` the page for `theme-color`/`manifest` metas.
- 2026-06-16: **Palette is token-driven — recolor via `globals.css :root` (commit `22450bf`).** Changing
  the `:root` vars (`--accent`, `--brand`, `--background`, `--price-deal`, `--savings`, …) cascades the
  whole site because components use `var(--…)`. BUT some literals can't read CSS vars and must be swapped
  by hand: `opengraph-image.tsx`, recharts in `price-chart.tsx`, the price-alert HTML email
  (`server/alerts/email.ts`), and Tailwind arbitrary values like `bg-[#0f172a]` in `site-footer.tsx`.
  Always `grep src/` for the old brand hex (`#2563eb`,`#0f172a`,…) to catch stragglers; leave intentional
  multi-color sets (admin `SHOP_AVATAR_COLORS`). **Preview before shipping:** local fixture DB is empty,
  so start `next start` with `$env:DATABASE_URL` = prod (`.env.eu`) to screenshot real cards/prices in the
  new palette before deploy. Shipped "Modern Indigo": accent #2563eb→#4f46e5, brand #111827→#15172b, bg
  #f4f6f9→#f5f5f7, deal→rose #e11d48, savings→emerald #059669, hero gradient deepened to indigo.
- 2026-06-16: **Security audit (commit `27cd49b`).** Fixed: admin-login brute-force (added DB-backed
  per-IP failed-attempt limit, 10/15min → 429, new `LoginAttempt` table + idempotent migration applied
  to prod via `$executeRawUnsafe` since the `prisma db execute` CLI flagged out on Prisma 7); login
  password `!==` → `timingSafeEqual`; `/api/alerts` email-bombing → dedup active alert + per-email cap
  50; added HSTS header. Verified live (HSTS header present; login 11th attempt → 429). **Already
  solid (don't re-flag):** all admin routes call `isAdminRequest()`, all sync routes `authorizeCron`,
  `/api/out` redirect validates protocol + blocks private IPs (SSRF), json-ld escapes `<`, `/api/scrape`
  is 410-disabled. **Residual (backlog):** the rate-limit keys on the FIRST `x-forwarded-for` entry,
  which a client can spoof to rotate past the limit — the robust complement is a Vercel Firewall
  rate-limit rule on `/api/admin/session` (config, not code). npm-audit's 5 moderate are dev/build-chain
  (postcss via Next, @hono via @prisma/dev) — `fix --force` downgrades Next→9/Prisma→6 (breaking); left.
- 2026-06-16: **Broken store images = wsrv.nl can't fetch that host.** Site renders all images via
  `wsrv.nl` (`product-image.tsx`); wsrv **404s** pcshop.ge (raw URL is 200), and the old fallback used
  `/_next/image` which **400s for every host on this deploy** → placeholder. Fix (`7dca0db`):
  `wsrvBlockedHosts` set; blocked hosts load raw **unoptimized** (no wsrv, no /_next/image). Note: this
  RENAMED the old `nextOptimizedHosts` set and inverted its meaning.
- 2026-06-16: **Prod-DB CLI scripts: use PowerShell, not Bash.** git-bash `grep '^DATABASE_URL=' .env.eu`
  returns empty (encoding) → `DATABASE_URL` never reaches node → `prisma` null. Use the PS block above.
- 2026-06-16: **Adding PCShop needed no new sync modules** — it's WooCommerce with an existing legacy
  `ShopAdapter`; the legacy `import-store → normalize-raw-offers → match-products` pipeline handled it.
  `import-store --dry-run` fetches ~5 live pages (no DB writes) and prints parsed identity — the perfect
  pre-promote test. The coverage win came from parsing the detail-page spec table into the offer
  `description` (the field `extractProductAttributes` reads): weak-identity 106→7, AUTO-matches 0→42.
- 2026-06-16: discover mode acquires a PG advisory lock (`$queryRawUnsafe`) — needs a reachable DB even
  though it writes nothing; point at `.env.eu` when local PG is down.
- 2026-06-16: PowerShell here-strings with inner `"`/Georgian break `git commit -m` → use `git commit -F <file>`.
- 2026-06-16: `Start-Process "npx"` fails (npx is a shell script) — use the Bash tool (`npx … &`) or
  `node` directly for background servers.
- 2026-06-16: local build renders empty home "popular categories" — fixture DB has product fixtures but
  ZERO category rows. Verify home-category UI on **prod** after deploy, not locally.

## Backlog / improvement ideas (newest first)
- [x] **PCShop fully integrated (2026-06-16)** — 235 public products (93% of 252), catalog 1031→1227,
  42 phones auto-merged, images fixed (`7dca0db`). Residual: ~7 weak-identity + a few SIM-unknown
  iPhones in admin review; PCShop has no nightly auto-refresh (legacy import is manual — add a sync
  module + GitHub Action if continuous PCShop pricing is wanted).
- [ ] **Security follow-ups:** add a Vercel Firewall rate-limit rule on `/api/admin/session` (the app
  limiter's XFF key is client-spoofable); consider nonce-based CSP to drop `script-src 'unsafe-inline'
  'unsafe-eval'`; revisit the dev-chain npm-audit moderates when Next/Prisma majors are upgraded anyway.
- [ ] Home `FeaturedDeal` still uses a heavy black CTA (`page.tsx`) — soften like product-card.
- [ ] Mobile: hero search vs header search redundancy — evaluate.
- [ ] Historical-low badge: now ≥2 points; revisit once catalog has more daily history.
