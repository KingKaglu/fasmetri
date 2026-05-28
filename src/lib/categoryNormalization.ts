import { FasmetriCategorySlug, SHOP_CATEGORY_MAPPING } from "@/config/categoryMapping";
import { normalizeCategorySignal } from "@/lib/categorizeProduct";

const CATEGORY_ALIASES: Record<string, FasmetriCategorySlug> = {
  tv: "televisions",
  tvs: "televisions",
  televisions: "televisions",
  televizorebi: "televisions",
  monitor: "monitors",
  monitors: "monitors",
  monitorebi: "monitors",
  "computer-accessory": "computer-accessories",
  "computer-accessories": "computer-accessories",
  cables: "cables-adapters",
  adapters: "cables-adapters",
  "cables-adapters": "cables-adapters",
  laptop: "laptops",
  laptops: "laptops",
  leptopebi: "laptops",
  mobile: "mobiles",
  mobiles: "mobiles",
  mobilurebi: "mobiles",
  smartphones: "mobiles",
  smartphone: "mobiles",
  tablet: "tablets",
  tablets: "tablets",
  tabletebi: "tablets",
  audio: "audio",
  yursasmenebi: "audio",
  wearable: "wearables",
  wearables: "wearables",
  smartsaatebi: "wearables",
  gaming: "gaming",
  refrigerator: "refrigerators",
  fridge: "refrigerators",
  "washing-machine": "washing-machines",
  washer: "washing-machines",
  appliance: "home-appliances",
  appliances: "home-appliances",
  "home-appliance": "home-appliances",
  "small-appliance": "small-appliances",
  furniture: "furniture",
  aveji: "furniture",
  "kitchen-dishes": "kitchen-dishes",
  kitchenware: "kitchen-dishes",
  "phone-accessory": "phone-accessories",
  "phone-accessories": "phone-accessories",
  "tablet-accessory": "tablet-accessories",
  "tablet-accessories": "tablet-accessories",
  computers: "computers",
  computer: "computers",
  "photo-video": "photo-video",
  photo: "photo-video",
  beauty: "beauty",
  sport: "sport",
  kids: "kids",
  pets: "pets",
  "home-garden": "home-garden",
  "books-stationery": "books-stationery",
  books: "books-stationery",
  "auto-accessories": "auto-accessories",
  auto: "auto-accessories",
};

export function resolvePublicCategorySlug(slug: string): string {
  return CATEGORY_ALIASES[slug] ?? slug;
}

export function isCategoryAlias(slug: string): boolean {
  return Boolean(CATEGORY_ALIASES[slug] && CATEGORY_ALIASES[slug] !== slug);
}

export function normalizeCategoryFromStore(
  shopSlug: string,
  rawCategory: string,
): FasmetriCategorySlug | null {
  const signal = normalizeCategorySignal(rawCategory);
  const shopMappings = SHOP_CATEGORY_MAPPING[normalizeCategorySignal(shopSlug)];
  if (shopMappings) {
    const match = Object.entries(shopMappings).find(([keyword]) =>
      signal.includes(normalizeCategorySignal(keyword)),
    );
    if (match) return match[1];
  }
  const directAlias = CATEGORY_ALIASES[signal] ?? CATEGORY_ALIASES[rawCategory.toLowerCase().trim()];
  return directAlias ?? null;
}
