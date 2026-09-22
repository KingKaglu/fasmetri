import { ProductAttributeInput, ProductAttributes, extractProductAttributes } from "@/lib/productNormalization";

export type ProductType =
  | "mobile_phone"
  | "tablet"
  | "tablet_accessory"
  | "phone_accessory"
  | "laptop"
  | "computer"
  | "monitor"
  | "television"
  | "audio"
  | "wearable"
  | "appliance"
  | "small_appliance"
  | "gaming"
  | "furniture"
  | "kitchenware"
  | "auto_accessory"
  | "other";

export type ProductIdentity = {
  productType: ProductType;
  categorySlug?: string | null;
  brand?: string;
  productLine?: string;
  model?: string;
  variant?: string;
  storage?: string;
  ram?: string;
  color?: string;
  simType?: string;
  // Apple Watch band identity. Kept OUT of colour so that a stated-vs-stated
  // band mismatch is a hard conflict while an unstated band never splits.
  bandType?: string;
  bandSize?: string;
  modelCode?: string;
  sku?: string;
  cpu?: string;
  gpu?: string;
  screenSize?: string;
  os?: string;
  capacity?: string;
  compatibleDevice?: string;
  productForm?: string;
  imageFingerprint?: string;
  normalizedTitle: string;
  cleanTitle: string;
  canonicalKey?: string;
  confidence?: number;
  attributes: ProductAttributes;
};

export function extractProductIdentity(rawOffer: ProductAttributeInput): ProductIdentity {
  const attributes = extractProductAttributes(rawOffer);
  const productType = productTypeFor(attributes);
  const base = identityFromAttributes(attributes, productType);
  return { ...base, canonicalKey: buildCanonicalProductKey(base) };
}

export function readProductIdentity(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const identity = value as Partial<ProductIdentity>;
  if (!identity.productType || !identity.normalizedTitle || !identity.cleanTitle || !identity.attributes) return undefined;
  return identity as ProductIdentity;
}

export function mergeProductIdentities(base: ProductIdentity, supplement: ProductIdentity) {
  const merged: ProductIdentity = {
    ...base,
    brand: base.brand ?? supplement.brand,
    productLine: base.productLine ?? supplement.productLine,
    model: base.model ?? supplement.model,
    variant: base.variant ?? supplement.variant,
    storage: base.storage ?? supplement.storage,
    ram: base.ram ?? supplement.ram,
    color: base.color ?? supplement.color,
    simType: base.simType ?? supplement.simType,
    bandType: base.bandType ?? supplement.bandType,
    bandSize: base.bandSize ?? supplement.bandSize,
    modelCode: base.modelCode ?? supplement.modelCode,
    sku: base.sku ?? supplement.sku,
    cpu: base.cpu ?? supplement.cpu,
    gpu: base.gpu ?? supplement.gpu,
    screenSize: base.screenSize ?? supplement.screenSize,
    os: base.os ?? supplement.os,
    capacity: base.capacity ?? supplement.capacity,
    compatibleDevice: base.compatibleDevice ?? supplement.compatibleDevice,
    productForm: base.productForm ?? supplement.productForm,
    imageFingerprint: base.imageFingerprint ?? supplement.imageFingerprint,
    attributes: {
      ...base.attributes,
      brand: base.attributes.brand ?? supplement.attributes.brand,
      modelFamily: base.attributes.modelFamily ?? supplement.attributes.modelFamily,
      variant: base.attributes.variant ?? supplement.attributes.variant,
      modelCodes: unique([...base.attributes.modelCodes, ...supplement.attributes.modelCodes]),
      skuCodes: unique([...base.attributes.skuCodes, ...supplement.attributes.skuCodes]),
      cpu: base.attributes.cpu ?? supplement.attributes.cpu,
      gpu: base.attributes.gpu ?? supplement.attributes.gpu,
      ram: unique([...base.attributes.ram, ...supplement.attributes.ram]),
      storage: unique([...base.attributes.storage, ...supplement.attributes.storage]),
      screenSize: base.attributes.screenSize ?? supplement.attributes.screenSize,
      sim: base.attributes.sim ?? supplement.attributes.sim,
      color: base.attributes.color ?? supplement.attributes.color,
      caseColor: base.attributes.caseColor ?? supplement.attributes.caseColor,
      bandType: base.attributes.bandType ?? supplement.attributes.bandType,
      bandSize: base.attributes.bandSize ?? supplement.attributes.bandSize,
      os: base.attributes.os ?? supplement.attributes.os,
      capacity: base.attributes.capacity ?? supplement.attributes.capacity,
      compatibleDevice: base.attributes.compatibleDevice ?? supplement.attributes.compatibleDevice,
      typeTokens: unique([...base.attributes.typeTokens, ...supplement.attributes.typeTokens]),
      imageFingerprint: base.attributes.imageFingerprint ?? supplement.attributes.imageFingerprint,
    },
  };
  merged.canonicalKey = buildCanonicalProductKey(merged);
  return merged;
}

export function extractPhoneIdentity(title: string) {
  return identityFromTitle(title, "mobile_phone");
}

export function extractLaptopIdentity(title: string) {
  return identityFromTitle(title, "laptop");
}

export function extractApplianceIdentity(title: string) {
  return identityFromTitle(title, "appliance");
}

export function buildCanonicalProductKey(identity: Omit<ProductIdentity, "canonicalKey"> | ProductIdentity) {
  const brand = identity.brand;
  const model = identity.model;
  if (identity.productType === "mobile_phone" || identity.productType === "tablet") {
    const storage = identity.storage ?? (phoneCanUseModelCodeInsteadOfStorage(identity) ? identity.modelCode ?? "base" : undefined);
    if (!brand || !model || !storage) return undefined;
    const ram = ramBelongsInPhoneKey(identity) ? identity.ram : undefined;
    // e-SIM-only labelling is descriptive, not a separate variant (see buildParentKey).
    return key([brand, model, ram, storage, identity.color]);
  }
  if (identity.productType === "laptop") {
    if (!brand) return undefined;
    // Laptop SKU / model code uniquely identifies the configuration, so it can
    // stand in for a missing marketing model name.
    if (identity.modelCode || identity.sku) {
      return key([brand, model, identity.modelCode ?? identity.sku, identity.cpu, identity.ram, identity.storage, identity.color]);
    }
    if (model && identity.cpu && identity.ram && identity.storage) {
      return key([brand, model, identity.cpu, identity.ram, identity.storage, identity.color]);
    }
    return undefined;
  }
  if (identity.productType === "television" || identity.productType === "monitor") {
    if (!brand || !(identity.modelCode || identity.model) || !identity.screenSize) return undefined;
    return key([brand, identity.modelCode ?? identity.model, identity.screenSize]);
  }
  if (identity.productType === "appliance" || identity.productType === "small_appliance") {
    if (!brand || !identity.modelCode) return undefined;
    return key([brand, identity.modelCode, identity.capacity, identity.productForm, identity.color]);
  }
  if (identity.productType === "phone_accessory" || identity.productType === "tablet_accessory") {
    if (!brand || !identity.productForm || !identity.compatibleDevice) return undefined;
    return key([brand, identity.productForm, identity.compatibleDevice, identity.modelCode, identity.color]);
  }
  if (identity.productType === "wearable") {
    if (!brand || !model) return undefined;
    // Band type and size are part of the purchasable variant: same watch, same
    // case colour, Alpine Loop 2,699 GEL vs Titanium Milanese Loop 3,449 GEL.
    return key([brand, model, identity.screenSize, identity.color, identity.bandType, identity.bandSize]);
  }
  if (brand && (identity.modelCode || model)) {
    return key([brand, identity.modelCode ?? model, identity.productForm, identity.color]);
  }
  return undefined;
}

function identityFromTitle(title: string, forcedType: ProductType) {
  const attributes = extractProductAttributes({ title });
  const base = identityFromAttributes(attributes, forcedType);
  return { ...base, canonicalKey: buildCanonicalProductKey(base) };
}

function identityFromAttributes(attributes: ProductAttributes, productType: ProductType): Omit<ProductIdentity, "canonicalKey"> {
  const family = attributes.modelFamily;
  const brand = brandForIdentity(attributes.brand, family);
  return {
    productType,
    categorySlug: attributes.categorySlug,
    brand,
    productLine: attributes.productLine,
    model: family ?? statedModelFallback(attributes, productType),
    variant: attributes.variant,
    storage: chooseStorage(attributes.storage),
    ram: chooseRam(attributes.ram),
    // A watch title names the case colour AND the band colour; for wearables the
    // case colour is the one that identifies the product.
    color: productType === "wearable" ? attributes.caseColor ?? attributes.color : attributes.color,
    simType: attributes.sim,
    bandType: attributes.bandType,
    bandSize: attributes.bandSize,
    modelCode: attributes.modelCodes[0],
    sku: attributes.skuCodes[0],
    cpu: attributes.cpu,
    gpu: attributes.gpu,
    screenSize: attributes.screenSize ?? inferredScreenDiagonal(attributes, productType),
    os: attributes.os,
    capacity: attributes.capacity,
    compatibleDevice: attributes.compatibleDevice,
    productForm: productForm(attributes),
    imageFingerprint: attributes.imageFingerprint,
    normalizedTitle: attributes.normalizedTitle,
    cleanTitle: attributes.cleanTitle,
    confidence: identityConfidence(attributes, productType),
    attributes,
  };
}

// Phones and laptops are covered by the model-family lists, so their keys must
// keep coming from `modelFamily` alone. Televisions, monitors and appliances
// have no family list — their identity is the bare model code, and brands like
// BBS or Hyundai use codes ("32BS8000") that `modelCodes()` filters out as
// GPU/CPU lookalikes. Where the store stated the model outright, use it rather
// than leaving the product with no model and therefore no parent key.
// "other" is included deliberately: it means we could not type the product at
// all, so a model the store stated outright is the best identity available —
// without it, personal-care items like "თმის დასახვევი DSP 20185" have no
// model, no model code and no SKU, and the matcher refuses to confirm them.
const STATED_MODEL_PRODUCT_TYPES = new Set<ProductType>(["television", "monitor", "appliance", "small_appliance", "computer", "other"]);

function statedModelFallback(attributes: ProductAttributes, productType: ProductType) {
  if (!STATED_MODEL_PRODUCT_TYPES.has(productType)) return undefined;
  return attributes.explicitModel;
}

// A television or monitor without a screen size gets no parent key at all
// (variantMatching.buildParentKey), and Georgian shops routinely omit the
// diagonal from the title: Zoommer lists "LG TV 50UA75009LA Black", where the
// only "50" is inside the model code.
//
// Panel makers put the diagonal at the front of the model code, either directly
// (TCL 65V6D, LG 50UA75009LA, Hisense 55A6K, Hyundai 55HY9909WOS) or behind a
// short series prefix (Samsung UE55DU7100UXRU). Failing that, a standalone
// 2–3 digit number in the title is the diagonal ("Xiaomi TV S Mini LED 75").
// Both are bounded to real panel sizes, so years, refresh rates and resolutions
// cannot be mistaken for one.
const SCREEN_DIAGONAL_PRODUCT_TYPES = new Set<ProductType>(["television", "monitor"]);

function inferredScreenDiagonal(attributes: ProductAttributes, productType: ProductType) {
  if (!SCREEN_DIAGONAL_PRODUCT_TYPES.has(productType)) return undefined;

  for (const code of [attributes.modelCodes[0], attributes.explicitModel, attributes.skuCodes[0]]) {
    // Sony writes the series prefix with a separator ("K-55XR50"), so allow one.
    const leading = code?.match(/^[a-z]{0,3}[-_]?(\d{2,3})(?=[a-z])/)?.[1];
    if (leading && isPanelDiagonal(leading)) return `${leading}in`;
  }

  const standalone = attributes.cleanTitle.match(/(?:^|\s)(\d{2,3})(?![a-z0-9])/)?.[1];
  return standalone && isPanelDiagonal(standalone) ? `${standalone}in` : undefined;
}

function isPanelDiagonal(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 17 && parsed <= 120;
}

function productTypeFor(attributes: ProductAttributes): ProductType {
  const slug = attributes.categorySlug ?? "";
  if (slug === "phone-accessories") return "phone_accessory";
  if (slug === "tablets") return "tablet";
  if (slug === "tablet-accessories") return "tablet_accessory";
  if (slug === "audio") return "audio";
  if (slug === "wearables") return "wearable";
  if (slug === "gaming") return "gaming";
  if (slug === "laptops" || attributes.modelFamily?.startsWith("macbook_")) return "laptop";
  if (slug === "monitors") return "monitor";
  if (slug === "televisions") return "television";
  if (slug === "home-appliances" || slug === "refrigerators" || slug === "washing-machines") return "appliance";
  if (slug === "small-appliances") return "small_appliance";
  if (slug === "furniture") return "furniture";
  if (slug === "kitchen-dishes") return "kitchenware";
  if (slug === "auto-accessories") return "auto_accessory";
  if (slug === "computers" || slug === "computer-accessories" || slug === "cables-adapters") return "computer";
  if (
    slug === "mobiles" ||
    /^(iphone|galaxy|pixel|redmi|poco|honor|xiaomi|vivo|realme|oppo|zte|nubia|hmd|nokia|oneplus|nothing_phone|motorola|oukitel)_/.test(
      attributes.modelFamily ?? "",
    )
  )
    return "mobile_phone";
  return "other";
}

function productForm(attributes: ProductAttributes) {
  const signal = attributes.cleanTitle;
  const forms = [
    "case",
    "cover",
    "screen protector",
    "charger",
    "power bank",
    "headphone",
    "earbuds",
    "speaker",
    "refrigerator",
    "washing machine",
    "dishwasher",
    "vacuum",
    "air conditioner",
    "coffee machine",
    "chair",
    "table",
    "mug",
    "cup",
  ];
  return forms.find((form) => signal.includes(form));
}

function key(parts: Array<string | undefined>) {
  return parts.filter(Boolean).map((part) => part!.replace(/[\s/-]+/g, "_")).join("|");
}

function brandForIdentity(brand?: string, model?: string) {
  if ((brand === "redmi" || brand === "poco") && model?.startsWith(`${brand}_`)) return "xiaomi";
  return brand;
}

function ramBelongsInPhoneKey(identity: Omit<ProductIdentity, "canonicalKey"> | ProductIdentity) {
  if (!identity.ram) return false;
  if (identity.brand === "apple" || identity.model?.startsWith("iphone_")) return false;
  return true;
}

function phoneCanUseModelCodeInsteadOfStorage(identity: Omit<ProductIdentity, "canonicalKey"> | ProductIdentity) {
  return Boolean(identity.model && /^(hmd|nokia|oukitel|sigma)_/.test(identity.model));
}

function chooseStorage(values: string[]) {
  return [...values].sort((left, right) => memoryWeight(right) - memoryWeight(left))[0];
}

function chooseRam(values: string[]) {
  return [...values].sort((left, right) => memoryWeight(left) - memoryWeight(right))[0];
}

function memoryWeight(value: string) {
  const match = value.match(/^(\d+)(gb|tb)$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  return match[2] === "tb" ? amount * 1024 : amount;
}

function identityConfidence(attributes: ProductAttributes, productType: ProductType) {
  let score = 30;
  if (attributes.brand) score += 15;
  if (attributes.modelFamily) score += 25;
  if (attributes.modelCodes.length || attributes.skuCodes.length) score += 20;
  if (attributes.storage.length) score += 10;
  if (attributes.ram.length && productType !== "mobile_phone") score += 8;
  if (attributes.color) score += 6;
  return Math.min(100, score);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
