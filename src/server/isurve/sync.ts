// iSurve (isurve.ge) — API-only ingestion.
//
// isurve.ge is a Shopify storefront, so the standard, public, read-only Shopify
// JSON endpoints are open and there is no reason to scrape HTML:
//
//   /collections.json?limit=250&page=N                 -> the collection list
//   /collections/<handle>/products.json?limit=250&page=N -> products in one collection
//   /products/<handle>.json                            -> one product (unused here)
//
// Plain Node `fetch` gets 200 (this is NOT the Alta case — no curl and no
// capitalised-header workaround is needed). Verified live 2026-09-23.
//
// ── Why the sync is driven per COLLECTION rather than off /collections/all ──
// `/collections/all/products.json` is the obvious one-call catalogue dump, but
// Shopify hard-caps its page cursor: page=100&limit=250 returns 250 rows and
// page=101 returns HTTP 400. That is a ceiling of 25,000 products, and iSurve's
// sitemap index carries 48 product sub-sitemaps per locale — the catalogue is
// bigger than the ceiling, so `all` would silently truncate. Walking the
// in-scope collections instead stays under the cap per collection AND is the
// scoping rule at the same time (see SCOPE below).
//
// ── The fields you must NOT trust (verified live 2026-09-23) ───────────────
//   * `variants[].sku` is NOT a SKU. It holds installment marketing copy —
//     "/ თვეში 47 ლარი" ("/ 47 GEL a month"). Across a 2,500-product sample
//     every single row was either that kind of string (1,653) or empty (847).
//     It must never reach externalId or model; it would poison modelCodes().
//   * `vendor` is NOT a brand. It holds the warranty badge —
//     "კომერციული გარანტია 1 წელი", "ხარისხის გარანტია". The real brand is in
//     the `brand-<Brand>` tag (~70% coverage) and in the title.
//   * `barcode` is empty on every row.
//   * `product_type` is mostly NOT a category. 76% of the sample carried
//     Facebook-feed audience labels — "ქალი"/"კაცი"/"ორივე" (woman/man/both),
//     "Sareklamo WMN", "No Feed", "GLD BTH". A silicone baking bag and a TP-Link
//     smart bulb are both product_type "ქალი". Only a thin minority
//     ("გაზის გამათბობელი", "კონდიციონერი", "ვენტილატორები") are real, so
//     product_type only becomes a breadcrumb when it is one of those known-real
//     values (REAL_PRODUCT_TYPES below). Everything else is dropped outright:
//     breadcrumbs are a *scoring signal* for categorizeProduct(), and "ქალი" is
//     a live beauty/clothing keyword, so passing the audience labels through
//     would actively mis-categorise 76% of the catalogue.
//
// ── What IS good ───────────────────────────────────────────────────────────
//   * `title` carries brand + model.
//   * `body_html` carries an explicit "მოდელი: <code>" line on ~87% of rows —
//     the single best identity signal this shop has.
//   * `tags` carry the merchant's real taxonomy as "Collection - <name>" plus
//     "brand-<Brand>".
//   * price / compare_at_price is a clean current/previous pair in GEL, and
//     `available` per variant is a real stock signal.

import { OfferAvailability } from "@prisma/client";
import { type PublicCategorySlug, isPublicCategorySlug } from "@/config/categoryMapping";
import { categorizeProduct } from "@/lib/categorizeProduct";
import { createImportBatch } from "@/lib/importPipeline";
import { prisma } from "@/lib/prisma";
import { categorySlugForSignals } from "@/server/scrapers/categories";
import { saveRawOffer } from "@/server/scrapers/runner";
import type { ScrapedOffer } from "@/server/scrapers/types";

const db = prisma;

const SITE_BASE = "https://isurve.ge";
const COLLECTIONS_URL = `${SITE_BASE}/collections.json`;

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)";
const PAGE_SIZE = 250; // Shopify's documented maximum for these endpoints
const REQUEST_DELAY_MS = 400;
// Shopify throttles full 250-row pages of the big umbrella shelves hard, and a
// full run reaches them last, after thousands of requests. Three quick retries
// (14 s of backoff in total) gave up on ten of them in a row on 2026-09-24, so
// the budget is sized for a throttle window, not a blip.
const MAX_RETRIES = 6;
const MAX_BACKOFF_MS = 60_000;
// Shopify answers HTTP 400 past page 100 on these endpoints regardless of the
// collection, so this is the platform ceiling, not a politeness cap. It applies
// to the collection list and to per-collection product listings alike: a lower
// per-collection cap would silently truncate the umbrella shelves (
// "წვრილი ტექნიკა" alone is 4,307 products), which is exactly the failure this
// file's header says walking per collection is meant to avoid.
const MAX_PAGES = 100;
const MAX_COLLECTION_PAGES = MAX_PAGES;
// products.json legitimately returns a few rows fewer than products_count
// (drafts, unpublished-in-locale, items that fell out between the two calls), so
// a tiny shortfall is a warning. Anything bigger means pagination broke and the
// collection must not be promoted as complete.
const COLLECTION_SHORTFALL_TOLERANCE = 0.05;
const COLLECTION_SHORTFALL_MIN = 5;
// A full pass that collapses against what is already stored is a broken read,
// not a mass delisting (copied from the TechnoBoom gate).
const LOW_COUNT_RATIO = 0.7;

export type IsurveSyncMode = "discover" | "full" | "prices";

type ShopifyVariant = {
  id?: number | null;
  title?: string | null;
  sku?: string | null;
  price?: string | number | null;
  compare_at_price?: string | number | null;
  available?: boolean | null;
};

type ShopifyProduct = {
  id: number;
  title?: string | null;
  handle?: string | null;
  body_html?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  // Shopify serves `tags` as a string[] on /collections/<h>/products.json but as
  // a comma-joined string on several other endpoints (and on some themes/app
  // proxies for this one). Both shapes are accepted — see normalizeTags().
  tags?: string[] | string | null;
  variants?: ShopifyVariant[] | null;
  images?: Array<{ src?: string | null }> | null;
};

type ShopifyCollection = {
  id?: number | null;
  handle?: string | null;
  title?: string | null;
  products_count?: number | null;
};

// "TITLE" means: walk this collection, but it carries no category authority —
// decide per product from its own title. Used for iSurve's umbrella shelves
// ("წვრილი ტექნიკა" is 4,307 products of "small tech", anything from a kettle
// to a phone holder), exactly the way ispace.ts leaves brand hubs unmapped.
export const BY_TITLE = "TITLE" as const;
const EXCLUDE = "EXCLUDE" as const;
export type CollectionDecision = PublicCategorySlug | typeof BY_TITLE;

export type IsurveCollection = {
  handle: string;
  title: string;
  productsCount: number;
  decision: CollectionDecision;
};

/** Why a collection is not walked — logged in --mode=discover so drops are visible. */
export type CollectionRejectReason =
  | "handle-override-exclude"
  | "empty-title"
  | "marketing-shelf"
  | "brand-hub"
  | "unclassified";

export type RejectedCollection = {
  handle: string;
  title: string;
  productsCount: number;
  reason: CollectionRejectReason;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── HTTP ───────────────────────────────────────────────────────────────────
// "no body" has two completely different meanings on these endpoints and the
// caller MUST be able to tell them apart:
//   * `ceiling` — HTTP 400 past the page cursor, or 404 on a dead handle. The
//     listing is finished; whatever was collected is complete.
//   * `failed`  — retries exhausted, network error, or an unexpected status. The
//     listing is NOT finished; treating it as complete would promote a partial
//     collection and silently deactivate everything past the failed page.
type ApiResult<T> = { status: "ok"; data: T } | { status: "ceiling" } | { status: "failed" };

async function apiGet<T>(url: string): Promise<ApiResult<T>> {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": userAgent, accept: "application/json" },
        cache: "no-store",
      });
      // 400 is Shopify's "past the page cursor ceiling" answer and 404 is a
      // dead collection handle. Neither is worth retrying.
      if (response.status === 400 || response.status === 404) return { status: "ceiling" };
      if (response.status === 429 || response.status >= 500) {
        // Back off rather than hammer — Shopify rate-limits storefront JSON.
        // Honour Retry-After when it is sent; otherwise back off exponentially.
        // On the last attempt there is nothing left to retry, so do not sleep.
        const retryAfterMs = Number(response.headers.get("retry-after")) * 1000;
        const backoffMs = Math.min(
          MAX_BACKOFF_MS,
          Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : 2000 * 2 ** attempt,
        );
        console.warn(
          `[isurve] GET ${url} -> HTTP ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}` +
            (attempt < MAX_RETRIES ? `, retrying in ${Math.round(backoffMs / 1000)}s)` : ", giving up)"),
        );
        if (attempt < MAX_RETRIES) await sleep(backoffMs);
        continue;
      }
      if (!response.ok) {
        console.warn(`[isurve] GET ${url} -> HTTP ${response.status}`);
        return { status: "failed" };
      }
      return { status: "ok", data: (await response.json()) as T };
    } catch (error) {
      console.warn(`[isurve] GET ${url} failed: ${(error as Error).message.slice(0, 160)} (attempt ${attempt + 1})`);
      if (attempt < MAX_RETRIES) await sleep(750 * 2 ** attempt);
    }
  }
  return { status: "failed" };
}

// ── Homoglyph folding ──────────────────────────────────────────────────────
// iSurve's titles mix Cyrillic look-alikes into Latin/numeric runs: the pool
// title "გასაბერი აუზი 305х76 სმ" uses Cyrillic х (U+0445), not Latin x. Left
// alone, "305х76" and "305x76" are different tokens, so model extraction and
// cross-store dedup fail silently on exactly the products where the dimension
// IS the model.
//
// Two conditions must both hold before a character is folded:
//   1. it is an ISOLATED Cyrillic character (a Cyrillic run of length 1), and
//   2. it has a Latin letter or digit IMMEDIATELY beside it.
// (2) is what keeps real Russian prose intact: "в", "с", "у", "о", "к", "а" are
// all one-letter Russian words and all sit in the map below, so run-length alone
// would rewrite "телевизор с диагональю" into Latin gibberish. A one-letter word
// in prose is surrounded by spaces or Cyrillic, never by Latin/digits.
//
// Cyrillic З is deliberately NOT mapped to "3": extractModel() requires a digit
// before it will accept a string, so folding З→3 could manufacture the very
// digit that makes a non-code pass the check.
const CYRILLIC_HOMOGLYPHS: Record<string, string> = {
  а: "a", в: "b", е: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t",
  у: "y", х: "x", і: "i", ј: "j", ѕ: "s",
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C",
  Т: "T", У: "Y", Х: "X", І: "I", Ј: "J", Ѕ: "S",
};

const LATIN_OR_DIGIT = /[A-Za-z0-9]/;

export function foldHomoglyphs(value: string) {
  return value.replace(/[Ѐ-ӿ]+/g, (run: string, offset: number) => {
    if (run.length !== 1) return run;
    const mapped = CYRILLIC_HOMOGLYPHS[run];
    if (!mapped) return run;
    const before = value[offset - 1] ?? "";
    const after = value[offset + run.length] ?? "";
    return LATIN_OR_DIGIT.test(before) || LATIN_OR_DIGIT.test(after) ? mapped : run;
  });
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

// The Georgian block is U+10A0–U+10FF (Asomtavruli, Mkhedruli, Nuskhuri) PLUS
// Georgian Extended / Mtavruli at U+1C90–U+1CBF, which is what a Shopify theme
// emits for all-caps Georgian headings. Leaving Mtavruli out of the class makes
// every rule below read capitalised Georgian as "not Georgian".
const GEORGIAN_LETTER = /[Ⴀ-ჿᲐ-Ჿ]/;
const NON_GEORGIAN_RUN = /^[^Ⴀ-ჿᲐ-Ჿ]+/;

// ── Identity ───────────────────────────────────────────────────────────────
// The matching key is reconstructed, never read off `sku`. In order:
//   1. the explicit "მოდელი: <code>" line in body_html (present on ~87% of
//      products and written by the merchant, so it is the most reliable),
//   2. failing that, nothing — the title already flows into
//      productNormalization.extractProductAttributes() and modelCodes() picks
//      the code out of it. Guessing a model here would only add noise.
// Both the title and the extracted model are homoglyph-folded first.
// The Mtavruli (all-caps) spelling of the label is accepted too — a Shopify
// theme that upper-cases the spec table emits U+1C90-block letters.
const MODEL_LINE = /(?:მოდელი|ᲛᲝᲓᲔᲚᲘ)\s*[:：]\s*([^\n<|•·]{1,120})/;
const MODEL_MAX_LENGTH = 60;
const MODEL_MAX_TOKENS = 4;
const INSTALLMENT_NOISE = /(თვეში|ლარი|განვადებ)/;

// stripHtml() collapses the whole description onto one line, so the capture in
// MODEL_LINE runs straight on into the next sentence and into the merchant's own
// trailing labels ("კოდი: 149782"). A model code is Latin letters, digits and
// punctuation; the first Georgian letter after it is prose. Cutting there is
// both the sentence boundary and the label boundary in one rule.
//
// The run is measured BEFORE it is used: the old rule capped the match at 60
// characters, so a description whose Latin spec run kept going produced a
// mid-word 60-character blob that passed the digit and installment checks and
// was written to RawOffer.model, where it flowed into extractProductIdentity()
// and canonicalKey() and poisoned cross-store matching. A run longer than a
// model code is prose, so it yields no model at all rather than a truncation.
export function extractModel(descriptionText: string): string | undefined {
  const raw = descriptionText.match(MODEL_LINE)?.[1];
  if (!raw) return undefined;
  // Checked on the WHOLE capture, not just the Latin head: "47 ლარი თვეში"
  // ("47 GEL a month") cuts at the first Georgian letter, so a noise test run
  // after the cut would only ever see the harmless "47".
  if (INSTALLMENT_NOISE.test(raw)) return undefined;
  const run = foldHomoglyphs(raw).match(NON_GEORGIAN_RUN)?.[0];
  if (!run) return undefined;
  const normalized = run.replace(/\s+/g, " ").trim();
  if (normalized.length > MODEL_MAX_LENGTH) return undefined;
  // A model code is one to four tokens; anything past that is spec prose that
  // happened to stay Latin.
  const cleaned = normalized
    .split(" ")
    .slice(0, MODEL_MAX_TOKENS)
    .join(" ")
    .replace(/[\s.,;:–-]+$/, "")
    .trim();
  if (cleaned.length < 2) return undefined;
  // Defensive: the same installment copy that pollutes `sku` occasionally
  // appears in the description, and it must never become a model code.
  if (INSTALLMENT_NOISE.test(cleaned)) return undefined;
  // A code has to carry a digit; a bare word here is a colour or a brand.
  if (!/\d/.test(cleaned)) return undefined;
  return cleaned;
}

/** Shopify serves `tags` as string[] here and as a comma-joined string elsewhere. */
function normalizeTags(raw: string[] | string | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter((tag): tag is string => typeof tag === "string");
  if (typeof raw === "string") return raw.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

// `vendor` is the warranty badge, so brand comes from the "brand-<Brand>" tag.
function extractBrand(tags: string[]): string | undefined {
  for (const tag of tags) {
    const match = /^brand[-_]\s*(.+)$/i.exec(tag.trim());
    const value = match?.[1]?.trim();
    if (value && value.length >= 2 && value.length <= 40) return foldHomoglyphs(value);
  }
  return undefined;
}

// "Collection - ტელევიზორები" / "collection-ბლენდერი" — the merchant's own
// taxonomy, and the only per-product category signal worth reading. The
// separator is REQUIRED: without it a bare "Collections" tag matched and yielded
// the breadcrumb "s".
const COLLECTION_TAG = /^collections?\s*[-–—:]\s*(.+)$/i;

function collectionTags(tags: string[]): string[] {
  return tags
    .map((tag) => COLLECTION_TAG.exec(tag.trim())?.[1]?.trim())
    .filter((name): name is string => Boolean(name));
}

// The thin minority of product_type values that are a real category rather than
// a Facebook-feed audience label. Everything outside this set is dropped before
// it can reach breadcrumbs — see the header note.
const REAL_PRODUCT_TYPES = new Set([
  "გაზის გამათბობელი",
  "კონდიციონერი",
  "ვენტილატორები",
  "ვენტილატორი",
  "სარეცხი მანქანა",
  "მაცივარი",
  "ტელევიზორი",
]);

// ── SCOPE ──────────────────────────────────────────────────────────────────
// iSurve is a generalist: alongside televisions, vacuum cleaners and power
// tools it sells inflatable pools, garden furniture, bedding, jewellery,
// children's toys, car chemicals and cookware. Ingesting all of it would add
// tens of thousands of RawOffers that can never surface, because the public
// catalogue is limited to PUBLIC_CATEGORY_SLUGS.
//
// So the sync is scoped at the DRIVER: only collections whose own title
// resolves to a public Fasmetri category are walked. Everything else is never
// fetched. This is the same shape as Alta's category gate, and it resolves the
// Georgian collection title through categorizeProduct() rather than a
// hand-written table — which is what keeps iSurve's "თმის ფენი" in the same
// bucket as every other shop's hair dryer, and cross-store matching depends on
// that agreeing.
//
// SCOPE, precisely (corrected 2026-09-23 — the previous wording promised
// something the code does not do):
//   * In a collection that CARRIES a category (decision is a slug), every
//     product is ingested under that slug, whatever categorizeProduct would
//     have said about the individual title. Nothing is dropped there.
//   * In a BY_TITLE umbrella shelf ("წვრილი ტექნიკა" = 4,307 rows of
//     everything from a kettle to a pool float) the shelf carries NO category,
//     so the product's own title is the only scope signal there is. A title
//     that does not resolve to a public category is out of scope for this shop
//     and is not ingested.
// The second bullet is a scope decision, not a "dropped for lack of a mapping"
// one, so it does not contradict the standing rule in categoryMapping.ts: that
// rule is about a resolved category having no public shelf yet. Here the shop
// simply sells garden furniture, and an umbrella shelf is the only place it can
// reach the driver. Falling through to "other" instead would ingest tens of
// thousands of permanently invisible RawOffers from a single shelf.

// Marketing shelves, price bands, installment funnels and feed buckets. They
// carry no taxonomy meaning and several of them would otherwise classify off a
// stray keyword in the title.
const EXCLUDED_COLLECTION_PATTERNS: RegExp[] = [
  /ფასდაკლებ/, // "discount"
  /აქცი/, // "promo"
  /განვადებ/, // "installment"
  /ბარათით/, // "when paying by card"
  /გადარიცხვ|გადმორიცხვ/, // "bank transfer"
  /აუთლეტ/, // outlet / ex-display
  /ვაუჩერ/, // vouchers
  /სერვის/, // services
  /საჩუქ/, // gift shelves
  /^front/i,
  /^feed/i,
  /sareklamo/i,
  /^coll[_-]/i,
  /^no\s*feed$/i,
  /^(gld|bfg)\b/i,
  /^ads$/i,
];

// Collections the generic classifier reads wrong, verified by running
// --mode=discover against the live collection list on 2026-09-23. Keyed by
// handle because handles are unique and stable where titles are edited freely.
// Kept deliberately small — every entry is a classifier gap or an umbrella
// shelf, not the start of a second taxonomy.
const COLLECTION_HANDLE_OVERRIDES: Record<string, CollectionDecision | typeof EXCLUDE> = {
  // Umbrella shelves: real product shelves, but far too broad to stamp one slug
  // on. Walked for coverage, classified per product from its own title.
  "წვრილი-ტექნიკა": BY_TITLE,
  "wvrili-teqnika": BY_TITLE,
  "msxvili-teqnika": BY_TITLE,
  "cifruli-teqnika": BY_TITLE,
  "სხვა-წვრილი-ტექნიკა": BY_TITLE,

  // The classifier keys "საშრობი" (dryer) to the tumble-dryer rule, so a hair
  // dryer and a fruit dehydrator both landed in washing-machines — and iSurve
  // files the same hair dryers under "თმის ფენი" as small-appliances, so the
  // shop contradicted itself. Pinned to where every other shop's hair dryer is.
  "tmis-sashrobi": "small-appliances",
  "tmis-sashrobi-profesionaluri-fenebi": "small-appliances",
  "ხილის-საშრობი-აპარატი": "small-appliances",
  // Lint/fabric shaver, not a personal-care epilator.
  "tansacmlis-epilatorebi": "small-appliances",
  // Bags and holders are accessories, not the device they carry.
  "ლეპტოპის-ჩანთები": "computer-accessories",
  "telefonis-samagrebi": "phone-accessories",
  // "ტელეფონის აქსესუარები" ("phone accessories") scores as `mobiles` on the
  // word ტელეფონი, which filed tripods, iPhone cases, selfie sticks and USB
  // hubs as phones (full dry run 2026-09-24).
  "telefonis-aqsesuarebi": "phone-accessories",

  // Wrong device class entirely — these scored on a single shared keyword.
  "ტანსაცმლის-საკიდი": EXCLUDE, // clothes hanger -> tv-mounts
  "ჭურჭლის-საშრობი": EXCLUDE, // dish rack -> washing-machines
  "შილაკის-საშრობი": EXCLUDE, // laundry drying rack -> washing-machines
  "ბალახის-საკრეჭი-ტრიმერი": EXCLUDE, // grass trimmer -> beauty
  "სამშენებლო-ფენი": EXCLUDE, // heat gun -> small-appliances
  "teqnikuri-feni": EXCLUDE, // heat gun -> small-appliances
  "სამშენებლო-მიქსერი": EXCLUDE, // paddle mixer -> small-appliances
  "შესადუღებელი-უთო": EXCLUDE, // soldering iron -> small-appliances
  "mwerebisgan-damcavi": EXCLUDE, // insect repellent -> phone-accessories
  "damcavi-satvale-da-nigbebi": EXCLUDE, // safety goggles -> phone-accessories
  "televizoris-magida": EXCLUDE, // TV table (furniture) -> televisions
};

const COLLECTION_TITLE_OVERRIDES: Record<string, CollectionDecision> = {
  "ჭკვიანი სახლი": "smart-home",
  SmartHome: "smart-home",
  "თავის მოვლა ქალები": "beauty",
  "თავის მოვლა მამაკაცები": "beauty",
  "სხვა თავის მოვლა ქალები": "beauty",
};

// Short Latin-titled shelves that are REAL tech categories, not brand hubs. The
// brand-hub heuristic below ("no Georgian letter and at most two words") cannot
// tell "Bosch" from "Smart TV", so every one of these was being dropped in
// silence. Keyed by the lower-cased, whitespace-collapsed title.
const SHORT_LATIN_CATEGORY_TITLES: Record<string, CollectionDecision> = {
  ssd: "computer-accessories",
  hdd: "computer-accessories",
  "hard disk": "computer-accessories",
  "flash drive": "computer-accessories",
  "usb flash": "computer-accessories",
  "power bank": "phone-accessories",
  powerbank: "phone-accessories",
  tv: "televisions",
  "smart tv": "televisions",
  "4k tv": "televisions",
  "tv box": "televisions",
  soundbar: "audio",
  "sound bar": "audio",
  "air fryer": "small-appliances",
  airfryer: "small-appliances",
  "robot vacuum": "home-appliances",
  "action camera": "photo-video",
  "web camera": "photo-video",
  webcam: "photo-video",
  "smart watch": "wearables",
  smartwatch: "wearables",
  "smart band": "wearables",
  "smart home": "smart-home",
  smarthome: "smart-home",
};

function shortLatinCategoryTitle(title: string): CollectionDecision | undefined {
  return SHORT_LATIN_CATEGORY_TITLES[title.toLowerCase().replace(/\s+/g, " ").trim()];
}

// A bare brand name is not a category. iSurve has ~1,330 collections and a
// large share of them are brand hubs ("Bosch", "Samsung", "Apple", "Braun"),
// which sell across half the catalogue — letting "Samsung" resolve to
// `mobiles` would file 200 washing machines and TVs as phones. Brand hubs are
// therefore never drivers; their products still arrive through the real
// category collections. Detected as: no Georgian letter in the title and at
// most two words — which is why SHORT_LATIN_CATEGORY_TITLES and
// COLLECTION_TITLE_OVERRIDES are both consulted BEFORE this runs.
function looksLikeBrandHub(title: string) {
  if (GEORGIAN_LETTER.test(title)) return false;
  return title.trim().split(/\s+/).length <= 2;
}

export type CollectionVerdict =
  | { decision: CollectionDecision; reason?: undefined }
  | { decision: undefined; reason: CollectionRejectReason };

const collectionVerdictCache = new Map<string, CollectionVerdict>();

export function classifyCollection(handle: string, title: string): CollectionVerdict {
  const key = `${handle}\u0000${title.trim()}`;
  const cached = collectionVerdictCache.get(key);
  if (cached) return cached;
  const verdict = computeCollectionVerdict(handle, title.trim());
  collectionVerdictCache.set(key, verdict);
  return verdict;
}

export function resolveCollectionCategory(handle: string, title: string): CollectionDecision | undefined {
  return classifyCollection(handle, title).decision;
}

function computeCollectionVerdict(handle: string, title: string): CollectionVerdict {
  const handleOverride = COLLECTION_HANDLE_OVERRIDES[handle];
  if (handleOverride) {
    return handleOverride === EXCLUDE
      ? { decision: undefined, reason: "handle-override-exclude" }
      : { decision: handleOverride };
  }
  if (!title) return { decision: undefined, reason: "empty-title" };
  if (EXCLUDED_COLLECTION_PATTERNS.some((pattern) => pattern.test(title))) {
    return { decision: undefined, reason: "marketing-shelf" };
  }
  // Explicit knowledge first: the hand-written title table and the short Latin
  // category allow-list both describe titles the brand-hub heuristic would
  // otherwise swallow (that is how COLLECTION_TITLE_OVERRIDES["SmartHome"] was
  // dead code, and how SSD / TV / Soundbar / Air Fryer were dropped in silence).
  const titleOverride = COLLECTION_TITLE_OVERRIDES[title];
  if (titleOverride) return { decision: titleOverride };
  const shortLatin = shortLatinCategoryTitle(title);
  if (shortLatin) return { decision: shortLatin };
  if (looksLikeBrandHub(title)) return { decision: undefined, reason: "brand-hub" };
  const decision = categorizeProduct({ title });
  return isPublicCategorySlug(decision.publicCategorySlug)
    ? { decision: decision.publicCategorySlug }
    : { decision: undefined, reason: "unclassified" };
}

/** Every collection whose title resolves to a public Fasmetri category. */
export async function fetchInScopeCollections(options?: {
  onReject?: (collection: RejectedCollection) => void;
}): Promise<IsurveCollection[]> {
  const out: IsurveCollection[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await apiGet<{ collections?: ShopifyCollection[] }>(
      `${COLLECTIONS_URL}?limit=${PAGE_SIZE}&page=${page}`,
    );
    // The collection list IS the scope, so a failed page is not "the end of the
    // list" — it would silently shrink the sync to whatever was read so far.
    if (body.status === "failed") {
      throw new Error(`[isurve] collection list page ${page} failed; refusing to run on a partial scope.`);
    }
    if (body.status === "ceiling") break;
    const collections = body.data.collections ?? [];
    if (collections.length === 0) break;
    for (const collection of collections) {
      const handle = collection.handle?.trim();
      const title = collection.title?.trim();
      if (!handle || !title || seen.has(handle)) continue;
      seen.add(handle);
      const productsCount = collection.products_count ?? 0;
      if (productsCount <= 0) continue;
      const verdict = classifyCollection(handle, title);
      if (!verdict.decision) {
        options?.onReject?.({ handle, title, productsCount, reason: verdict.reason });
        continue;
      }
      out.push({ handle, title, productsCount, decision: verdict.decision });
    }
    if (collections.length < PAGE_SIZE) break;
    await sleep(REQUEST_DELAY_MS);
  }
  // Smallest collections first: the narrowest shelf ("თმის ფენი დიფუზორით") is
  // also the most specific, and first-seen wins in the dedup below.
  return out.sort((left, right) => left.productsCount - right.productsCount);
}

type CollectionFetch = {
  products: ShopifyProduct[];
  /** false when a page failed or the walk came back short of products_count. */
  complete: boolean;
  problem?: string;
};

async function fetchCollectionProducts(collection: IsurveCollection): Promise<CollectionFetch> {
  const collected: ShopifyProduct[] = [];
  let hitPageCap = true;
  for (let page = 1; page <= MAX_COLLECTION_PAGES; page += 1) {
    const url = `${SITE_BASE}/collections/${encodeURIComponent(collection.handle)}/products.json?limit=${PAGE_SIZE}&page=${page}`;
    const body = await apiGet<{ products?: ShopifyProduct[] }>(url);
    if (body.status === "failed") {
      const problem = `listing FAILED: collection=${collection.handle} page=${page} (${collected.length} rows read before the failure)`;
      console.warn(`[isurve] ${problem}`);
      return { products: collected, complete: false, problem };
    }
    if (body.status === "ceiling") {
      hitPageCap = false;
      break;
    }
    const products = body.data.products ?? [];
    collected.push(...products);
    if (products.length < PAGE_SIZE) {
      hitPageCap = false;
      break;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (hitPageCap) {
    const problem = `collection=${collection.handle} hit the ${MAX_COLLECTION_PAGES}-page ceiling at ${collected.length} rows — truncated`;
    console.warn(`[isurve] ${problem}`);
    return { products: collected, complete: false, problem };
  }

  const expected = collection.productsCount;
  const shortfall = expected - collected.length;
  if (shortfall > 0) {
    const tolerance = Math.max(COLLECTION_SHORTFALL_MIN, Math.ceil(expected * COLLECTION_SHORTFALL_TOLERANCE));
    const problem = `collection=${collection.handle} returned ${collected.length} of ${expected} products (short by ${shortfall})`;
    console.warn(`[isurve] ${problem}`);
    if (shortfall > tolerance) return { products: collected, complete: false, problem };
  }

  return { products: collected, complete: true };
}

// Most iSurve products are single-variant ("Default Title"). Where there are
// several, the first PURCHASABLE variant sets the price — a shop page that
// shows a sold-out 128GB row above an in-stock 256GB row should compare on the
// one a shopper can actually buy.
function pickVariant(variants: ShopifyVariant[]): ShopifyVariant | undefined {
  return variants.find((variant) => variant.available === true) ?? variants[0];
}

// A variant title that says nothing ("Default Title") is Shopify's placeholder
// for a single-variant product.
function variantLabel(variant: ShopifyVariant): string | undefined {
  const label = foldHomoglyphs((variant.title ?? "").trim());
  return label && !/^default title$/i.test(label) ? label : undefined;
}

// "+ საჩუქარი აეროგრილი FRANKO FAF-1217" ("+ free FRANKO FAF-1217 air fryer")
// is a bundle perk, not the product. Left in the title, the GIFT's model code
// sat in the identity signal next to the real one, and modelCodes() returns its
// codes sorted, so "faf-1217" beat "fdr-405fso": a Marazzi refrigerator and two
// Marazzi washing machines all keyed "marazzi|faf_1217" (full dry run
// 2026-09-24). The same model with and without the gift is one product.
const GIFT_SUFFIX = /\s*\+\s*საჩუქ.*$/u;

function availabilityOf(variants: ShopifyVariant[]): OfferAvailability {
  if (variants.length === 0) return "UNKNOWN" as OfferAvailability;
  if (variants.some((variant) => variant.available === true)) return "IN_STOCK" as OfferAvailability;
  if (variants.every((variant) => variant.available === false)) return "OUT_OF_STOCK" as OfferAvailability;
  return "UNKNOWN" as OfferAvailability;
}

// One Shopify product can be several purchasable configurations: "Samsung
// Galaxy A16" carries 4/128, 6/128 and 8/256 × three colours at three prices,
// "iPhone 17 Pro Max" 256GB to 2TB. Collapsing that to one offer priced at the
// first in-stock variant compared a 499 GEL price against whichever storage
// the matcher happened to parse out of the spec prose ("1.5TB microSD" ->
// "5tb"). So a product whose variants are real (anything but Shopify's
// "Default Title" placeholder) yields one offer per variant, each with its own
// price, stock, variant label in the title, and a ?variant= URL (RawOffer is
// unique on shop+URL). Single-variant products keep the bare product URL and
// the numeric product id, so rows ingested before this change stay keyed the
// same. The public catalogue already keeps one (cheapest) offer per shop per
// product, so colour-only variants of an appliance never show twice.
export function toScrapedOffers(product: ShopifyProduct, decision: CollectionDecision): ScrapedOffer[] {
  const handle = product.handle?.trim();
  const baseTitle = foldHomoglyphs((product.title ?? "").trim()).replace(GIFT_SUFFIX, "").trim();
  if (!handle || !baseTitle) return [];

  const variants = product.variants ?? [];
  const labelled = variants.filter((variant) => variantLabel(variant));
  if (variants.length <= 1 || labelled.length === 0) {
    const offer = buildOffer(product, decision, {
      handle,
      baseTitle,
      title: baseTitle,
      variant: pickVariant(variants),
      availabilityFrom: variants,
      externalId: String(product.id),
      url: `${SITE_BASE}/products/${handle}`,
    });
    return offer ? [offer] : [];
  }

  const offers: ScrapedOffer[] = [];
  variants.forEach((variant, index) => {
    const label = variantLabel(variant);
    const variantKey = variant.id != null ? String(variant.id) : `i${index}`;
    const offer = buildOffer(product, decision, {
      handle,
      baseTitle,
      title: label ? `${baseTitle} ${label}` : baseTitle,
      variant,
      availabilityFrom: [variant],
      externalId: `${product.id}-${variantKey}`,
      url: variant.id != null ? `${SITE_BASE}/products/${handle}?variant=${variant.id}` : `${SITE_BASE}/products/${handle}#${variantKey}`,
    });
    if (offer) offers.push(offer);
  });
  return offers;
}

function buildOffer(
  product: ShopifyProduct,
  decision: CollectionDecision,
  target: {
    handle: string;
    baseTitle: string;
    title: string;
    variant: ShopifyVariant | undefined;
    availabilityFrom: ShopifyVariant[];
    externalId: string;
    url: string;
  },
): ScrapedOffer | null {
  const { title, variant } = target;
  const price = toNumber(variant?.price);
  if (!price || price <= 0) return null;

  const compareAt = toNumber(variant?.compare_at_price);
  const oldPrice = compareAt && compareAt > price ? compareAt : undefined;

  const tags = normalizeTags(product.tags);
  const descriptionText = stripHtml(foldHomoglyphs(product.body_html ?? ""));
  const model = extractModel(descriptionText);

  // breadcrumbs are a SCORING SIGNAL for categorizeProduct(), not free-text, so
  // product_type only rides along when it is one of the known-real values. The
  // Facebook audience labels ("ქალი"/"კაცი"/"ორივე", 76% of rows) are live
  // beauty/clothing keywords and would actively mis-categorise the catalogue.
  const productType = product.product_type?.trim();
  const realProductType = productType && REAL_PRODUCT_TYPES.has(productType) ? productType : undefined;
  const breadcrumbs = [...collectionTags(tags), realProductType].filter((value): value is string =>
    Boolean(value),
  );

  // Umbrella shelves carry no category authority — fall through to the shared
  // title-based signal helper instead of stamping the shelf's slug on a phone
  // holder that happens to sit in "წვრილი ტექნიკა". A product that still does
  // not resolve to a public category is out of scope for this shop (see SCOPE —
  // this drop is deliberate and applies to BY_TITLE shelves only).
  // Classified on the product title, not the variant-suffixed one, so every
  // variant of one product lands in the same category.
  const titleCategory =
    decision === BY_TITLE ? categorySlugForSignals([target.baseTitle, ...breadcrumbs]) : decision;
  // iSurve sells no laptops (see isurve.adapter.ts). What the title classifier
  // files there off an umbrella shelf is the gear around one — a notebook
  // stand, a notebook cooler, a wireless mouse, a mouse pad (dry run
  // 2026-09-24) — and a stray accessory in `laptops` is a public-catalogue
  // leak into a flagship category, so it is pinned to computer-accessories.
  const categorySlug =
    decision === BY_TITLE && titleCategory === "laptops" ? "computer-accessories" : titleCategory;
  if (!categorySlug || !isPublicCategorySlug(categorySlug)) return null;

  return {
    // The Shopify numeric id (plus the variant id for multi-variant products).
    // `sku` is installment copy and `barcode` is empty, so this is the only
    // stable per-shop key; it is store-local by nature and is used for in-shop
    // dedup only, never for cross-store matching.
    externalId: target.externalId,
    title,
    url: target.url,
    imageUrl: product.images?.[0]?.src ?? undefined,
    price,
    oldPrice,
    availability: availabilityOf(target.availabilityFrom),
    // Lands in RawOffer.rawCategory, read downstream as `scrapedShopCategory`.
    categorySlug,
    // ONLY the "მოდელი:" line — never the spec prose. The description is part
    // of the matcher's extraction signal, and modelCodes() returns every
    // code-shaped token in it SORTED, taking the first as the canonical model
    // code. iSurve's spec blocks are full of code-shaped tokens, so the full
    // dry run of 2026-09-24 keyed 8 different Raf air fryers "raf|360c_"
    // ("360°C"), Sharp/Indesit/Beko fridges "<brand>|r600a" (the refrigerant),
    // six Philips mixers "philips|5turbo" and monitors "cd_m2" / "178o_178o",
    // while phones read storage out of "microSD up to 1.5TB". Nothing public
    // renders RawOffer.description, so nothing is lost but the noise.
    // "" rather than undefined: saveRawOffer's upsert treats undefined as "leave
    // the column alone", which would keep the old spec prose on the rows the
    // 2026-09-22 partial import already stored.
    description: model ? `მოდელი: ${model}` : "",
    breadcrumbs,
    imageAlt: title,
    // NEVER product.vendor — that field holds the warranty badge.
    brand: extractBrand(tags),
    model,
  };
}

export type IsurveSyncResult = {
  mode: IsurveSyncMode;
  collectionsSeen: number;
  collectionsInScope: number;
  collectionsRejected: number;
  incompleteCollections: string[];
  itemsFromApi: number;
  uniqueProducts: number;
  usable: number;
  written: number;
  skipped: number;
  byCategory: Record<string, number>;
  /** First few parsed offers, so a dry run can be eyeballed without a DB. */
  samples: ScrapedOffer[];
  batchId?: string;
};

async function existingRawOfferCount(): Promise<number> {
  if (!db) return 0;
  return db.rawOffer.count({ where: { shop: { slug: "isurve" }, status: { notIn: ["EXCLUDED"] } } });
}

export async function runIsurveSync(options: {
  mode: IsurveSyncMode;
  promote?: boolean;
  limit?: number;
  collection?: string;
}): Promise<IsurveSyncResult> {
  const rejected: RejectedCollection[] = [];
  const inScope = await fetchInScopeCollections({
    onReject: (entry) => rejected.push(entry),
  });
  const collections = options.collection
    ? inScope.filter((entry) => entry.handle === options.collection)
    : inScope;

  const byId = new Map<number, { product: ShopifyProduct; decision: CollectionDecision }>();
  let itemsFromApi = 0;

  const result: IsurveSyncResult = {
    mode: options.mode,
    collectionsSeen: 0,
    collectionsInScope: collections.length,
    collectionsRejected: rejected.length,
    incompleteCollections: [],
    itemsFromApi: 0,
    uniqueProducts: 0,
    usable: 0,
    written: 0,
    skipped: 0,
    byCategory: {},
    samples: [],
  };

  if (options.mode === "discover" && !options.collection) {
    for (const entry of collections) {
      console.log(`[isurve] ${entry.decision.padEnd(20)} ${String(entry.productsCount).padStart(5)}  ${entry.handle}  (${entry.title})`);
      result.byCategory[entry.decision] = (result.byCategory[entry.decision] ?? 0) + entry.productsCount;
    }
    // Every drop is logged: a shelf silently rejected as a brand hub is exactly
    // how SSD / Smart TV / Soundbar / Air Fryer went missing.
    console.log("");
    console.log(`[isurve] rejected collections: ${rejected.length}`);
    const byReason = new Map<CollectionRejectReason, RejectedCollection[]>();
    for (const entry of rejected) {
      const bucket = byReason.get(entry.reason) ?? [];
      bucket.push(entry);
      byReason.set(entry.reason, bucket);
    }
    for (const [reason, entries] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const products = entries.reduce((sum, entry) => sum + entry.productsCount, 0);
      console.log(`[isurve]   ${reason.padEnd(24)} ${String(entries.length).padStart(5)} collections, ${products} products`);
      for (const entry of entries.sort((a, b) => b.productsCount - a.productsCount)) {
        console.log(`[isurve]     reject ${reason.padEnd(24)} ${String(entry.productsCount).padStart(5)}  ${entry.handle}  (${entry.title})`);
      }
    }
    result.collectionsSeen = collections.length;
    return result;
  }

  for (const entry of collections) {
    const fetched = await fetchCollectionProducts(entry);
    if (!fetched.complete) result.incompleteCollections.push(fetched.problem ?? entry.handle);
    itemsFromApi += fetched.products.length;
    // A product listed in several collections comes back more than once; the
    // first (narrowest — see the sort above) collection wins.
    for (const product of fetched.products) {
      if (!byId.has(product.id)) byId.set(product.id, { product, decision: entry.decision });
    }
    console.log(
      `[isurve] ${entry.handle} -> ${entry.decision}: ${fetched.products.length} rows, ${byId.size} unique so far`,
    );
    if (options.limit && byId.size >= options.limit) break;
    await sleep(REQUEST_DELAY_MS);
  }

  let unique = [...byId.values()];
  if (options.limit) unique = unique.slice(0, options.limit);

  // One product can yield several offers (one per purchasable variant), so
  // "skipped" counts products that produced none, not a difference of totals.
  const offers: ScrapedOffer[] = [];
  let productsWithoutOffer = 0;
  for (const { product, decision } of unique) {
    const productOffers = toScrapedOffers(product, decision);
    if (productOffers.length === 0) productsWithoutOffer += 1;
    offers.push(...productOffers);
  }

  result.collectionsSeen = collections.length;
  result.itemsFromApi = itemsFromApi;
  result.uniqueProducts = unique.length;
  result.usable = offers.length;
  result.skipped = productsWithoutOffer;
  result.samples = offers.slice(0, 8);
  for (const offer of offers) {
    const slug = offer.categorySlug ?? "other";
    result.byCategory[slug] = (result.byCategory[slug] ?? 0) + 1;
  }

  // Alta's shape: discover never writes, whatever the other flags say. The old
  // guard short-circuited only when no --collection was given, so
  // `--mode=discover --collection=<h> --promote` fell through and WROTE.
  if (options.mode === "discover" || !options.promote) return result;

  // ── Validation gate ──────────────────────────────────────────────────────
  // Without this a broken read wrote zero offers and still stamped
  // ingestionStatus "SUCCESS" — a false green over an empty ingestion.
  const hardFailures: string[] = [];
  if (collections.length === 0) hardFailures.push("no in-scope collections were resolved.");
  if (unique.length === 0) hardFailures.push("the collection walk returned zero products.");
  if (offers.length === 0) hardFailures.push("zero usable offers survived parsing.");
  if (result.incompleteCollections.length > 0) {
    hardFailures.push(
      `${result.incompleteCollections.length} collection(s) came back incomplete: ${result.incompleteCollections.slice(0, 5).join("; ")}`,
    );
  }
  // Only a full pass is comparable with what is stored; a --limit or a single
  // --collection run is a partial by construction.
  const isFullPass = !options.limit && !options.collection;
  if (isFullPass) {
    const stored = await existingRawOfferCount();
    if (stored > 0 && offers.length < Math.floor(stored * LOW_COUNT_RATIO)) {
      hardFailures.push(
        `new offer count ${offers.length} is suspiciously lower than the ${stored} iSurve offers already stored.`,
      );
    }
  }
  if (hardFailures.length > 0) {
    throw new Error(`[isurve] refusing to promote — ${hardFailures.join(" ")}`);
  }

  if (!db) throw new Error("DATABASE_URL is required to promote iSurve offers.");
  const shop = await db.shop.upsert({
    where: { slug: "isurve" },
    update: { name: "iSurve", baseUrl: SITE_BASE, needsConfiguration: false },
    create: { slug: "isurve", name: "iSurve", baseUrl: SITE_BASE, enabled: true, needsConfiguration: false },
  });

  const batchId = createImportBatch("isurve");
  for (const offer of offers) {
    await saveRawOffer(shop.id, offer, batchId);
    result.written += 1;
  }

  await db.shop.update({
    where: { id: shop.id },
    data: { lastScrapedAt: new Date(), lastIngestedAt: new Date(), ingestionStatus: "SUCCESS" },
  });

  result.batchId = batchId;
  return result;
}
