const stopWords = new Set([
  "global",
  "version",
  "black",
  "white",
  "gb",
  "new",
  "product",
  "mobile",
  "phone",
  "მობილური",
  "ტელეფონი",
  "სმარტფონი",
]);

export function normalizeProductName(input: string) {
  return input
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s./_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchingTokens(input: string) {
  return normalizeProductName(input)
    .split(/[\s._/-]+/)
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

export function modelKeywords(input: string) {
  return matchingTokens(input).filter((token) => /\d/.test(token) || token.length > 3);
}

// Candidate-only helper. Final offer attachment must use productMatching/explainMatchDecision.
export function productMatchScore(left: string, right: string) {
  if (variantConflict(left, right)) return 0;
  const leftTokens = new Set(modelKeywords(left));
  const rightTokens = new Set(modelKeywords(right));
  if (!leftTokens.size || !rightTokens.size) return 0;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

export function productVariantSignature(input: string) {
  const normalized = normalizeProductName(input);
  return {
    normalized,
    modelFamily: modelFamily(normalized),
    storage: memoryValues(normalized, "storage"),
    ram: memoryValues(normalized, "ram"),
    modelCodes: modelCodes(normalized),
    skuVariants: skuVariants(normalized),
    cpu: processorValue(normalized),
    sim: simType(normalized),
    color: colorValue(normalized),
  };
}

export function slugifyProduct(input: string) {
  const normalized = normalizeProductName(input)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

  return normalized || `product-${Date.now()}`;
}

function variantConflict(left: string, right: string) {
  const leftVariant = productVariantSignature(left);
  const rightVariant = productVariantSignature(right);

  if (differentKnownValue(leftVariant.modelFamily, rightVariant.modelFamily)) return true;
  if (differentKnownValue(leftVariant.cpu, rightVariant.cpu)) return true;
  if (differentKnownValue(leftVariant.sim, rightVariant.sim)) return true;
  if (differentKnownValue(leftVariant.color, rightVariant.color)) return true;
  if (differentKnownSet(leftVariant.storage, rightVariant.storage)) return true;
  if (differentKnownSet(leftVariant.ram, rightVariant.ram)) return true;
  if (differentKnownSet(leftVariant.modelCodes, rightVariant.modelCodes)) return true;
  if (differentKnownSet(leftVariant.skuVariants, rightVariant.skuVariants)) return true;

  return false;
}

function modelFamily(normalized: string) {
  const iphone = normalized.match(/\biphone\s*(\d{1,2})(?:\s*(pro max|pro|plus|mini|air|se))?\b/);
  if (iphone) return `iphone-${iphone[1]}-${iphone[2] ?? "base"}`;

  const galaxy = normalized.match(/\bgalaxy\s*(s|z|a)\s*-?(\d{1,3})(?:\s*(ultra|fe|plus|flip|fold))?\b/);
  if (galaxy) return `galaxy-${galaxy[1]}${galaxy[2]}-${galaxy[3] ?? "base"}`;

  const macbook = normalized.match(/\bmacbook\s*(air|pro)\b/);
  if (macbook) return `macbook-${macbook[1]}`;

  const honor = normalized.match(/\bhonor\s*(magic|x)\s*-?([a-z0-9]+)\b/);
  if (honor) return `honor-${honor[1]}-${honor[2]}`;

  return undefined;
}

function memoryValues(normalized: string, kind: "storage" | "ram") {
  const values = new Set<string>();
  for (const match of normalized.matchAll(/\b(\d{1,2})\s*\/\s*(\d{2,4})(?:\s*gb)?\b/g)) {
    if (kind === "ram") values.add(`${Number(match[1])}gb`);
    if (kind === "storage") values.add(`${Number(match[2])}gb`);
  }

  const matches = normalized.matchAll(/\b(\d{1,4})\s*(tb|gb)\b/g);
  for (const match of matches) {
    const amount = Number(match[1]);
    const unit = match[2];
    const around = normalized.slice(Math.max(0, match.index! - 14), match.index! + match[0].length + 14);
    const before = normalized.slice(Math.max(0, match.index! - 12), match.index!);
    const after = normalized.slice(match.index! + match[0].length, match.index! + match[0].length + 12);
    const explicitRam = /\bram\b|ოპერატიულ/.test(around);
    const explicitStorage = /\bstorage\b|\bssd\b|\bhdd\b|\brom\b|მეხსიერ/.test(around);
    const likelyStorage = unit === "tb" || amount >= 64;
    const likelyRam = amount <= 64 && !likelyStorage;
    const targetedRam =
      /\bram\s*$/.test(before) ||
      /^\s*ram\b/.test(after) ||
      (explicitRam && !/\b(?:storage|ssd|hdd|rom)\b/.test(before + after));
    const targetedStorage =
      /\b(?:storage|ssd|hdd|rom)\s*$/.test(before) ||
      /^\s*(?:storage|ssd|hdd|rom)\b/.test(after) ||
      (explicitStorage && !/\bram\b/.test(before + after));

    if (kind === "storage" && (targetedStorage || (!targetedRam && likelyStorage))) values.add(`${amount}${unit}`);
    if (kind === "ram" && (targetedRam || (!targetedStorage && likelyRam))) values.add(`${amount}${unit}`);
  }

  return values;
}

function processorValue(normalized: string) {
  const intel = normalized.match(/\b(?:intel\s*)?(?:core\s*)?(i[3579]|ultra\s*[3579]|[357])[-\s]?(\d{3,5}[a-z]{0,2})\b/);
  if (intel) return `intel-${intel[1].replace(/\s+/g, "")}-${intel[2]}`;

  const ryzen = normalized.match(/\bryzen\s*([3579])[-\s]?(\d{3,5}[a-z]{0,2})\b/);
  if (ryzen) return `ryzen-${ryzen[1]}-${ryzen[2]}`;

  return undefined;
}

function skuVariants(normalized: string) {
  return new Set(
    [...normalized.matchAll(/\b([a-z]{1,8}\d{3,})\s+([a-z]{2,})\s+(\d{3,})\b/g)].map((match) =>
      `${match[1]}-${match[2]}-${match[3]}`,
    ),
  );
}

function modelCodes(normalized: string) {
  return new Set(
    normalized
      .split(/[\s/]+/)
      .map((token) => token.replace(/[^a-z0-9_-]/g, ""))
      .filter((token) => /[a-z]/.test(token) && /\d/.test(token) && token.length >= 6 && !/^\d+(gb|tb)$/.test(token)),
  );
}

function simType(normalized: string) {
  if (/\be-?sim only\b|\besim only\b|\be-?sim\b/.test(normalized)) return "esim";
  if (/\bdual sim\b|\bnano sim\b|\bphysical sim\b/.test(normalized)) return "physical";
  return undefined;
}

function colorValue(normalized: string) {
  const colors = [
    "cosmic orange",
    "black titanium",
    "blue titanium",
    "natural titanium",
    "space black",
    "dreamy purple",
    "black",
    "white",
    "silver",
    "gray",
    "grey",
    "blue",
    "green",
    "orange",
    "gold",
    "pink",
    "purple",
    "titanium",
    "შავი",
    "თეთრი",
    "ვერცხლის",
    "ლურჯი",
    "მწვანე",
    "ნარინჯის",
    "ოქროს",
    "იასამნისფერი",
    "მეწამული",
  ];
  return colors.find((color) => normalized.includes(color));
}

function differentKnownValue(left?: string, right?: string) {
  return Boolean(left && right && left !== right);
}

function differentKnownSet(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return false;
  return ![...left].some((value) => right.has(value));
}
