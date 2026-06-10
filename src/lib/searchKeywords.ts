import { ProductView } from "@/lib/catalog-types";

// Data-driven search with no keyword/alias/category tables. A query is
// normalized into tokens and EVERY token must match the product (AND
// semantics). Tokens containing digits ("15", "s24", "256gb", "8/256") only
// match whole tokens of the product text, so "iphone 15" can never match
// "Galaxy A15", "iPhone 16" or a random "155". Letter-only tokens also match
// by prefix ("iphon" → "iphone"), which powers the type-ahead suggestions.

type SearchPlan = {
  normalizedQuery: string;
  tokens: string[];
};

export function normalizeSearchText(input?: string | null) {
  if (!input) return "";
  return (
    input
      .toLowerCase()
      .replace(/[|_]+/g, " ")
      // "8gb/256gb", "8 / 256" → "8/256"
      .replace(/\b(\d{1,2})\s*gb?\s*\/\s*(\d{2,4})\s*(?:gb|tb)?\b/g, "$1/$2")
      // glue unit to amount: "256 gb" → "256gb"
      .replace(/\b(\d+(?:\.\d+)?)\s*(gb|tb|ghz|hz|mah|mp|w)\b/g, "$1$2")
      // split letters→digits when the letter run is a word, not a model code:
      // "iphone15" → "iphone 15" but "s24" / "a15" / "g86" stay intact
      .replace(/\b(\p{L}{2,})(\d)/gu, "$1 $2")
      // split digits→letters except unit suffixes: "15pro" → "15 pro"
      .replace(/\b(\d+)(?!gb|tb|ghz|hz|mah|mp|w\b)(\p{L}{2,})/gu, "$1 $2")
      .replace(/[^\p{L}\p{N}\s/.+-]/gu, " ")
      .replace(/[-.](?=\s|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function tokenize(value: string) {
  return value
    .split(/\s+/)
    .map((token) => token.replace(/^[-.+/]+|[-.+/]+$/g, ""))
    .filter((token) => token.length > 1 || /\d/.test(token));
}

export function buildSearchPlan(query?: string | null): SearchPlan | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;
  const tokens = [...new Set(tokenize(normalizedQuery).map(stemQueryToken).map(applyQueryTokenAlias))];
  if (!tokens.length) return null;
  return { normalizedQuery: tokens.join(" "), tokens };
}

// Georgian phonetic spellings of common brands/product lines. Product titles
// in the catalog are Latin, so a query like "აიფონი 15" only works if the
// Georgian token is translated to its Latin equivalent before matching.
const QUERY_TOKEN_ALIASES: Record<string, string> = {
  "აიფონ": "iphone",
  "აიფონებ": "iphone",
  "ეპლ": "apple",
  "ეფლ": "apple",
  "სამსუნგ": "samsung",
  "გალაქს": "galaxy",
  "გალაკს": "galaxy",
  "ქსიაომ": "xiaomi",
  "სიაომ": "xiaomi",
  "შაომ": "xiaomi",
  "რედმ": "redmi",
  "პოკო": "poco",
  "მაკბუქ": "macbook",
  "მაკბუკ": "macbook",
  "ლენოვო": "lenovo",
  "ასუს": "asus",
  "ეისერ": "acer",
  "დელ": "dell",
  "ჰონორ": "honor",
  "ჰუავე": "huawei",
  "პიქსელ": "pixel",
  "გუგლ": "google",
  "ვანფლას": "oneplus",
  "თინქფად": "thinkpad",
  "აიდიაფად": "ideapad",
};

function applyQueryTokenAlias(token: string) {
  // Tokens arrive already stemmed of the nominative "-ი"; also try a stripped
  // plural "-ებ" so "აიფონები" → "აიფონებ" → "აიფონ" resolves.
  return (
    QUERY_TOKEN_ALIASES[token] ??
    (token.endsWith("ებ") ? QUERY_TOKEN_ALIASES[token.slice(0, -2)] : undefined) ??
    token
  );
}

// Georgian nouns carry a nominative "-ი" ending that product/category text may
// inflect away ("ლეპტოპი" vs "ლეპტოპები"). Matching is prefix-based, so
// stripping the case marker is enough — a structural rule, not a keyword list.
function stemQueryToken(token: string) {
  if (token.length >= 4 && /^[Ⴀ-ჿ]+ი$/.test(token)) return token.slice(0, -1);
  return token;
}

// Terms handed to the SQL candidate query (catalog.searchWhere combines them
// with AND, one `contains` per term).
export function productSearchWhereTerms(query?: string | null) {
  return buildSearchPlan(query)?.tokens ?? [];
}

export function rankSearchResults(products: ProductView[], query?: string | null, sort?: string) {
  const plan = buildSearchPlan(query);
  if (!plan) return products;

  return products
    .map((product) => ({ product, score: scoreProductSearch(product, plan) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || compareSearchTie(left.product, right.product, sort))
    .map((entry) => entry.product);
}

export function scoreProductSearch(product: ProductView, queryOrPlan?: string | SearchPlan | null) {
  const plan = typeof queryOrPlan === "string" || queryOrPlan == null ? buildSearchPlan(queryOrPlan) : queryOrPlan;
  if (!plan) return 0;

  const titleText = normalizeSearchText(product.name);
  const titleTokens = tokenize(titleText);
  const titleTokenSet = new Set(titleTokens);
  const restText = normalizeSearchText(
    [
      product.brand,
      product.model,
      product.canonicalKey,
      product.category?.slug,
      product.category?.nameKa,
      product.category?.nameEn,
      ...product.offers.flatMap((offer) => [offer.title, offer.canonicalKey]),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const restTokenSet = new Set(tokenize(restText));

  // AND semantics: every query token must match somewhere on the product.
  let titleMatches = 0;
  for (const token of plan.tokens) {
    const inTitle = tokenMatches(token, titleTokenSet, titleText);
    if (inTitle) titleMatches += 1;
    else if (!tokenMatches(token, restTokenSet, restText)) return 0;
  }

  let score = 100;
  // Whole query appears in the title as a phrase → strongest signal.
  if (titleText === plan.normalizedQuery) score += 100;
  else if (phraseInText(titleText, plan.normalizedQuery)) score += 60;
  // All tokens in the title (any order) still beats matches via offer titles.
  if (titleMatches === plan.tokens.length) score += 30;
  // Earlier first-token position in the title reads as more relevant.
  const firstIndex = titleTokens.findIndex((token) => tokenMatches(plan.tokens[0], new Set([token]), token));
  if (firstIndex >= 0) score += Math.max(0, 10 - firstIndex * 2);
  // Fewer leftover title tokens → more specific result ("iPhone 15" before
  // "iPhone 15 Pro Max Case ...").
  score += Math.max(0, 12 - Math.max(0, titleTokens.length - plan.tokens.length) * 2);
  score += Math.min(product.popularityScore / 10, 10);
  return Math.round(score);
}

function tokenMatches(token: string, tokens: Set<string>, text: string) {
  if (tokens.has(token)) return true;
  // Digit-bearing tokens (model numbers, specs) must match a whole token.
  if (/[\d/]/.test(token)) return false;
  // Letter-only tokens match by prefix so partial typing still finds items.
  if (token.length >= 3) {
    for (const candidate of tokens) {
      if (candidate.startsWith(token)) return true;
    }
    return text.includes(token);
  }
  return false;
}

function phraseInText(text: string, phrase: string) {
  const index = text.indexOf(phrase);
  if (index < 0) return false;
  const before = index === 0 ? " " : text[index - 1];
  const after = index + phrase.length >= text.length ? " " : text[index + phrase.length];
  return before === " " && after === " ";
}

function compareSearchTie(left: ProductView, right: ProductView, sort?: string) {
  const minPrice = (product: ProductView) => Math.min(...product.offers.map((offer) => offer.currentPrice));
  const maxDiscount = (product: ProductView) => Math.max(...product.offers.map((offer) => offer.discountPercent));

  if (sort === "discount") return maxDiscount(right) - maxDiscount(left);
  if (sort === "highest") return minPrice(right) - minPrice(left);
  if (sort === "newest" || sort === "updated") return right.updatedAt.localeCompare(left.updatedAt);
  if (sort === "popular" || sort === "priority") return right.popularityScore - left.popularityScore;
  return minPrice(left) - minPrice(right);
}
