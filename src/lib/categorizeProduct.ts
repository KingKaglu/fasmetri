import {
  CATEGORY_RULES,
  FALLBACK_CATEGORY,
  FasmetriCategorySlug,
  PUBLIC_CATEGORY_TAXONOMY,
  SHOP_CATEGORY_MAPPING,
  isPublicCategorySlug,
} from "@/config/categoryMapping";
import { normalizeProductName } from "@/lib/matching";

export type ProductCategoryInput = {
  title: string;
  description?: string | null;
  scrapedShopCategory?: string | null;
  breadcrumbs?: Array<string | null | undefined> | string | null;
  brand?: string | null;
  model?: string | null;
  imageAlt?: string | null;
  sourceShop?: string | null;
};

export type ProductCategoryDecision = {
  publicCategorySlug: FasmetriCategorySlug;
  publicCategoryName: string;
  confidenceScore: number;
  matchedRules: string[];
  reason: string;
  needsReview: boolean;
};

type ScoredDecision = ProductCategoryDecision & { score: number };

export function categorizeProduct(input: ProductCategoryInput): ProductCategoryDecision {
  const explicitCategory = input.scrapedShopCategory?.trim();
  const explicitPublicCategory = explicitCategory && isPublicCategorySlug(explicitCategory) ? explicitCategory : undefined;

  const titleSignal = categorySignal([input.title, input.brand, input.model]);
  const contextSignal = categorySignal([input.description, input.imageAlt, ...breadcrumbsOf(input.breadcrumbs)]);
  const shopSignal = categorySignal([input.scrapedShopCategory, input.sourceShop, ...breadcrumbsOf(input.breadcrumbs)]);
  const scored = CATEGORY_RULES.map((rule) => scoreRule(rule, titleSignal, contextSignal, shopSignal, input.sourceShop, explicitPublicCategory))
    .filter((decision): decision is ScoredDecision => Boolean(decision))
    .sort((left, right) => right.score - left.score);
  const winner = scored[0];

  if (!winner || winner.score < 48) {
    return categoryDecision(
      FALLBACK_CATEGORY,
      Math.min(44, winner?.confidenceScore ?? 28),
      winner?.matchedRules ?? [],
      winner ? `სიგნალები დაბალი სანდოობით მიუთითებს ${winner.publicCategoryName}-ზე.` : "კატეგორიისთვის საკმარისი სიგნალი ვერ მოიძებნა.",
      true,
    );
  }

  return {
    publicCategorySlug: winner.publicCategorySlug,
    publicCategoryName: winner.publicCategoryName,
    confidenceScore: winner.confidenceScore,
    matchedRules: winner.matchedRules,
    reason: winner.reason,
    needsReview: winner.needsReview,
  };
}

export function normalizeCategorySignal(value: string) {
  return normalizeProductName(value)
    .replaceAll("smart-watch", "smart watch")
    .replaceAll("usb c", "usb-c")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreRule(
  rule: (typeof CATEGORY_RULES)[number],
  titleSignal: string,
  contextSignal: string,
  shopSignal: string,
  sourceShop?: string | null,
  explicitPublicCategory?: FasmetriCategorySlug,
): ScoredDecision | null {
  const titleMatches = matchedKeywords(titleSignal, rule.titleKeywords);
  const titleGroupMatches = (rule.titleKeywordGroups ?? [])
    .filter((group) => group.every((keyword) => containsKeyword(titleSignal, keyword)))
    .map((group) => group.join("+"));
  // A stale or wrongly grouped offer must not override a strong title classification.
  const negativeMatches = matchedKeywords(titleSignal, rule.negativeKeywords ?? []);
  if (negativeMatches.length && rule.slug !== "adult") return null;
  if (rule.requiresTitleMatch && !titleMatches.length && !titleGroupMatches.length) return null;

  const contextMatches = matchedKeywords(contextSignal, rule.contextKeywords ?? []);
  const shopMatches = matchedKeywords(shopSignal, rule.shopKeywords ?? []);
  const mappedShopCategory = mappedShopSlug(sourceShop, shopSignal);
  const mappedMatch = mappedShopCategory === rule.slug;
  const explicitMatch = explicitPublicCategory === rule.slug;
  if (!titleMatches.length && !titleGroupMatches.length && !contextMatches.length && !shopMatches.length && !mappedMatch && !explicitMatch) return null;

  const titleMatchCount = titleMatches.length + titleGroupMatches.length;
  const titleScore = titleMatchCount ? Math.min(100, (rule.titleWeight ?? 76) + Math.max(0, titleMatchCount - 1) * 4) : 0;
  const contextScore = contextMatches.length ? Math.min(34, 18 + contextMatches.length * 5) : 0;
  const shopScore = shopMatches.length ? Math.min(20, 10 + shopMatches.length * 3) : 0;
  const mappingScore = explicitMatch ? 68 : mappedMatch ? 18 : 0;
  const score = Math.max(titleScore, contextScore + shopScore + mappingScore, mappingScore);
  const confidenceScore = clampScore(titleScore ? score : Math.min(score, 64));
  const matchedRules = [
    ...titleMatches.map((keyword) => `title:${keyword}`),
    ...titleGroupMatches.map((keywords) => `title-group:${keywords}`),
    ...contextMatches.map((keyword) => `context:${keyword}`),
    ...shopMatches.map((keyword) => `shop:${keyword}`),
    ...(explicitMatch ? [`source-category:${explicitPublicCategory}`] : []),
    ...(mappedMatch ? [`shop-map:${sourceShop ?? "unknown"}`] : []),
  ];
  const needsReview = rule.slug !== "adult" && confidenceScore < 72;
  const reason = titleMatchCount
    ? `სათაურში მოიძებნა: ${[...titleMatches, ...titleGroupMatches].slice(0, 3).join(", ")}.`
    : mappedMatch
      ? "მაღაზიის category/breadcrumb mapping დაემთხვა, ძლიერი სათაურის სიგნალი ჯერ არ არის."
      : "დამხმარე breadcrumb ან აღწერის სიგნალი დაემთხვა.";

  return { ...categoryDecision(rule.slug, confidenceScore, matchedRules, reason, needsReview), score };
}

function categoryDecision(
  slug: FasmetriCategorySlug,
  confidenceScore: number,
  matchedRules: string[],
  reason: string,
  needsReview: boolean,
) {
  return {
    publicCategorySlug: slug,
    publicCategoryName: PUBLIC_CATEGORY_TAXONOMY[slug].nameKa,
    confidenceScore,
    matchedRules,
    reason,
    needsReview,
  };
}

function mappedShopSlug(sourceShop: string | null | undefined, signal: string) {
  if (!sourceShop) return undefined;
  const mappings = SHOP_CATEGORY_MAPPING[normalizeCategorySignal(sourceShop)];
  if (!mappings) return undefined;
  return Object.entries(mappings).find(([keyword]) => containsKeyword(signal, keyword))?.[1];
}

function breadcrumbsOf(value: ProductCategoryInput["breadcrumbs"]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function categorySignal(values: Array<string | null | undefined>) {
  return normalizeCategorySignal(values.filter(Boolean).join(" "));
}

function matchedKeywords(signal: string, keywords: readonly string[]) {
  return keywords.filter((keyword) => containsKeyword(signal, keyword)).slice(0, 6);
}

function containsKeyword(signal: string, keyword: string) {
  const normalizedKeyword = normalizeCategorySignal(keyword);
  if (!normalizedKeyword) return false;
  if (/^[a-z0-9+-]{1,4}$/i.test(normalizedKeyword) || STRICT_ASCII_WORD_KEYWORDS.has(normalizedKeyword)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`, "i").test(signal);
  }
  return signal.includes(normalizedKeyword);
}

const STRICT_ASCII_WORD_KEYWORDS = new Set(["lighting", "sport", "table"]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
