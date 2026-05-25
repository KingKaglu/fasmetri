import { FasmetriCategorySlug } from "@/config/categoryMapping";
import { categorizeProduct } from "@/lib/categorizeProduct";

export type CatalogCategorySlug = FasmetriCategorySlug;

// Adapter parsers can pass any title, breadcrumb, and URL fragments they already know.
// The normalized categorizer keeps broad shop paths as a secondary hint.
export function categorySlugForSignals(
  signals: Array<string | null | undefined>,
  fallback?: CatalogCategorySlug,
): CatalogCategorySlug | undefined {
  const safeSignals = signals.filter((signal): signal is string => Boolean(signal));
  const titleSignal =
    safeSignals
      .filter((signal) => !looksLikePath(signal))
      .sort((left, right) => right.length - left.length)[0] ?? safeSignals.join(" ");
  const decision = categorizeProduct({
    title: titleSignal,
    breadcrumbs: safeSignals,
    scrapedShopCategory: fallback,
  });
  if (decision.publicCategorySlug === "other") return fallback ?? decision.publicCategorySlug;
  return decision.publicCategorySlug;
}

export function fallbackCategoryForShop(slugs: string[]) {
  if (slugs.includes("pcshop")) return "computers";
  return "other";
}

function looksLikePath(signal: string) {
  return signal.includes("/") || signal.startsWith("http");
}
