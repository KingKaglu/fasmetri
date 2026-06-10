import { normalizeProductTitle, removeNoiseWords } from "@/lib/productNormalization";
import { extractVariantIdentity } from "@/lib/variantMatching";

export const SAFE_MATCHER_VERSION = "safe-products-v1";

export type SafeCategorySlug = "mobiles" | "laptops";
export type SafeProductKind = "phone" | "laptop";
export type SafeMatchBand = "AUTO" | "REVIEW" | "WEAK" | "NO_MATCH" | "REJECTED";

export type SafeOfferInput = {
  title: string;
  categorySlug?: string | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  specs?: unknown;
  imageUrl?: string | null;
};

export type SafeScreenSpec = {
  sizeIn?: number;
  resolution?: string;
  panel?: string;
  hz?: number;
};

export type SafeProductIdentity = {
  kind: SafeProductKind;
  categorySlug: SafeCategorySlug;
  brand?: string;
  model?: string;
  modelFamily?: string;
  baseModel?: string;
  suffix?: string;
  modelCode?: string;
  storageGb?: number;
  storageType?: string;
  ramGb?: number;
  color?: string;
  simType?: string;
  esimSupport?: boolean;
  fiveGSupport?: boolean;
  cpu?: string;
  gpu?: string;
  screen?: SafeScreenSpec;
  os?: string;
  imageFingerprint?: string;
  normalizedTitle: string;
  cleanTitle: string;
  familyKey?: string;
  exactKey?: string;
  source: {
    title: string;
    specsText?: string;
  };
};

export type SafeMatchDecision = {
  band: SafeMatchBand;
  confidence: number;
  reason: string;
  reasons: string[];
  hardConflicts: string[];
  caps: string[];
};

export function normalizeSafeCategory(slug?: string | null): SafeCategorySlug | undefined {
  if (!slug) return undefined;
  const value = slug.toLowerCase().trim();
  if (["mobiles", "mobile-phones", "mobile_phones", "phones", "phone"].includes(value)) return "mobiles";
  if (["laptops", "laptop", "notebooks", "notebook"].includes(value)) return "laptops";
  return undefined;
}

export function kindForSafeCategory(categorySlug: SafeCategorySlug): SafeProductKind {
  return categorySlug === "mobiles" ? "phone" : "laptop";
}

export function normalizeSafeOffer(input: SafeOfferInput): SafeProductIdentity | undefined {
  const categorySlug = normalizeSafeCategory(input.categorySlug);
  if (!categorySlug) return undefined;

  const kind = kindForSafeCategory(categorySlug);
  const specsText = flattenSpecs(input.specs);
  const signalText = [input.title, input.brand, input.model, input.description, specsText].filter(Boolean).join(" ");
  const normalizedTitle = normalizeProductTitle(input.title);
  const cleanTitle = removeNoiseWords(input.title);
  const normalizedSignal = normalizeProductTitle(signalText);
  const extracted = extractVariantIdentity({
    title: input.title,
    description: [input.description, specsText].filter(Boolean).join(" ") || undefined,
    brand: input.brand,
    model: input.model,
    categorySlug,
    imageUrl: input.imageUrl,
  });

  const brand = normalizeBrand(input.brand) ?? normalizeBrand(extracted.brand) ?? detectBrand(normalizedSignal);
  const detectedModel = detectModel(normalizedSignal, brand, kind);
  const extractedModel = normalizeModel(extracted.model);
  const model = kind === "phone" ? detectedModel ?? extractedModel : extractedModel ?? detectedModel;
  const phoneParts = kind === "phone" ? splitPhoneModel(model) : undefined;
  const laptopFamily = kind === "laptop" ? normalizeModel(extracted.model) ?? detectLaptopFamily(normalizedSignal, brand) : undefined;
  const modelCode =
    normalizeModelCode(firstSpecValue(input.specs, ["modelCode", "model_code"])) ??
    detectModelCode(normalizedSignal, kind) ??
    normalizeModelCode(extracted.modelCode ?? extracted.sku);
  const memory = detectMemory(normalizedSignal, kind, {
    storage: extracted.storage,
    ram: extracted.ram,
  });
  const ramGb = kind === "phone" && isIphoneModel(brand, model) ? undefined : memory.ramGb;
  const color = normalizeColor(extracted.color) ?? detectColor(normalizedSignal);
  const simType = kind === "phone" ? normalizeSimType(extracted.simType) ?? detectSimType(normalizedSignal) : undefined;
  const cpu = kind === "laptop" ? normalizeCpu(firstSpecValue(input.specs, ["cpu"])) ?? normalizeCpu(extracted.cpu) ?? detectCpu(normalizedSignal) : undefined;
  const gpu = kind === "laptop" ? normalizeGpu(firstSpecValue(input.specs, ["gpu"])) ?? normalizeGpu(extracted.gpu) ?? detectGpu(normalizedSignal) : undefined;
  const screen = kind === "laptop" ? detectScreen(normalizedSignal, extracted.screenSize, input.specs) : undefined;
  const storageType = kind === "laptop" ? normalizeValue(firstSpecValue(input.specs, ["storageType", "storage_type"])) ?? detectStorageType(normalizedSignal) : undefined;
  const os = kind === "laptop" ? normalizeValue(extracted.os) ?? detectOs(normalizedSignal) : undefined;

  const identity: SafeProductIdentity = {
    kind,
    categorySlug,
    brand,
    model: kind === "phone" ? model : laptopFamily,
    modelFamily: kind === "laptop" ? laptopFamily : undefined,
    baseModel: kind === "phone" ? phoneParts?.baseModel : laptopFamily,
    suffix: kind === "phone" ? phoneParts?.suffix : undefined,
    modelCode,
    storageGb: memory.storageGb,
    storageType,
    ramGb,
    color,
    simType,
    esimSupport: kind === "phone" ? /(?:\besim\b|\besim_only\b)/.test(normalizedSignal) : undefined,
    fiveGSupport: kind === "phone" ? /\b5g\b/.test(normalizedSignal) : undefined,
    cpu,
    gpu,
    screen,
    os,
    imageFingerprint: extracted.imageFingerprint,
    normalizedTitle,
    cleanTitle,
    source: {
      title: input.title,
      specsText: specsText || undefined,
    },
  };

  identity.familyKey = buildFamilyKey(identity);
  identity.exactKey = buildExactKey(identity);
  return identity;
}

export function readSafeIdentity(value: unknown): SafeProductIdentity | undefined {
  if (!value || typeof value !== "object") return undefined;
  const identity = value as Partial<SafeProductIdentity>;
  if (
    (identity.kind === "phone" || identity.kind === "laptop") &&
    (identity.categorySlug === "mobiles" || identity.categorySlug === "laptops") &&
    typeof identity.normalizedTitle === "string" &&
    typeof identity.cleanTitle === "string" &&
    identity.source &&
    typeof identity.source === "object"
  ) {
    return identity as SafeProductIdentity;
  }
  return undefined;
}

export function buildFamilyKey(identity: SafeProductIdentity) {
  if (!identity.brand) return undefined;
  if (identity.kind === "phone") {
    if (!identity.baseModel) return undefined;
    return key(["phone", identity.brand, identity.baseModel]);
  }
  if (!identity.modelFamily && !identity.modelCode) return undefined;
  return key(["laptop", identity.brand, identity.modelFamily ?? identity.modelCode]);
}

export function buildExactKey(identity: SafeProductIdentity) {
  if (!identity.brand) return undefined;
  if (identity.kind === "phone") {
    if (!identity.model || !identity.storageGb) return undefined;
    const ram = phoneRamRequired(identity) ? String(identity.ramGb ?? "") : undefined;
    return key(["phone", identity.brand, identity.model, String(identity.storageGb), ram, identity.simType, identity.color]);
  }
  if (!identity.modelFamily && !identity.modelCode) return undefined;
  const storage = identity.storageGb ? `${identity.storageGb}${identity.storageType ? `_${identity.storageType}` : ""}` : undefined;
  return key([
    "laptop",
    identity.brand,
    identity.modelCode ?? identity.modelFamily,
    identity.cpu,
    identity.gpu,
    identity.ramGb ? String(identity.ramGb) : undefined,
    storage,
    screenKey(identity.screen),
    identity.color,
  ]);
}

export function scoreSafeMatch(raw: SafeProductIdentity, candidate: SafeProductIdentity): SafeMatchDecision {
  if (raw.kind !== candidate.kind) {
    return rejected("category/product type mismatch", ["phone matched with laptop/tablet/accessory"]);
  }
  if (raw.categorySlug !== candidate.categorySlug) {
    return rejected("category mismatch", [`category mismatch: ${raw.categorySlug} vs ${candidate.categorySlug}`]);
  }
  if (!raw.brand || !candidate.brand) {
    return rejected("missing brand", ["brand required for safe matching"]);
  }
  if (raw.brand !== candidate.brand) {
    return rejected("brand mismatch", [`brand mismatch: ${raw.brand} vs ${candidate.brand}`]);
  }
  return raw.kind === "phone" ? scorePhone(raw, candidate) : scoreLaptop(raw, candidate);
}

export function identitySummary(identity: SafeProductIdentity) {
  if (identity.kind === "phone") {
    return [
      identity.brand,
      identity.model,
      identity.storageGb ? `${identity.storageGb}gb` : undefined,
      identity.ramGb ? `${identity.ramGb}gb ram` : undefined,
      identity.simType,
      identity.color,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    identity.brand,
    identity.modelFamily,
    identity.modelCode,
    identity.cpu,
    identity.gpu,
    identity.ramGb ? `${identity.ramGb}gb ram` : undefined,
    identity.storageGb ? `${identity.storageGb}gb${identity.storageType ? ` ${identity.storageType}` : ""}` : undefined,
    screenLabel(identity.screen),
  ]
    .filter(Boolean)
    .join(" ");
}

function scorePhone(raw: SafeProductIdentity, candidate: SafeProductIdentity): SafeMatchDecision {
  let confidence = 0;
  const reasons: string[] = [];
  const hardConflicts: string[] = [];
  const caps: Array<{ value: number; reason: string }> = [];

  if (raw.model && candidate.model && raw.model === candidate.model) {
    confidence += 35;
    reasons.push("model +35");
  } else if (raw.baseModel && candidate.baseModel && raw.baseModel === candidate.baseModel) {
    reasons.push("same phone family, exact model not confirmed");
  } else {
    hardConflicts.push("phone model differs");
  }

  if (raw.baseModel && candidate.baseModel && raw.baseModel === candidate.baseModel && raw.suffix !== candidate.suffix) {
    hardConflicts.push(`phone suffix differs: ${raw.suffix ?? "base"} vs ${candidate.suffix ?? "base"}`);
    caps.push({ value: 50, reason: "suffix max50" });
  }

  if (raw.modelCode && candidate.modelCode && raw.modelCode === candidate.modelCode) {
    confidence += 25;
    reasons.push("modelCode +25");
  } else if (raw.modelCode && candidate.modelCode) {
    reasons.push(`modelCode differs: ${raw.modelCode} vs ${candidate.modelCode}`);
  }

  if (raw.storageGb && candidate.storageGb && raw.storageGb === candidate.storageGb) {
    confidence += 20;
    reasons.push("storage +20");
  } else {
    caps.push({ value: 70, reason: "storage max70" });
    if (raw.storageGb && candidate.storageGb) hardConflicts.push(`phone storage differs: ${raw.storageGb} vs ${candidate.storageGb}`);
  }

  if (phoneRamRequired(raw) || phoneRamRequired(candidate) || (raw.ramGb && candidate.ramGb)) {
    if (raw.ramGb && candidate.ramGb && raw.ramGb === candidate.ramGb) {
      confidence += 10;
      reasons.push("RAM +10");
    } else {
      caps.push({ value: 75, reason: "RAM max75" });
      if (raw.ramGb && candidate.ramGb) hardConflicts.push(`phone RAM differs: ${raw.ramGb} vs ${candidate.ramGb}`);
    }
  } else {
    reasons.push("iPhone RAM optional");
  }

  if (raw.simType && candidate.simType && raw.simType === candidate.simType) {
    confidence += 10;
    reasons.push("SIM +10");
  } else {
    caps.push({ value: 80, reason: "SIM max80" });
    if (raw.simType && candidate.simType) hardConflicts.push(`phone SIM differs: ${raw.simType} vs ${candidate.simType}`);
  }

  if (raw.color && candidate.color && raw.color === candidate.color) {
    confidence += 10;
    reasons.push("color +10");
  } else {
    caps.push({ value: 82, reason: "color max82" });
    if (raw.color && candidate.color) hardConflicts.push(`phone color differs: ${raw.color} vs ${candidate.color}`);
  }

  if (raw.fiveGSupport && candidate.fiveGSupport) {
    confidence += 5;
    reasons.push("specs +5");
  } else if (sameKnownSpecs(raw, candidate) >= 3) {
    confidence += 5;
    reasons.push("specs +5");
  }

  if (raw.imageFingerprint && raw.imageFingerprint === candidate.imageFingerprint) {
    confidence += 5;
    reasons.push("image +5");
  }

  return finalize(confidence, reasons, hardConflicts, caps, { auto: 85, review: 70, weak: 60 });
}

function scoreLaptop(raw: SafeProductIdentity, candidate: SafeProductIdentity): SafeMatchDecision {
  let confidence = 0;
  const reasons: string[] = [];
  const hardConflicts: string[] = [];
  const caps: Array<{ value: number; reason: string }> = [];

  if (raw.modelCode && candidate.modelCode && raw.modelCode === candidate.modelCode) {
    confidence += 35;
    reasons.push("modelCode +35");
  } else {
    caps.push({ value: 85, reason: "modelCode max85" });
    if (raw.modelCode && candidate.modelCode) reasons.push(`modelCode differs: ${raw.modelCode} vs ${candidate.modelCode}`);
  }

  if (raw.modelFamily && candidate.modelFamily && raw.modelFamily === candidate.modelFamily) {
    confidence += 20;
    reasons.push("modelFamily +20");
  } else if (isMacBook(raw) || isMacBook(candidate)) {
    hardConflicts.push("MacBook family differs");
  }

  if (isMacBook(raw) && isMacBook(candidate)) {
    const rawAirPro = macBookAirPro(raw.modelFamily);
    const candidateAirPro = macBookAirPro(candidate.modelFamily);
    if (rawAirPro && candidateAirPro && rawAirPro !== candidateAirPro) hardConflicts.push(`MacBook ${rawAirPro} vs ${candidateAirPro}`);
    if (raw.screen?.sizeIn && candidate.screen?.sizeIn && raw.screen.sizeIn !== candidate.screen.sizeIn) {
      hardConflicts.push(`MacBook screen differs: ${raw.screen.sizeIn} vs ${candidate.screen.sizeIn}`);
    }
  }

  if (raw.cpu && candidate.cpu && raw.cpu === candidate.cpu) {
    confidence += 20;
    reasons.push("CPU +20");
  } else {
    caps.push({ value: 55, reason: "CPU max55" });
    if (raw.cpu && candidate.cpu) hardConflicts.push(`laptop CPU differs: ${raw.cpu} vs ${candidate.cpu}`);
  }

  if (raw.gpu && candidate.gpu && raw.gpu === candidate.gpu) {
    confidence += 15;
    reasons.push("GPU +15");
  } else {
    caps.push({ value: 60, reason: "GPU max60" });
    if (raw.gpu && candidate.gpu) hardConflicts.push(`laptop GPU differs: ${raw.gpu} vs ${candidate.gpu}`);
  }

  if (raw.ramGb && candidate.ramGb && raw.ramGb === candidate.ramGb) {
    confidence += 10;
    reasons.push("RAM +10");
  } else {
    caps.push({ value: 70, reason: "RAM max70" });
    if (raw.ramGb && candidate.ramGb) hardConflicts.push(`laptop RAM differs: ${raw.ramGb} vs ${candidate.ramGb}`);
  }

  if (raw.storageGb && candidate.storageGb && raw.storageGb === candidate.storageGb && storageTypeCompatible(raw.storageType, candidate.storageType)) {
    confidence += 10;
    reasons.push("storage +10");
  } else {
    caps.push({ value: 70, reason: "storage max70" });
    if (raw.storageGb && candidate.storageGb && raw.storageGb !== candidate.storageGb) {
      hardConflicts.push(`laptop storage differs: ${raw.storageGb} vs ${candidate.storageGb}`);
    }
    if (!storageTypeCompatible(raw.storageType, candidate.storageType)) {
      hardConflicts.push(`laptop storage type differs: ${raw.storageType} vs ${candidate.storageType}`);
    }
  }

  const screenConflict = screenHardConflict(raw.screen, candidate.screen);
  if (screenConflict) {
    caps.push({ value: 80, reason: "screen max80" });
    hardConflicts.push(screenConflict);
  } else if (screenComparable(raw.screen, candidate.screen)) {
    confidence += 5;
    reasons.push("screen +5");
  } else {
    caps.push({ value: 80, reason: "screen max80" });
  }

  if (raw.color && candidate.color && raw.color === candidate.color) {
    confidence += 3;
    reasons.push("color +3");
  } else if (raw.color && candidate.color) {
    caps.push({ value: 94, reason: "color mismatch prevents auto" });
  }

  return finalize(confidence, reasons, hardConflicts, caps, { auto: 85, review: 70, weak: 65 });
}

function finalize(
  rawConfidence: number,
  reasons: string[],
  hardConflicts: string[],
  caps: Array<{ value: number; reason: string }>,
  thresholds: { auto: number; review: number; weak: number },
): SafeMatchDecision {
  const capValue = caps.reduce((min, cap) => Math.min(min, cap.value), 100);
  const confidence = Math.max(0, Math.min(100, rawConfidence, capValue));
  if (hardConflicts.length) {
    return {
      band: "REJECTED",
      confidence,
      reason: hardConflicts.join("; "),
      reasons,
      hardConflicts,
      caps: caps.map((cap) => cap.reason),
    };
  }
  const band: SafeMatchBand =
    confidence >= thresholds.auto ? "AUTO" : confidence >= thresholds.review ? "REVIEW" : confidence >= thresholds.weak ? "WEAK" : "NO_MATCH";
  return {
    band,
    confidence,
    reason: [...reasons, ...caps.map((cap) => cap.reason)].join("; ") || "No reliable same-product signals.",
    reasons,
    hardConflicts,
    caps: caps.map((cap) => cap.reason),
  };
}

function rejected(reason: string, hardConflicts: string[]): SafeMatchDecision {
  return { band: "REJECTED", confidence: 0, reason, reasons: [], hardConflicts, caps: [] };
}

function phoneRamRequired(identity: SafeProductIdentity) {
  if (!identity.ramGb) return false;
  if (identity.brand === "apple" || identity.model?.startsWith("iphone_")) return false;
  return true;
}

function isIphoneModel(brand?: string, model?: string) {
  return brand === "apple" && Boolean(model?.startsWith("iphone_"));
}

function splitPhoneModel(model?: string) {
  if (!model) return undefined;
  let baseModel = model;
  const suffixes: string[] = [];
  const terminalSuffixes = ["pro_max", "pro_plus", "pro", "plus", "ultra", "fe", "se", "lite", "fold", "flip", "mini", "max"];
  for (const suffix of terminalSuffixes) {
    if (baseModel.endsWith(`_${suffix}`)) {
      suffixes.push(suffix);
      baseModel = baseModel.slice(0, -suffix.length - 1);
      break;
    }
  }
  if (baseModel.includes("_note_")) {
    suffixes.unshift("note");
    baseModel = baseModel.replace("_note_", "_");
  }
  return { baseModel, suffix: suffixes.join("_") || undefined };
}

function sameKnownSpecs(left: SafeProductIdentity, right: SafeProductIdentity) {
  let count = 0;
  if (left.model && left.model === right.model) count += 1;
  if (left.storageGb && left.storageGb === right.storageGb) count += 1;
  if (left.ramGb && left.ramGb === right.ramGb) count += 1;
  if (left.simType && left.simType === right.simType) count += 1;
  if (left.color && left.color === right.color) count += 1;
  if (left.cpu && left.cpu === right.cpu) count += 1;
  if (left.gpu && left.gpu === right.gpu) count += 1;
  return count;
}

function normalizeBrand(value?: string | null) {
  if (!value) return undefined;
  const brand = normalizeValue(value);
  if (!brand) return undefined;
  if (brand === "redmi" || brand === "poco") return "xiaomi";
  if (brand === "hewlett_packard" || brand === "hewlett-packard") return "hp";
  if (brand === "nothing_phone") return "nothing";
  return brand;
}

function detectBrand(signal: string) {
  if (/\biphone\b|\bmacbook\b/.test(signal)) return "apple";
  if (/\bgalaxy\b/.test(signal)) return "samsung";
  if (/\bredmi\b|\bpoco\b/.test(signal)) return "xiaomi";
  if (/\bpixel\b/.test(signal)) return "google";
  const brands = [
    "apple",
    "samsung",
    "xiaomi",
    "google",
    "honor",
    "huawei",
    "oneplus",
    "nothing",
    "realme",
    "oppo",
    "vivo",
    "motorola",
    "nokia",
    "hmd",
    "zte",
    "nubia",
    "oukitel",
    "lenovo",
    "asus",
    "hp",
    "dell",
    "acer",
    "msi",
    "gigabyte",
    "microsoft",
    "razer",
    "chuwi",
  ];
  return brands.find((brand) => new RegExp(`\\b${escapeRegExp(brand)}\\b`).test(signal));
}

function normalizeModel(value?: string | null) {
  const normalized = normalizeValue(value);
  return normalized || undefined;
}

function detectModel(signal: string, brand: string | undefined, kind: SafeProductKind) {
  if (kind === "laptop") return detectLaptopFamily(signal, brand);
  const phoneSignal = signal
    .replace(/\b([samf])\s*-?(\d{1,3}[a-z]?)\+/g, "$1$2 plus")
    .replace(/\bpro\+/g, "pro plus");
  const iphone = phoneSignal.match(/\biphone\s*(\d{1,2}e?|se)(?:\s*(pro max|pro|plus|mini|se|air))?\b/);
  if (iphone) return modelKey(["iphone", iphone[1], iphone[2]?.replace(/\s+/g, "_")]);
  const galaxyFold = phoneSignal.match(/\bgalaxy\s*z\s*(fold|flip)\s*-?(\d{1,2})\b/);
  if (galaxyFold) return modelKey(["galaxy_z", galaxyFold[1], galaxyFold[2]]);
  const galaxy = phoneSignal.match(/\b(?:galaxy|samsung)\s*(s|a|m|f)\s*-?(\d{1,3}[a-z]?)(?:\s*(ultra|fe|plus|pro))?\b/);
  if (galaxy) return modelKey(["galaxy", `${galaxy[1]}${galaxy[2]}`, galaxy[3]]);
  const redmiNote = phoneSignal.match(/\bredmi\s+note\s*(\d+[a-z]?)(?:\s*(pro plus|pro|ultra|plus|lite))?\b/);
  if (redmiNote) return modelKey(["redmi_note", redmiNote[1], redmiNote[2]?.replace(/\s+/g, "_")]);
  const redmiPoco = phoneSignal.match(/\b(redmi|poco)\s*([a-z]?\d+[a-z0-9]*)(?:\s*(pro plus|pro|max|ultra|plus|lite))?\b/);
  if (redmiPoco) return modelKey([redmiPoco[1], redmiPoco[2], redmiPoco[3]?.replace(/\s+/g, "_")]);
  const generic = phoneSignal.match(/\b(pixel|honor|realme|oppo|vivo|oneplus|nothing phone|motorola|moto|nokia|hmd|zte|nubia|oukitel)\s*([a-z]?\d+[a-z0-9]*)(?:\s*(pro max|pro|ultra|plus|fe|se|lite|max))?\b/);
  if (generic) return modelKey([generic[1].replace(/\s+/g, "_"), generic[2], generic[3]?.replace(/\s+/g, "_")]);
  if (brand && phoneSignal.includes(brand)) return modelKey([brand, phoneSignal.split(/\s+/).slice(1, 3).join("_")]);
  return undefined;
}

function detectLaptopFamily(signal: string, brand?: string) {
  const macbook = signal.match(/\bmacbook\s*(air|pro)\s*(13|13\.6|14|15|16)?\b/);
  if (macbook) return modelKey(["macbook", macbook[1], macbook[2]?.replace(".", "_")]);
  const lenovo = signal.match(/\blenovo\s+(thinkpad|thinkbook|ideapad|legion|loq|yoga)(?:\s+(slim|pro))?\s*([a-z]?\d{1,2}|[a-z0-9]{4,})?/);
  if (lenovo) return modelKey(["lenovo", lenovo[1], lenovo[2], lenovo[3]]);
  const asus = signal.match(/\basus\s+(tuf|rog|vivobook|zenbook|expertbook|proart)\s*([a-z0-9-]+)?/);
  if (asus) return modelKey(["asus", asus[1], asus[2]]);
  const hp = signal.match(/\b(?:hp\s+)?(elitebook|probook|zbook|omnibook|spectre|envy|omen|victus|pavilion)\s*([a-z0-9]+)?/);
  if (hp) return modelKey(["hp", hp[1], hp[2]]);
  const dell = signal.match(/\bdell\s+(inspiron|vostro|latitude|xps|precision|pro|g\d+)\s*([a-z0-9]+)?/);
  if (dell) return modelKey(["dell", dell[1], dell[2]]);
  const acer = signal.match(/\bacer\s+(aspire|predator|nitro|swift|extensa|chromebook)\s*([a-z0-9]+)?/);
  if (acer) return modelKey(["acer", acer[1], acer[2]]);
  const msi = signal.match(/\bmsi\s+(modern|katana|sword|thin|prestige|stealth|raider|cyborg|vector|crosshair|pulse|bravo|titan)\s*([a-z0-9]+)?/);
  if (msi) return modelKey(["msi", msi[1], msi[2]]);
  if (brand) return modelKey([brand, signal.split(/\s+/).slice(1, 3).join("_")]);
  return undefined;
}

function normalizeModelCode(value?: string | null) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;
  if (/^(rtx|gtx)_?\d+/.test(normalized)) return undefined;
  if (/^\d+(gb|tb|hz|mah)$/.test(normalized)) return undefined;
  if (/^\d+mm$/.test(normalized)) return undefined;
  return normalized;
}

function detectModelCode(signal: string, kind: SafeProductKind) {
  const patterns =
    kind === "phone"
      ? [
          /\b(a\d{4})\b/,
          /\b(sm[-_ ]?[a-z]\d{3}[a-z0-9/-]*)\b/,
          /\b(cph\d{4}|v\d{4}|rmx\d{4}|xt\d{4})\b/,
        ]
      : [
          /\b(\d{2}(?:irx|iah|iax|irh|iru|itl|alc|arp)\d{1,2})\b/,
          /\b([a-z]{1,3}\d{3,4}[a-z]{0,3})\b/,
          /\b(\d{2}[-_](?:fd|r|dw|dy|cn)\d{0,4}[a-z0-9]*)\b/,
          /\b(35[23]0|55[0-9]{2})\b/,
        ];
  for (const pattern of patterns) {
    const match = signal.match(pattern)?.[1];
    const normalized = normalizeModelCode(match);
    if (normalized && !/^(i[3579]|m[1-9]|n\d{2,4})_?/.test(normalized)) return normalized;
  }
  return undefined;
}

function detectMemory(signal: string, kind: SafeProductKind, extracted: { storage?: string; ram?: string }) {
  const pair = signal.match(/\b(\d{1,2})(?:gb)?\s*[/+-]\s*(\d{2,4}|[12]tb)(?:gb)?\b/);
  let ramGb = memoryToGb(extracted.ram);
  let storageGb = memoryToGb(extracted.storage);
  if (pair) {
    ramGb ??= Number(pair[1]);
    storageGb ??= memoryToGb(pair[2]);
  }

  const entries = [...signal.matchAll(/\b(\d{1,4})\s*(gb|tb)\b/g)].map((match) => ({
    amount: Number(match[1]) * (match[2] === "tb" ? 1024 : 1),
    unit: match[2],
    index: match.index ?? 0,
  }));
  const storageCandidates = entries.filter((entry) => entry.unit === "tb" || entry.amount >= (kind === "phone" ? 16 : 64));
  const ramCandidates = entries.filter((entry) => entry.unit === "gb" && entry.amount <= 64);
  storageGb ??= storageCandidates.sort((left, right) => right.amount - left.amount)[0]?.amount;
  ramGb ??= ramCandidates
    .filter((entry) => !storageCandidates.some((storage) => storage.index === entry.index))
    .sort((left, right) => left.amount - right.amount)[0]?.amount;

  return { ramGb, storageGb };
}

function memoryToGb(value?: string | null) {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/^(\d{1,4})(gb|tb)?$/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  return match[2] === "tb" ? amount * 1024 : amount;
}

function normalizeSimType(value?: string | null) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;
  if (normalized.includes("esim_only")) return "esim_only";
  if (normalized.includes("dual_sim")) return "dual_sim";
  if (normalized.includes("physical_sim") || normalized.includes("nano_sim")) return "physical_sim";
  if (normalized.includes("esim")) return "esim";
  return undefined;
}

function detectSimType(signal: string) {
  if (/\besim_only\b|\be_sim_only\b/.test(signal)) return "esim_only";
  if (/\bdual_sim\b/.test(signal)) return "dual_sim";
  if (/\bnano_sim\b|\bphysical_sim\b/.test(signal)) return "physical_sim";
  if (/\besim\b|\be_sim\b/.test(signal)) return "esim";
  return undefined;
}

function normalizeColor(value?: string | null) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;
  const aliases: Record<string, string> = {
    grey: "gray",
    space_gray: "gray",
    space_grey: "gray",
    graphite: "gray",
    natural_titanium: "titanium",
    black_titanium: "black_titanium",
    white_titanium: "white_titanium",
    blue_titanium: "blue_titanium",
    desert_titanium: "gold_titanium",
  };
  return aliases[normalized] ?? normalized;
}

function detectColor(signal: string) {
  const colors = [
    "black titanium",
    "white titanium",
    "blue titanium",
    "natural titanium",
    "desert titanium",
    "titanium",
    "black",
    "white",
    "blue",
    "green",
    "pink",
    "purple",
    "red",
    "silver",
    "gold",
    "gray",
    "grey",
    "space gray",
    "space black",
  ];
  for (const color of colors) {
    if (new RegExp(`\\b${escapeRegExp(color)}\\b`).test(signal)) return normalizeColor(color);
  }
  return undefined;
}

function normalizeCpu(value?: string | null) {
  const normalized = normalizeValue(value);
  return normalized || undefined;
}

function detectCpu(signal: string) {
  const apple = signal.match(/\bm\s*([1-9])\s*(pro|max|ultra)?\b/);
  if (apple) return key(["m", apple[1], apple[2] ?? "base"]);
  const snapdragon = signal.match(/\bsnapdragon\s*x\s*(elite|plus)?\s*([a-z0-9-]+)?/);
  if (snapdragon) return key(["snapdragon_x", snapdragon[1], snapdragon[2]]);
  const appleA = signal.match(/\bapple\s+a(\d{1,2})\s*(pro|max|ultra)?\b/);
  if (appleA) return key(["apple_a", appleA[1], appleA[2] ?? "base"]);
  const coreUltra = signal.match(/\b(?:intel\s*)?core\s*ultra\s*([3579])\s*[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (coreUltra) return key(["intel_core_ultra", coreUltra[1], coreUltra[2]]);
  const core = signal.match(/\b(?:intel\s*)?(?:core\s*)?(i[3579])[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (core) return key(["intel", core[1], core[2]]);
  const coreNumber = signal.match(/\bcore\s*([3579])\s*[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (coreNumber) return key(["intel_core", coreNumber[1], coreNumber[2]]);
  const ryzenAi = signal.match(/\bryzen\s*ai\s*([3579])[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (ryzenAi) return key(["ryzen_ai", ryzenAi[1], ryzenAi[2]]);
  const ryzen = signal.match(/\bryzen\s*([3579])[- ]?(\d{3,5}[a-z]{0,2})\b/);
  if (ryzen) return key(["ryzen", ryzen[1], ryzen[2]]);
  const intelN = signal.match(/\bintel\s*(n\d{2,4})\b/);
  if (intelN) return key(["intel", intelN[1]]);
  return undefined;
}

function normalizeGpu(value?: string | null) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;
  return normalized.replace(/^nvidia_/, "").replace(/^geforce_/, "");
}

function detectGpu(signal: string) {
  const nvidia = signal.match(/\b(?:nvidia\s+|geforce\s+)?(rtx|gtx)\s*(\d{3,4})(?:\s*(ti))?\b/);
  if (nvidia) return key([nvidia[1], nvidia[2], nvidia[3]]);
  const radeon = signal.match(/\b(?:amd\s+)?radeon\s+(rx\s*)?(\d{3,4}[a-z]{0,2}|[67]80m)\b/);
  if (radeon) return key(["radeon", radeon[1] ? "rx" : undefined, radeon[2]]);
  if (/\bintel\s+iris\s+xe\b/.test(signal)) return "intel_iris_xe";
  const arc = signal.match(/\bintel\s+arc\s+([a-z]\d{3,4})?\b/);
  if (arc) return key(["intel_arc", arc[1]]);
  if (/\bapple\s+\d{1,2}\s*core\s+gpu\b/.test(signal)) return signal.match(/\bapple\s+(\d{1,2})\s*core\s+gpu\b/)?.[1]
    ? `apple_${signal.match(/\bapple\s+(\d{1,2})\s*core\s+gpu\b/)?.[1]}core_gpu`
    : "apple_gpu";
  const coreGpu = signal.match(/\b(\d{1,2})\s*core\s+gpu\b/);
  if (coreGpu) return `apple_${coreGpu[1]}core_gpu`;
  return undefined;
}

function detectStorageType(signal: string) {
  if (/\bemmc\b/.test(signal)) return "emmc";
  if (/\bhdd\b/.test(signal)) return "hdd";
  if (/\bssd\b|\bnvme\b|\bm\.2\b|\bpcie\b/.test(signal)) return "ssd";
  return undefined;
}

function storageTypeCompatible(left?: string, right?: string) {
  if (!left || !right) return true;
  return left === right;
}

function detectScreen(signal: string, extractedScreen?: string, specs?: unknown) {
  const screen: SafeScreenSpec = {};
  const structuredSize = firstSpecValue(specs, ["screenSize", "screen_size"]);
  const structuredRefresh = firstSpecValue(specs, ["refreshRateHz", "refresh_rate_hz"]);
  const structuredResolution = firstSpecValue(specs, ["screenResolution", "screen_resolution"]);
  const structuredPanel = firstSpecValue(specs, ["screenType", "screen_type"]);
  const extracted = extractedScreen?.match(/^(\d{1,2}(?:\.\d)?)in$/)?.[1];
  const size =
    structuredSize?.match(/\b(13\.3|13\.6|14|15\.6|16|17\.3|13)\b/)?.[1] ??
    extracted ??
    signal.match(/\b(13\.3|13\.6|14|15\.6|16|17\.3)\s*(?:inch|inches|in|")?\b/)?.[1] ??
    signal.match(/\b(13\.3|13\.6|15\.6|17\.3)\b/)?.[1];
  if (size) screen.sizeIn = Number(size);
  const hz = structuredRefresh?.match(/\d{2,3}/)?.[0] ?? signal.match(/\b(60|90|120|144|165|240)\s*hz\b/)?.[1];
  if (hz) screen.hz = Number(hz);
  const resolutionSignal = normalizeProductTitle([structuredResolution, signal].filter(Boolean).join(" "));
  if (/\bwuxga\b|1920\s*x\s*1200/.test(resolutionSignal)) screen.resolution = "wuxga";
  else if (/\bqhd\b|\b2k\b|2560\s*x\s*1440/.test(resolutionSignal)) screen.resolution = "qhd";
  else if (/\buhd\b|\b4k\b|3840\s*x\s*2160/.test(resolutionSignal)) screen.resolution = "uhd";
  else if (/\bfhd\b|full\s*hd|1920\s*x\s*1080/.test(resolutionSignal)) screen.resolution = "fhd";
  const panelSignal = normalizeProductTitle([structuredPanel, signal].filter(Boolean).join(" "));
  if (/\boled\b/.test(panelSignal)) screen.panel = "oled";
  else if (/\bips\b/.test(panelSignal)) screen.panel = "ips";
  return Object.keys(screen).length ? screen : undefined;
}

function screenHardConflict(left?: SafeScreenSpec, right?: SafeScreenSpec) {
  if (!left || !right) return undefined;
  if (left.sizeIn && right.sizeIn && left.sizeIn !== right.sizeIn) return `laptop screen size differs: ${left.sizeIn} vs ${right.sizeIn}`;
  if (left.resolution && right.resolution && left.resolution !== right.resolution) return `laptop screen resolution differs: ${left.resolution} vs ${right.resolution}`;
  if (left.panel && right.panel && left.panel !== right.panel) return `laptop screen panel differs: ${left.panel} vs ${right.panel}`;
  if (left.hz && right.hz && left.hz !== right.hz) return `laptop screen refresh differs: ${left.hz} vs ${right.hz}`;
  return undefined;
}

function screenComparable(left?: SafeScreenSpec, right?: SafeScreenSpec) {
  if (!left || !right) return false;
  return Boolean(
    (left.sizeIn && right.sizeIn && left.sizeIn === right.sizeIn) ||
      (left.resolution && right.resolution && left.resolution === right.resolution) ||
      (left.panel && right.panel && left.panel === right.panel) ||
      (left.hz && right.hz && left.hz === right.hz),
  );
}

function screenKey(screen?: SafeScreenSpec) {
  if (!screen) return undefined;
  return [
    screen.sizeIn ? String(screen.sizeIn).replace(".", "_") : undefined,
    screen.resolution,
    screen.panel,
    screen.hz ? `${screen.hz}hz` : undefined,
  ]
    .filter(Boolean)
    .join("_");
}

function screenLabel(screen?: SafeScreenSpec) {
  if (!screen) return undefined;
  return [screen.sizeIn ? `${screen.sizeIn}in` : undefined, screen.resolution, screen.panel, screen.hz ? `${screen.hz}hz` : undefined]
    .filter(Boolean)
    .join(" ");
}

function detectOs(signal: string) {
  if (/\bwindows\s*11\s*pro\b|\bwin\s*11\s*pro\b/.test(signal)) return "windows_11_pro";
  if (/\bwindows\s*11\b|\bwin\s*11\b/.test(signal)) return "windows_11";
  if (/\bubuntu\b/.test(signal)) return "ubuntu";
  if (/\bfree\s*dos\b|\bfreedos\b/.test(signal)) return "freedos";
  if (/\bmacos\b/.test(signal)) return "macos";
  return undefined;
}

function isMacBook(identity: SafeProductIdentity) {
  return identity.brand === "apple" && Boolean(identity.modelFamily?.startsWith("macbook_"));
}

function macBookAirPro(model?: string) {
  if (!model) return undefined;
  if (model.includes("macbook_air")) return "air";
  if (model.includes("macbook_pro")) return "pro";
  return undefined;
}

function flattenSpecs(value: unknown, depth = 0): string {
  if (value == null || depth > 4) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => flattenSpecs(item, depth + 1)).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key} ${flattenSpecs(item, depth + 1)}`)
      .join(" ");
  }
  return "";
}

function firstSpecValue(value: unknown, keys: string[], depth = 0): string | undefined {
  if (value == null || depth > 6) return undefined;
  const normalizedKeys = new Set(keys.map((keyName) => normalizeSpecKey(keyName)));
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstSpecValue(item, keys, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value !== "object") return undefined;
  for (const [keyName, item] of Object.entries(value as Record<string, unknown>)) {
    if (normalizedKeys.has(normalizeSpecKey(keyName)) && item != null && typeof item !== "object") return String(item);
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    const found = firstSpecValue(item, keys, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function normalizeSpecKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeValue(value?: string | null) {
  if (!value) return undefined;
  return normalizeProductTitle(value).replace(/[\s/-]+/g, "_").replace(/[^a-z0-9_]+/g, "").replace(/^_+|_+$/g, "") || undefined;
}

function key(parts: Array<string | undefined>) {
  const cleaned = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.toLowerCase().trim().replace(/[\s/-]+/g, "_").replace(/[^a-z0-9_]+/g, "").replace(/^_+|_+$/g, ""));
  return cleaned.filter(Boolean).join("|") || undefined;
}

function modelKey(parts: Array<string | undefined>) {
  const cleaned = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.toLowerCase().trim().replace(/[\s/-]+/g, "_").replace(/[^a-z0-9_]+/g, "").replace(/^_+|_+$/g, ""));
  return cleaned.filter(Boolean).join("_") || undefined;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
