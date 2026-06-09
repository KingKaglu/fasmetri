import { ProductView } from "@/lib/catalog-types";
import { normalizeProductTitle, removeNoiseWords } from "@/lib/productNormalization";

type SearchGroup = {
  raw: string;
  alternatives: string[];
  weight: number;
  critical: boolean;
};

type SearchPlan = {
  normalizedQuery: string;
  groups: SearchGroup[];
  dbTerms: string[];
};

const TOKEN_ALIASES: Record<string, string[]> = {
  iphon: ["iphone"],
  iphone: ["აიფონი", "apple"],
  აიფონი: ["iphone", "apple"],
  phone: ["ტელეფონი", "მობილური", "მობილურ", "smartphone", "mobiles"],
  mobile: ["მობილური", "მობილურ", "ტელეფონი", "smartphone", "mobiles"],
  smartphone: ["სმარტფონი", "ტელეფონი", "mobile", "phone", "mobiles"],
  ტელეფონი: ["phone", "mobile", "smartphone", "mobiles"],
  მობილური: ["phone", "mobile", "smartphone", "mobiles"],
  სმარტფონი: ["smartphone", "phone", "mobile", "mobiles"],
  samsung: ["სამსუნგი", "galaxy"],
  სამსუნგი: ["samsung", "galaxy"],
  galaxy: ["samsung", "გალაქსი"],
  xiaomi: ["xiaomi", "redmi", "poco"],
  სიაომი: ["xiaomi", "redmi"],
  შაომი: ["xiaomi", "redmi"],
  redmi: ["xiaomi"],
  honor: ["ჰონორი"],
  ჰონორი: ["honor"],
  pixel: ["google"],
  google: ["pixel"],
  laptop: ["ლეპტოპი", "ლეპტოპ", "notebook", "ნოუთბუქი", "laptops"],
  laptops: ["ლეპტოპი", "ლეპტოპ", "notebook"],
  ლეპტოპი: ["laptop", "notebook", "ნოუთბუქი", "laptops"],
  ნოუთბუქი: ["laptop", "notebook", "laptops"],
  macbook: ["მაკბუქი", "apple"],
  მაკბუქი: ["macbook", "apple"],
  tv: ["television", "ტელევიზორი", "smart tv"],
  television: ["tv", "ტელევიზორი"],
  ტელევიზორი: ["tv", "television", "smart tv"],
  headphones: ["ყურსასმენი", "earbuds", "buds", "headset"],
  headphone: ["ყურსასმენი", "earbuds", "buds", "headset"],
  headset: ["ყურსასმენი", "headphones"],
  earbuds: ["ყურსასმენი", "buds", "airpods"],
  buds: ["ყურსასმენი", "earbuds", "headphones"],
  ყურსასმენი: ["headphones", "earbuds", "buds", "headset"],
  დინამიკი: ["speaker", "bluetooth speaker"],
  speaker: ["დინამიკი", "bluetooth speaker"],
  watch: ["საათი", "smartwatch", "smart watch"],
  smartwatch: ["სმარტ საათი", "smart watch", "watch"],
  საათი: ["watch", "smartwatch"],
  charger: ["დამტენი", "adapter"],
  დამტენი: ["charger", "adapter"],
  cable: ["კაბელი", "usb-c", "type-c"],
  კაბელი: ["cable", "usb-c", "type-c"],
  case: ["ქეისი", "cover"],
  cover: ["ქეისი", "case"],
  ქეისი: ["case", "cover"],
  glass: ["შუშა", "screen protector", "tempered glass"],
  შუშა: ["screen protector", "tempered glass", "glass"],
  "powerbank": ["power bank", "პაუერ ბანკი"],
  "power": ["power bank"],
  "bank": ["power bank"],
  მაცივარი: ["refrigerator", "fridge"],
  refrigerator: ["მაცივარი", "fridge"],
  fridge: ["მაცივარი", "refrigerator"],
  washing: ["სარეცხი მანქანა", "washer"],
  washer: ["სარეცხი მანქანა", "washing machine"],
  "სარეცხი": ["washing machine", "washer"],
  playstation: ["ps5", "gaming"],
  ps5: ["playstation", "gaming"],
};

const PHRASE_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\biphone\s+(\d{1,2})\s+pro\s+max\b/g, "iphone $1 pro max"],
  [/\bpro\s+max\b/g, "pro max"],
  [/\be[\s-]?sim\b/g, "esim"],
  [/\btype[\s-]?c\b/g, "usb-c"],
  [/\bpower\s+bank\b/g, "powerbank"],
  [/სმარტ\s+საათი/g, "smartwatch"],
  [/სარეცხი\s+მანქანა/g, "washing machine"],
  [/მობილური\s+ტელეფონი/g, "მობილური"],
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  mobiles: ["მობილური", "ტელეფონი", "სმარტფონი", "mobile", "phone", "smartphone", "iphone", "galaxy", "xiaomi", "redmi", "honor", "vivo", "realme", "hmd"],
  "phone-accessories": ["ტელეფონის აქსესუარი", "დამტენი", "კაბელი", "ქეისი", "შუშა", "power bank", "magsafe", "charger", "cable", "case", "cover", "screen protector"],
  laptops: ["ლეპტოპი", "ნოუთბუქი", "laptop", "notebook", "macbook", "lenovo", "hp", "dell", "asus", "acer"],
  computers: ["კომპიუტერი", "pc", "ssd", "ram", "gpu", "cpu", "keyboard", "mouse", "router", "printer", "კლავიატურა", "მაუსი", "როუტერი", "პრინტერი"],
  "computer-accessories": ["კომპიუტერის აქსესუარი", "adapter", "usb hub", "mouse", "keyboard", "printer cable", "hdmi", "dvi"],
  "cables-adapters": ["კაბელი", "ადაპტერი", "adapter", "cable", "hdmi", "dvi", "usb", "type-c"],
  monitors: ["მონიტორი", "monitor", "gaming monitor"],
  televisions: ["ტელევიზორი", "tv", "television", "smart tv", "oled", "qled"],
  audio: ["აუდიო", "ყურსასმენი", "headphones", "earbuds", "buds", "airpods", "speaker", "დინამიკი", "microphone"],
  wearables: ["სმარტ საათი", "smartwatch", "watch", "apple watch", "galaxy watch", "fitness band"],
  gaming: ["gaming", "გეიმინგი", "playstation", "ps5", "xbox", "nintendo", "controller", "gamepad"],
  refrigerators: ["მაცივარი", "refrigerator", "fridge", "freezer"],
  "washing-machines": ["სარეცხი მანქანა", "washing machine", "washer", "dryer"],
  "home-appliances": ["საყოფაცხოვრებო ტექნიკა", "dishwasher", "oven", "microwave", "air conditioner", "vacuum", "მტვერსასრუტი", "კონდიციონერი"],
  "small-appliances": ["მცირე ტექნიკა", "coffee machine", "blender", "kettle", "air fryer", "toaster", "ყავის აპარატი", "ბლენდერი", "ჩაიდანი"],
  "kitchen-dishes": ["ჭურჭელი", "სამზარეულო", "mug", "cup", "glass", "plate", "pan", "pot", "ჭიქა", "თეფში", "ტაფა", "ქვაბი"],
  furniture: ["ავეჯი", "sofa", "chair", "table", "bed", "desk", "wardrobe", "დივანი", "სკამი", "მაგიდა", "საწოლი"],
  "auto-accessories": ["ავტო", "car", "dash cam", "car charger", "phone holder", "compressor", "მანქანის დამტენი"],
  "beauty-care": ["სილამაზე", "beauty", "cosmetics", "skin care", "hair dryer", "trimmer", "ფენი"],
  kids: ["საბავშვო", "kids", "children", "toys", "lego", "baby"],
};

const GENERIC_TOKENS = new Set([
  "და",
  "the",
  "for",
  "with",
  "only",
  "new",
  "sale",
  "product",
  "პროდუქტი",
  "ფასი",
  "ფასები",
  "მაღაზია",
]);

export function normalizeSearchText(input?: string | null) {
  if (!input) return "";
  let value = normalizeProductTitle(input)
    .replace(/[_-]+/g, " ")
    .replace(/\b(iphone|galaxy|pixel|redmi|poco|honor|xiaomi|macbook)(\d)/g, "$1 $2")
    .replace(/\b(s\d{1,3})(ultra|plus|fe|lite|mini)\b/g, "$1 $2")
    .replace(/\b(\d{1,3})(pro|max|ultra|plus|fe|lite|mini|air)\b/g, "$1 $2")
    .replace(/\b(\d{1,2})\s*\/\s*(\d{2,4})\s*(gb)?\b/g, "$1/$2");
  for (const [pattern, replacement] of PHRASE_ALIASES) value = value.replace(pattern, replacement);
  value = value
    .replace(/\b(\d+)\s*(gb|tb)\b/g, "$1$2")
    .replace(/[^\p{L}\p{N}\s.+/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return value
    .split(" ")
    .map((token) => TOKEN_ALIASES[token]?.[0] ?? token)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchPlan(query?: string | null): SearchPlan | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const rawTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const tokens = mergeStorageTokens(rawTokens).filter((token) => !GENERIC_TOKENS.has(token));
  if (!tokens.length) return null;

  const groups = tokens.map((token) => {
    const alternatives = unique([token, ...specAlternatives(token), ...(TOKEN_ALIASES[token] ?? [])].flatMap((item) => [normalizeSearchText(item), removeNoiseWords(item)]));
    return {
      raw: token,
      alternatives,
      weight: tokenWeight(token),
      critical: isCriticalToken(token),
    };
  });

  const dbTerms = unique([
    normalizedQuery,
    ...groups.flatMap((group) => group.alternatives),
    ...tokens,
  ])
    .filter((term) => term.length > 1 && !GENERIC_TOKENS.has(term))
    .slice(0, 28);

  return { normalizedQuery, groups, dbTerms };
}

export function productSearchWhereTerms(query?: string | null) {
  return buildSearchPlan(query)?.dbTerms ?? [];
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

  const haystack = productSearchHaystack(product);
  const haystackTokens = new Set(haystack.split(/\s+/).filter(Boolean));
  let matchedWeight = 0;
  let totalWeight = 0;
  let criticalCount = 0;
  let criticalMatched = 0;

  for (const group of plan.groups) {
    totalWeight += group.weight;
    if (group.critical) criticalCount += 1;
    const matched = group.alternatives.some((term) => termMatches(haystack, haystackTokens, term));
    if (matched) {
      matchedWeight += group.weight;
      if (group.critical) criticalMatched += 1;
    }
  }

  if (!matchedWeight || !totalWeight) return 0;
  if (criticalCount && criticalMatched < criticalCount) return 0;

  const ratio = matchedWeight / totalWeight;
  if (plan.groups.length > 1 && ratio < 0.52) return 0;

  const titleText = normalizeSearchText(product.name);
  const modelText = normalizeSearchText([product.brand, product.model, product.canonicalKey, identityText(product.productIdentity)].filter(Boolean).join(" "));
  const categoryText = normalizeSearchText([product.category?.slug, product.category?.nameKa, product.category?.nameEn].filter(Boolean).join(" "));
  const offerText = normalizeSearchText(product.offers.map((offer) => [offer.title, offer.canonicalKey, offer.shop.name].filter(Boolean).join(" ")).join(" "));
  const titleBoost = fieldMatchScore(titleText, plan, 70, 42);
  const modelBoost = fieldMatchScore(modelText, plan, 48, 28);
  const specBoost = plan.groups.some((group) => /\d|gb|tb|\//.test(group.raw) && group.alternatives.some((term) => termMatches(modelText, new Set(modelText.split(/\s+/)), term))) ? 22 : 0;
  const categoryBoost = fieldMatchScore(categoryText, plan, 12, 8);
  const offerBoost = fieldMatchScore(offerText, plan, 14, 9);
  const dealBoost = product.offers.some((offer) => offer.discountPercent > 0) && plan.groups.some((group) => ["sale", "deal", "აქცია", "ფასდაკლება"].includes(group.raw)) ? 8 : 0;
  return Math.round(ratio * 100 + titleBoost + modelBoost + specBoost + categoryBoost + offerBoost + dealBoost + Math.min(product.popularityScore / 10, 10));
}

function productSearchHaystack(product: ProductView) {
  const categoryKeywords = product.category?.slug ? CATEGORY_KEYWORDS[product.category.slug] ?? [] : [];
  const values = [
    product.name,
    product.brand,
    product.model,
    product.canonicalKey,
    product.category?.nameKa,
    product.category?.nameEn,
    product.category?.slug,
    ...categoryKeywords,
    identityText(product.productIdentity),
    ...product.offers.flatMap((offer) => [
      offer.title,
      offer.canonicalKey,
      offer.shop.name,
      identityText(offer.productIdentity),
    ]),
  ];
  return normalizeSearchText(values.filter(Boolean).join(" "));
}

function fieldMatchScore(text: string, plan: SearchPlan, exactScore: number, partialScore: number) {
  if (!text) return 0;
  if (text === plan.normalizedQuery) return exactScore;
  if (text.includes(plan.normalizedQuery)) return partialScore;
  const tokens = new Set(text.split(/\s+/).filter(Boolean));
  const matchedGroups = plan.groups.filter((group) => group.alternatives.some((term) => termMatches(text, tokens, term))).length;
  if (!matchedGroups) return 0;
  return Math.round((matchedGroups / plan.groups.length) * partialScore * 0.72);
}

function identityText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const identity = value as Record<string, unknown>;
  const attributes = identity.attributes && typeof identity.attributes === "object" ? (identity.attributes as Record<string, unknown>) : {};
  const pieces = [
    identity.productType,
    identity.brand,
    identity.model,
    identity.variant,
    identity.storage,
    identity.ram,
    identity.color,
    identity.simType,
    identity.modelCode,
    identity.sku,
    identity.cpu,
    identity.gpu,
    identity.screenSize,
    identity.capacity,
    identity.compatibleDevice,
    identity.productForm,
    identity.cleanTitle,
    identity.canonicalKey,
    attributes.modelFamily,
    attributes.color,
    ...(Array.isArray(attributes.typeTokens) ? attributes.typeTokens : []),
    ...(Array.isArray(attributes.modelCodes) ? attributes.modelCodes : []),
    ...(Array.isArray(attributes.skuCodes) ? attributes.skuCodes : []),
    ...(Array.isArray(attributes.storage) ? attributes.storage : []),
    ...(Array.isArray(attributes.ram) ? attributes.ram : []),
  ];
  return pieces.filter((piece): piece is string => typeof piece === "string").join(" ");
}

function mergeStorageTokens(tokens: string[]) {
  const merged: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    if (/^\d{1,4}$/.test(current) && /^(gb|tb)$/.test(next ?? "")) {
      merged.push(`${current}${next}`);
      index += 1;
    } else if (/^\d{1,2}gb$/.test(current) && /^\d{2,4}gb$/.test(next ?? "")) {
      merged.push(`${current.replace(/gb$/, "")}/${next.replace(/gb$/, "")}`);
      index += 1;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function specAlternatives(token: string) {
  const ramStorage = token.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (ramStorage) return [`${ramStorage[1]}gb ${ramStorage[2]}gb`, `${ramStorage[1]} ${ramStorage[2]}`];
  return [];
}

function tokenWeight(token: string) {
  if (/^\d+(gb|tb)$/.test(token)) return 22;
  if (/\d/.test(token)) return 18;
  if (/^(pro|max|ultra|plus|fe|lite|mini|se|air)$/.test(token)) return 15;
  if (token.length <= 2) return 5;
  return 10;
}

function isCriticalToken(token: string) {
  return /\d/.test(token) || /^(pro|max|ultra|plus|fe|lite|mini|se)$/.test(token);
}

function termMatches(haystack: string, haystackTokens: Set<string>, rawTerm?: string | null) {
  const term = normalizeSearchText(rawTerm);
  if (!term) return false;
  if (term.includes(" ")) return haystack.includes(term);
  if (term.length <= 2 && !/\d/.test(term)) return haystackTokens.has(term);
  return haystackTokens.has(term) || haystack.includes(term);
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

function unique(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => normalizeSearchText(value)).filter(Boolean))];
}
