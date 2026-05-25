import { COLOR_ALIASES, MODEL_ALIASES, PRODUCT_NOISE_WORDS, TEXT_ALIASES } from "@/config/productAliases";
import { KNOWN_PRODUCT_BRANDS } from "@/config/matchingRules";
import { matchingTokens } from "@/lib/matching";

export type ProductAttributeInput = {
  title: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  categorySlug?: string | null;
  breadcrumbs?: Array<string | null | undefined> | string | null;
};

export type ProductAttributes = {
  normalizedTitle: string;
  cleanTitle: string;
  categorySlug?: string | null;
  brand?: string;
  modelFamily?: string;
  variant?: string;
  modelCodes: string[];
  skuCodes: string[];
  cpu?: string;
  gpu?: string;
  ram: string[];
  storage: string[];
  screenSize?: string;
  sim?: string;
  color?: string;
  os?: string;
  capacity?: string;
  compatibleDevice?: string;
  typeTokens: string[];
};

export function normalizeProductTitle(title: string) {
  let value = title
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[|,;:()[\]{}]+/gu, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of TEXT_ALIASES) value = value.replace(pattern, replacement);
  return value
    .replace(/\b(\d+)\s*(gb|tb)\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

export function removeNoiseWords(title: string) {
  let value = normalizeProductTitle(title);
  for (const noise of PRODUCT_NOISE_WORDS) {
    value = value.replace(new RegExp(`(^|\\s)${escapeRegExp(normalizeProductTitle(noise))}(?=\\s|$)`, "giu"), " ");
  }
  return value.replace(/\s+/g, " ").trim();
}

export function extractProductAttributes(input: ProductAttributeInput): ProductAttributes {
  const normalizedTitle = normalizeProductTitle(input.title);
  const cleanTitle = removeNoiseWords(input.title);
  const signal = normalizeProductTitle(
    [input.title, input.brand, input.model, input.description, ...breadcrumbsOf(input.breadcrumbs)].filter(Boolean).join(" "),
  );
  const family = modelFamily(signal);

  return {
    normalizedTitle,
    cleanTitle,
    categorySlug: input.categorySlug,
    brand: explicitBrand(input.brand, signal),
    modelFamily: family,
    variant: variantValue(family, signal),
    modelCodes: modelCodes(signal),
    skuCodes: skuCodes(signal),
    cpu: cpuValue(signal),
    gpu: gpuValue(signal),
    ram: memoryValues(signal, "ram"),
    storage: memoryValues(signal, "storage"),
    screenSize: screenSize(signal),
    sim: simType(signal),
    color: colorValue(signal),
    os: osValue(signal),
    capacity: capacityValue(signal),
    compatibleDevice: compatibleDevice(signal),
    typeTokens: matchingTokens(cleanTitle).slice(0, 20),
  };
}

function explicitBrand(brand: string | null | undefined, signal: string) {
  const normalizedBrand = brand ? normalizeProductTitle(brand) : undefined;
  if (normalizedBrand === "redmi" || normalizedBrand === "poco") return "xiaomi";
  if (normalizedBrand) return normalizedBrand;
  if (/\biphone\b|\bmacbook\b|\bairpods\b|\bapple watch\b/.test(signal)) return "apple";
  if (/\bgalaxy\b/.test(signal)) return "samsung";
  if (/\bpixel\b/.test(signal)) return "google";
  if (/\bredmi\b|\bpoco\b/.test(signal)) return "xiaomi";
  if (/\bnothing\s+phone\b/.test(signal)) return "nothing";
  if (/\boneplus\b/.test(signal)) return "oneplus";
  if (/\bmotorola\b|\bmoto\b|\brazr\b/.test(signal)) return "motorola";
  return KNOWN_PRODUCT_BRANDS.find((candidate) => containsWord(signal, candidate));
}

function modelFamily(signal: string) {
  for (const [pattern, alias] of MODEL_ALIASES) {
    if (pattern.test(signal)) return alias;
  }

  const iphone = signal.match(/\biphone\s*(\d{1,2})(?:\s*(pro max|pro|plus|mini|se|air))?\b/);
  if (iphone) return compactModel("iphone", iphone[1], iphone[2]);

  const galaxy = signal.match(/\b(?:samsung\s*)?galaxy\s*(s|z|a)\s*-?(\d{1,3})(?:\s*(ultra|fe|plus|flip|fold))?\b/);
  if (galaxy) return compactModel("galaxy", `${galaxy[1]}${galaxy[2]}`, galaxy[3]);
  const samsung = signal.match(/\bsamsung\s*(s|z|a)\s*-?(\d{1,3})(?:\s*(ultra|fe|plus|flip|fold))?\b/);
  if (samsung) return compactModel("galaxy", `${samsung[1]}${samsung[2]}`, samsung[3]);

  const pixel = signal.match(/\bpixel\s*(\d{1,2})(?:\s*(pro xl|pro|a))?\b/);
  if (pixel) return compactModel("pixel", pixel[1], pixel[2]);

  const honor = signal.match(/\bhonor\s*(magicbook|magic|x)\s*-?([a-z0-9]+)(?:\s*(pro|lite))?\b/);
  if (honor) return compactModel(`honor_${honor[1]}`, honor[2], honor[3]);
  const honorNumber = signal.match(/\bhonor\s*(\d{2,4})(?:\s*(pro|lite))?\b/);
  if (honorNumber) return compactModel("honor", honorNumber[1], honorNumber[2]);

  const redmiOrPoco = signal.match(/\b(?:xiaomi\s*)?(redmi|poco)\s*([a-z0-9]+)(?:\s*(pro plus|pro|max|ultra|plus))?\b/);
  if (redmiOrPoco && !["buds", "watch", "band"].includes(redmiOrPoco[2])) {
    return compactModel(redmiOrPoco[1], redmiOrPoco[2], redmiOrPoco[3]);
  }
  const xiaomiRedmiStyle = signal.match(/\bxiaomi\s*(14c)\b/);
  if (xiaomiRedmiStyle) return compactModel("redmi", xiaomiRedmiStyle[1]);
  const genericPhone = signal.match(/\b(xiaomi|vivo|realme|oppo|zte|nubia|hmd)\s*([a-z]?\d+[a-z0-9]*)(?:\s*(pro max|pro|ultra|plus|fe|lite|max))?\b/);
  if (genericPhone) return compactModel(genericPhone[1], genericPhone[2], genericPhone[3]);

  const oneplus = signal.match(/\boneplus\s*(nord)?\s*([a-z]?\d+[a-z0-9]*)(?:\s*(pro max|pro|ultra|plus|fe|lite|max))?\b/);
  if (oneplus) return compactModel("oneplus", [oneplus[1], oneplus[2]].filter(Boolean).join("_"), oneplus[3]);

  const nothing = signal.match(/\bnothing\s*phone\s*([a-z]?\d+[a-z0-9]*)(?:\s*(pro max|pro|ultra|plus|fe|lite|max))?\b/);
  if (nothing) return compactModel("nothing_phone", nothing[1], nothing[2]);

  const motorola = signal.match(/\b(?:motorola\s*)?(moto|razr|edge|signature)\s*([a-z]?\d+[a-z0-9]*)(?:\s*(power|fusion|pro|ultra|plus|fe|lite|max))?\b/);
  if (motorola) return compactModel(`motorola_${motorola[1]}`, motorola[2], motorola[3]);

  const macbook = signal.match(/\bmacbook\s*(air|pro)\s*(\d{2})?/);
  if (macbook) return `macbook_${macbook[1]}_${macbook[2] ?? "any"}`;

  const hpOmnibook = signal.match(/\bhp\s*omnibook\s*([a-z0-9]+)?\s*(flip|x360)?\s*(\d{2})?/);
  if (hpOmnibook) return compactModel("hp_omnibook", [hpOmnibook[1], hpOmnibook[2], hpOmnibook[3]].filter(Boolean).join("_") || "base");

  const msiLaptop = signal.match(/\bmsi\s*(modern|katana|sword|thin|prestige|stealth|raider|cyborg)\s*([a-z0-9]+)?/);
  if (msiLaptop) return compactModel("msi", msiLaptop[1], msiLaptop[2]);

  return undefined;
}

function variantValue(family: string | undefined, signal: string) {
  if (family) {
    const variant = family.match(/_(pro_max|pro_plus|ultra|plus|fe|lite|mini|se|max|air)$/)?.[1];
    if (variant) return variant;
  }
  return signal.match(/\b(pro max|ultra|plus|fe|lite|mini|se|max|air)\b/)?.[1]?.replace(/\s+/g, "_");
}

function modelCodes(signal: string) {
  return unique(
    signal
      .split(/[\s,;|]+/)
      .map((token) => token.replace(/^[([{]+|[)\]}]+$/g, "").replace(/[^a-z0-9_./-]/g, ""))
      .filter((token) =>
        token.length >= 5 &&
        /[a-z]/.test(token) &&
        /\d/.test(token) &&
        !/^\d+(gb|tb|w|hz|mah)$/.test(token) &&
        !/^(rtx|gtx)\d+/.test(token) &&
        !/^(i[3579]-?\d+|m\d(?:pro|max|ultra)?)$/.test(token) &&
        !/^\d-\d{3,5}[a-z]{0,2}$/.test(token) &&
        !/^core[-_]?\d[-_]?\d{3,5}[a-z]{0,2}$/.test(token) &&
        (!/^\w+\d+$/.test(token) || /[_/-]/.test(token)),
      ),
  );
}

function skuCodes(signal: string) {
  return unique(
    [...signal.matchAll(/\b([a-z0-9]{2,}(?:[_/-][a-z0-9]{1,}){1,})\b/g)]
      .map((match) => match[1].replace(/\//g, "_"))
      .filter((token) => /[a-z]/.test(token) && /\d/.test(token) && !/^i[3579][_-]\d+/.test(token)),
  );
}

function memoryValues(signal: string, kind: "ram" | "storage") {
  const values = new Set<string>();

  for (const match of signal.matchAll(/\b(\d{1,2})\s*\/\s*(\d{2,4})(?:gb)?\b/g)) {
    if (kind === "ram") values.add(`${Number(match[1])}gb`);
    if (kind === "storage") values.add(`${Number(match[2])}gb`);
  }

  const entries = [...signal.matchAll(/\b(\d{1,4})(gb|tb)\b/g)].map((match) => ({
    amount: Number(match[1]),
    unit: match[2],
    index: match.index ?? 0,
    value: `${Number(match[1])}${match[2]}`,
  }));

  for (const entry of entries) {
    const around = signal.slice(Math.max(0, entry.index - 18), entry.index + entry.value.length + 18);
    const explicitRam = /\bram\b|ოპერატიულ/.test(around);
    const explicitStorage = /\bstorage\b|\bssd\b|\bhdd\b|\brom\b|მეხსიერ/.test(around);
    const laterStorage = entries.some((later) => later.index > entry.index && (later.unit === "tb" || later.amount >= 64));
    if (kind === "ram" && entry.unit === "gb" && entry.amount <= 64 && (explicitRam || (!explicitStorage && entry.amount <= 48 && laterStorage))) {
      values.add(entry.value);
    }
    if (kind === "storage" && ((explicitStorage && !explicitRam) || entry.unit === "tb" || entry.amount >= 64)) {
      values.add(entry.value);
    }
  }

  return [...values].sort();
}

function cpuValue(signal: string) {
  const apple = signal.match(/\bm([1-9])\s*(pro|max|ultra)?\b/);
  if (apple) return `m${apple[1]}_${apple[2] ?? "base"}`;
  const intelCoreWord = signal.match(/\bcore\s*(ultra\s*)?([3579])\s*[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (intelCoreWord) return `intel_${intelCoreWord[1] ? "ultra_" : "core_"}${intelCoreWord[2]}_${intelCoreWord[3]}`;
  const intel = signal.match(/\b(i[3579])[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (intel) return `intel_${intel[1]}_${intel[2]}`;
  const ryzen = signal.match(/\bryzen\s*([3579])[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (ryzen) return `ryzen_${ryzen[1]}_${ryzen[2]}`;
  return undefined;
}

function gpuValue(signal: string) {
  return signal.match(/\b(?:rtx|gtx)\s*(\d{3,4}(?:\s*ti)?)\b/)?.[0].replace(/\s+/g, "_");
}

function screenSize(signal: string) {
  const size = signal.match(/\b(\d{1,3}(?:\.\d)?)\s*(?:inch|inches|")\b/)?.[1];
  return size ? `${size}in` : undefined;
}

function simType(signal: string) {
  if (/\besim_only\b/.test(signal)) return "esim_only";
  if (/\bdual_sim\b/.test(signal)) return "dual_sim";
  if (/\bphysical_sim\b|\bnano sim\b/.test(signal)) return "physical_sim";
  if (/\besim\b/.test(signal)) return "esim";
  return undefined;
}

function osValue(signal: string) {
  if (/\bubuntu\b/.test(signal)) return "ubuntu";
  if (/\bfree\s*dos\b|\bfreedos\b/.test(signal)) return "freedos";
  if (/\bwindows\s*11\s*pro\b/.test(signal)) return "windows_11_pro";
  if (/\bwindows\s*11\b/.test(signal)) return "windows_11";
  if (/\bmacos\b/.test(signal)) return "macos";
  return undefined;
}

function capacityValue(signal: string) {
  const amount = signal.match(/\b(\d+(?:\.\d+)?)\s*(kg|l|lt|liter|litre)\b/)?.slice(1, 3);
  return amount ? `${amount[0]}${amount[1]}` : undefined;
}

function compatibleDevice(signal: string) {
  const iphone = signal.match(/\b(?:for\s+)?(iphone\s*\d{1,2}(?:\s*pro max|\s*pro|\s*plus)?)\s*(?:case|cover|glass|protector)\b/)?.[1] ??
    signal.match(/\b(?:case|cover|glass|protector|privacy)\s*(?:for\s+)?(iphone\s*\d{1,2}(?:\s*pro max|\s*pro|\s*plus)?)\b/)?.[1];
  if (iphone) return underscore(iphone);
  const galaxy = signal.match(/\b(?:for\s+)?(?:samsung\s*)?(galaxy\s*[a-z]\d{1,3}(?:\s*ultra|\s*plus)?)\s*(?:case|cover|glass|protector)\b/)?.[1] ??
    signal.match(/\b(?:case|cover|glass|protector|privacy)\s*(?:for\s+)?(?:samsung\s*)?(galaxy\s*[a-z]\d{1,3}(?:\s*ultra|\s*plus)?)\b/)?.[1];
  return galaxy ? underscore(galaxy) : undefined;
}

function colorValue(signal: string) {
  return Object.entries(COLOR_ALIASES)
    .sort(([left], [right]) => right.length - left.length)
    .find(([color]) => signal.includes(normalizeProductTitle(color)))?.[1];
}

function containsWord(signal: string, word: string) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(word)}([^a-z0-9]|$)`, "i").test(signal);
}

function breadcrumbsOf(value: ProductAttributeInput["breadcrumbs"]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function compactModel(prefix: string, model: string, variant?: string) {
  return [prefix, model, variant].filter((part): part is string => Boolean(part)).map(underscore).join("_");
}

function underscore(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, "_");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
