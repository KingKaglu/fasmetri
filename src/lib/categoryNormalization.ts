import { FasmetriCategorySlug } from "@/config/categoryMapping";

const CATEGORY_ALIASES: Record<string, FasmetriCategorySlug> = {
  tv: "televisions",
  tvs: "televisions",
  televisions: "televisions",
  monitor: "monitors",
  monitors: "monitors",
  "computer-accessory": "computer-accessories",
  "computer-accessories": "computer-accessories",
  cables: "cables-adapters",
  adapters: "cables-adapters",
};

export function resolvePublicCategorySlug(slug: string) {
  return CATEGORY_ALIASES[slug] ?? slug;
}

export function isCategoryAlias(slug: string) {
  return Boolean(CATEGORY_ALIASES[slug] && CATEGORY_ALIASES[slug] !== slug);
}
