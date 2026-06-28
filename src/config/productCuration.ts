import { isPublicCategorySlug } from "@/config/categoryMapping";
import { CategoryView, OfferView, ProductView, isPublicMatchStatus } from "@/lib/catalog-types";
import { normalizeProductName } from "@/lib/matching";
import { readProductIdentity } from "@/lib/productIdentity";
import { explainMatchDecision } from "@/lib/productMatching";

export const PRIORITY_CATEGORIES = ["mobiles", "laptops"] as const;

export const SECONDARY_CATEGORIES = [] as const;

export const EXCLUDED_PUBLIC_CATEGORIES = ["adult", "18+", "erotic", "test", "demo", "internal"] as const;

export const EXCLUDED_KEYWORDS = [
  "",
  "",
  "",
  "",
  "erotic",
  "adult",
  "dildo",
  "vibrator",
  "sex toy",
  "demo product",
  "mock product",
  "test product",
  "internal product",
] as const;

export const PRIORITY_BRANDS = [
  "apple",
  "samsung",
  "xiaomi",
  "honor",
  "google",
  "lenovo",
  "asus",
  "acer",
  "dell",
  "hp",
  "lg",
  "bosch",
  "beko",
  "midea",
  "dyson",
  "philips",
  "delonghi",
  "sony",
  "logitech",
  "kingston",
  "tp-link",
  "anker",
] as const;

export const PRODUCT_PRIORITY_RULES = {
  priorityCategory: 34,
  secondaryCategory: 14,
  multiShop: 28,
  comparisonSpread: 20,
  highDemandTerm: 18,
  priorityBrand: 12,
  image: 12,
  inStock: 10,
  discount: 22,
  value: 16,
  recent: 10,
  searchRelevance: 18,
} as const;

const highDemandTerms = [
  "iphone",
  "galaxy",
  "pixel",
  "macbook",
  "laptop",
  "ideapad",
  "tuf",
  "airpods",
  "buds",
  "headphone",
  "earbuds",
  "speaker",
  "soundbar",
  "apple watch",
  "galaxy watch",
  "smart watch",
  "monitor",
  "oled",
  "qled",
  "smart tv",
  "playstation",
  "ps5",
  "xbox",
  "nintendo",
  "refrigerator",
  "fridge",
  "washing machine",
  "dishwasher",
  "vacuum",
  "robot vacuum",
  "air conditioner",
  "air fryer",
  "coffee machine",
  "ssd",
  "router",
  "power bank",
  "magsafe",
  "usb-c",
  "charger",
  "camera",
  "microphone",
  "dash cam",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
];

const technologyCategorySet = new Set<string>(PRIORITY_CATEGORIES);

const excludedCategorySet = new Set<string>(EXCLUDED_PUBLIC_CATEGORIES);
const priorityCategorySet = new Set<string>(PRIORITY_CATEGORIES);
const secondaryCategorySet = new Set<string>(SECONDARY_CATEGORIES);
const featuredComparisonCategorySet = new Set<string>(PRIORITY_CATEGORIES);
const purchaseDecisionTerms = [
  "iphone",
  "galaxy",
  "pixel",
  "macbook",
  "laptop",
  "ideapad",
  "thinkpad",
  "inspiron",
  "tuf",
  "airpods",
  "buds",
  "headphone",
  "apple watch",
  "galaxy watch",
  "smart watch",
  "monitor",
  "oled",
  "qled",
  "smart tv",
  "playstation",
  "ps5",
  "xbox",
  "nintendo",
  "refrigerator",
  "fridge",
  "washing machine",
  "dishwasher",
  "vacuum",
  "robot vacuum",
  "air conditioner",
  "air fryer",
  "coffee machine",
  "ssd",
  "router",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
];
const lowAttentionFeaturedTerms = [
  "case",
  "cover",
  "screen protector",
  "privacy shield",
  "tempered glass",
  "cable",
  "adapter",
  "strap",
  "",
  "",
  "",
];

export type PublicCurationFilters = {
  popularOnly?: boolean;
  techOnly?: boolean;
  largeDiscountOnly?: boolean;
  inStockOnly?: boolean;
  requireImage?: boolean;
  requireUsefulCategory?: boolean;
  requireFeaturedComparison?: boolean;
  requireDiscoveryQuality?: boolean;
};

export function isExcludedPublicCategory(category?: Pick<CategoryView, "slug" | "nameKa" | "nameEn"> | null) {
  if (!category) return false;
  const signals = [category.slug, category.nameKa, category.nameEn ?? ""].map((value) => normalizeSignal(value));
  return signals.some((signal) => [...excludedCategorySet].some((excluded) => signal.includes(normalizeSignal(excluded))));
}

export function isPriorityCategory(slug?: string | null) {
  return Boolean(slug && priorityCategorySet.has(slug));
}

export function isUsefulCategory(slug?: string | null) {
  return Boolean(slug && (priorityCategorySet.has(slug) || secondaryCategorySet.has(slug)));
}

export function isTechnologyCategory(slug?: string | null) {
  return Boolean(slug && technologyCategorySet.has(slug));
}

export function publicOffers(offers: OfferView[], product?: Pick<ProductView, "name">) {
  const sorted = offers.filter((offer) => isPublicOffer(offer)).sort((left, right) => left.currentPrice - right.currentPrice);
  // A price comparison shows one price per shop. When the same shop has several
  // offers attached to a product, prefer that shop's exact-title offer. This
  // prevents a near-match from becoming the displayed price only because it is
  // cheaper than the product's own SKU.
  const productTitle = product ? comparableTitle(product.name) : "";
  const byShop = new Map<string, OfferView[]>();
  for (const offer of sorted) {
    const group = byShop.get(offer.shop.id) ?? [];
    group.push(offer);
    byShop.set(offer.shop.id, group);
  }
  return [...byShop.values()]
    .map((shopOffers) => shopOffers.find((offer) => productTitle && comparableTitle(offer.title) === productTitle) ?? shopOffers[0])
    .sort((left, right) => left.currentPrice - right.currentPrice);
}

export function toPublicProduct(product: ProductView): ProductView | null {
  if (product.isPublic === false || product.needsReview || product.archivedAt || product.categoryNeedsReview) return null;
  // Public catalog scope is controlled by PUBLIC_CATEGORY_SLUGS.
  if (!isPublicCategorySlug(product.category?.slug)) return null;
  if (isExcludedPublicCategory(product.category) || hasExcludedKeyword(product.name)) return null;
  const offers = publicOffers(product.offers, product);
  if (!offers.length) return null;
  return { ...product, offers, offerCount: offers.length };
}

export function publicProducts(products: ProductView[]): ProductView[] {
  const safeProducts: ProductView[] = [];
  for (const product of products) {
    const safeProduct = toPublicProduct(product);
    if (safeProduct) safeProducts.push(safeProduct);
  }
  return safeProducts;
}

export function filterCuratedProducts(products: ProductView[], filters: PublicCurationFilters = {}): ProductView[] {
  return publicProducts(products).filter((product) => {
    const offers = product.offers;
    if (filters.requireImage && !hasProductImage(product, offers)) return false;
    if (filters.requireUsefulCategory && !isUsefulComparisonProduct(product, offers)) return false;
    if (filters.requireFeaturedComparison && !isFeaturedComparisonProduct(product, offers)) return false;
    if (filters.requireDiscoveryQuality && !isDiscoveryQualityProduct(product, offers)) return false;
    if (filters.popularOnly && calculateProductPriority(product, offers) < 58) return false;
    if (filters.techOnly && !isTechnologyCategory(product.category?.slug)) return false;
    if (filters.largeDiscountOnly && maxDiscount(offers) < 20) return false;
    if (filters.inStockOnly && !offers.some((offer) => offer.availability === "IN_STOCK")) return false;
    return true;
  });
}

export function compareProductPriority(left: ProductView, right: ProductView) {
  return calculateProductPriority(right, right.offers) - calculateProductPriority(left, left.offers);
}

export function compareDealPriority(left: ProductView, right: ProductView) {
  const discountDelta = dealScore(right) - dealScore(left);
  return discountDelta || compareProductPriority(left, right);
}

export function calculateProductPriority(product: ProductView, offers = product.offers, search?: string) {
  const safeOffers = offers.filter((offer) => offer.currentPrice > 0 && Number.isFinite(offer.currentPrice));
  if (!safeOffers.length || isExcludedPublicCategory(product.category) || hasExcludedKeyword(product.name)) return -1000;

  const shopCount = new Set(safeOffers.map((offer) => offer.shop.id)).size;
  const prices = safeOffers.map((offer) => offer.currentPrice);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const spreadRatio = highestPrice > lowestPrice ? (highestPrice - lowestPrice) / highestPrice : 0;
  const normalizedName = normalizeSignal(`${product.brand ?? ""} ${product.name}`);
  const categorySlug = product.category?.slug;

  let score = product.popularityScore / 4;
  if (isPriorityCategory(categorySlug)) score += PRODUCT_PRIORITY_RULES.priorityCategory;
  else if (categorySlug && secondaryCategorySet.has(categorySlug)) score += PRODUCT_PRIORITY_RULES.secondaryCategory;
  if (shopCount > 1) score += PRODUCT_PRIORITY_RULES.multiShop + Math.min(12, (shopCount - 2) * 4);
  score += Math.min(PRODUCT_PRIORITY_RULES.comparisonSpread, spreadRatio * 80);
  score += Math.min(PRODUCT_PRIORITY_RULES.discount, maxDiscount(safeOffers) * 0.55);
  score += Math.min(PRODUCT_PRIORITY_RULES.value, Math.log10(Math.max(lowestPrice, 10)) * 6);
  if (safeOffers.some((offer) => offer.availability === "IN_STOCK")) score += PRODUCT_PRIORITY_RULES.inStock;
  if (hasProductImage(product, safeOffers)) score += PRODUCT_PRIORITY_RULES.image;
  if (PRIORITY_BRANDS.some((brand) => normalizedName.includes(normalizeSignal(brand)))) score += PRODUCT_PRIORITY_RULES.priorityBrand;
  if (highDemandTerms.some((term) => normalizedName.includes(normalizeSignal(term)))) score += PRODUCT_PRIORITY_RULES.highDemandTerm;
  if (search && searchRelevance(normalizedName, search) > 0) score += PRODUCT_PRIORITY_RULES.searchRelevance * searchRelevance(normalizedName, search);
  score += recencyScore(safeOffers);

  return Math.round(score);
}

export function isUsefulComparisonProduct(product: ProductView, offers = product.offers) {
  if (!isUsefulCategory(product.category?.slug)) return false;
  if (!offers.some((offer) => offer.currentPrice > 0)) return false;
  const normalizedName = normalizeSignal(product.name);
  const hasDemandSignal = highDemandTerms.some((term) => normalizedName.includes(normalizeSignal(term)));
  const hasKnownBrand = PRIORITY_BRANDS.some((brand) => normalizedName.includes(normalizeSignal(brand)));
  const cheapest = Math.min(...offers.map((offer) => offer.currentPrice));
  return hasDemandSignal || hasKnownBrand || new Set(offers.map((offer) => offer.shop.id)).size > 1 || cheapest >= 180;
}

export function isFeaturedComparisonProduct(product: ProductView, offers = product.offers) {
  if (!isUsefulComparisonProduct(product, offers) || !hasProductImage(product, offers)) return false;
  if (!offers.some((offer) => offer.availability === "IN_STOCK")) return false;
  if (!featuredComparisonCategorySet.has(product.category?.slug ?? "")) return false;

  const normalizedName = normalizeSignal(product.name);
  const cheapest = Math.min(...offers.map((offer) => offer.currentPrice));
  const shopCount = new Set(offers.map((offer) => offer.shop.id)).size;
  const demandSignal = purchaseDecisionTerms.some((term) => normalizedName.includes(normalizeSignal(term)));
  const priceFloor = featuredPriceFloor(product.category?.slug);

  if (isLowAttentionFeaturedProduct(normalizedName) && cheapest < priceFloor * 1.5) return false;
  if (shopCount > 1 && demandSignal && cheapest >= priceFloor * 0.65) return true;
  if (demandSignal && cheapest >= priceFloor) return true;
  return shopCount > 1 && cheapest >= priceFloor;
}

export function isDiscoveryQualityProduct(product: ProductView, offers = product.offers) {
  if (!isUsefulComparisonProduct(product, offers) || !hasProductImage(product, offers)) return false;
  if (!offers.some((offer) => offer.availability === "IN_STOCK")) return false;

  const normalizedName = normalizeSignal(product.name);
  if (isLowAttentionFeaturedProduct(normalizedName)) return false;

  const cheapest = Math.min(...offers.map((offer) => offer.currentPrice));
  const shopCount = new Set(offers.map((offer) => offer.shop.id)).size;
  const demandSignal = purchaseDecisionTerms.some((term) => normalizedName.includes(normalizeSignal(term)));
  const priceFloor = featuredPriceFloor(product.category?.slug);

  if (isFeaturedComparisonProduct(product, offers)) return true;
  if (demandSignal && cheapest >= priceFloor * 0.72) return true;
  if (shopCount > 1 && cheapest >= priceFloor * 0.72) return true;
  return calculateProductPriority(product, offers) >= 112 && cheapest >= priceFloor;
}

export function maxDiscount(offers: OfferView[]) {
  return Math.max(0, ...offers.map((offer) => offer.discountPercent));
}

export function hasProductImage(product: ProductView, offers = product.offers) {
  return Boolean(product.imageUrl || offers.some((offer) => offer.imageUrl));
}

export function isExcludedPublicQuery(value?: string | null) {
  return Boolean(value && hasExcludedKeyword(value));
}

function dealScore(product: ProductView) {
  const discount = maxDiscount(product.offers);
  const stockBonus = product.offers.some((offer) => offer.availability === "IN_STOCK") ? 10 : 0;
  const usefulness = isUsefulComparisonProduct(product, product.offers) ? 64 : -48;
  const featuredBonus = isFeaturedComparisonProduct(product, product.offers) ? 132 : 0;
  const lowAttentionPenalty = isLowAttentionFeaturedProduct(normalizeSignal(product.name)) ? -88 : 0;
  return discount * 2 + stockBonus + usefulness + featuredBonus + lowAttentionPenalty + calculateProductPriority(product, product.offers);
}

function hasExcludedKeyword(value: string) {
  if (hasAdultAgeMarker(value)) return true;
  const normalized = normalizeSignal(value);
  return EXCLUDED_KEYWORDS.some((keyword) => keyword && normalized.includes(normalizeSignal(keyword)));
}

function hasAdultAgeMarker(value: string) {
  return /(^|[^\dA-Za-z])18\s*\+(?=$|[^\dA-Za-z])/i.test(value);
}

function isPublicOffer(offer: OfferView) {
  return offer.shop.enabled &&
    offer.currentPrice > 0 &&
    Number.isFinite(offer.currentPrice) &&
    isRealProductOfferUrl(offer.url) &&
    !isOutletOfferUrl(offer.url) &&
    isPublicMatchStatus(offer.matchStatus) &&
    offer.verificationStatus === "CONFIRMED" &&
    (offer.matchConfidence == null || offer.matchConfidence >= 90);
}

function comparableTitle(value: string) {
  return normalizeSignal(value).replace(/&(?:amp;)+/g, "&").replace(/\s+/g, " ").trim();
}

// EE (and similar) outlet / open-box listings live under an `/autleti/` path.
// They are a different condition (used/returned/display) and must not be
// compared against new-product prices, so they are excluded from the public
// catalog — otherwise a cheaper outlet unit would masquerade as the shop's
// new price. See the EE outlet special case in ARCHITECTURE.md.
function isOutletOfferUrl(value: string) {
  try {
    return /\/autleti(\/|$)/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

// An offer is only shown publicly if its URL points to a real product page.
// Rejects demo/seed placeholders (`?fasmetri_seed=`) and bare shop homepages
// (no product path) — those would show a fabricated price and send the user to
// the store's front page instead of the product.
function isRealProductOfferUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.searchParams.has("fasmetri_seed")) return false;
    const path = url.pathname.replace(/\/+$/, "");
    return path !== "";
  } catch {
    return false;
  }
}

function isComparableOffer(product: ProductView, offer: OfferView) {
  return explainMatchDecision(
    readProductIdentity(product.productIdentity) ?? {
      title: product.name,
      brand: product.brand,
      model: product.model,
      categorySlug: product.category?.slug,
    },
    readProductIdentity(offer.productIdentity) ?? {
      title: offer.title,
      categorySlug: product.category?.slug,
    },
  ).status === "CONFIRMED";
}

function recencyScore(offers: OfferView[]) {
  const newest = Math.max(...offers.map((offer) => new Date(offer.lastSeenAt).getTime()).filter(Number.isFinite));
  if (!Number.isFinite(newest)) return 0;
  const ageHours = Math.max(0, (Date.now() - newest) / 3600000);
  if (ageHours < 6) return PRODUCT_PRIORITY_RULES.recent;
  if (ageHours < 36) return PRODUCT_PRIORITY_RULES.recent / 2;
  return 0;
}

function normalizeSignal(value: string) {
  return normalizeProductName(value).replaceAll("+", " plus ");
}

function searchRelevance(normalizedName: string, search: string) {
  const terms = normalizeSignal(search).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const matches = terms.filter((term) => normalizedName.includes(term)).length;
  return matches / terms.length;
}

function featuredPriceFloor(slug?: string | null) {
  if (slug === "mobiles" || slug === "tablets") return 420;
  if (slug === "laptops") return 850;
  if (slug === "televisions") return 700;
  if (slug === "refrigerators" || slug === "washing-machines" || slug === "air-conditioners") return 700;
  if (slug === "home-appliances") return 380;
  if (slug === "small-appliances") return 260;
  if (slug === "gaming") return 420;
  if (slug === "audio" || slug === "wearables") return 240;
  if (slug === "computers") return 260;
  return 500;
}

function isLowAttentionFeaturedProduct(normalizedName: string) {
  return lowAttentionFeaturedTerms.some((term) => normalizedName.includes(normalizeSignal(term)));
}
