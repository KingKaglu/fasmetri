import type { FasmetriCategorySlug } from "@/config/categoryMapping";
import type { CategoryCoverage, CategoryCoverageEntry } from "@/server/stores/types";

export function coverageEntries(
  cats: Partial<Record<FasmetriCategorySlug, CategoryCoverage>>,
): CategoryCoverageEntry[] {
  return Object.entries(cats).map(([slug, cov]) => ({
    slug,
    url: cov?.url ?? null,
    status: cov?.status ?? "needs_configuration",
    ...(cov?.notes ? { notes: cov.notes } : {}),
  }));
}

export function readyCategoryUrls(
  cats: Partial<Record<FasmetriCategorySlug, CategoryCoverage>>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [slug, cov] of Object.entries(cats)) {
    if (cov?.status === "ready" && cov.url) result[slug] = [cov.url];
  }
  return result;
}
