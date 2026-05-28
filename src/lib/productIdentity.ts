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
  modelCode?: string;
  sku?: string;
  cpu?: string;
  gpu?: string;
  screenSize?: string;
  os?: string;
  capacity?: string;
  compatibleDevice?: string;
  productForm?: string;
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
    modelCode: base.modelCode ?? supplement.modelCode,
    sku: base.sku ?? supplement.sku,
    cpu: base.cpu ?? supplement.cpu,
    gpu: base.gpu ?? supplement.gpu,
    screenSize: base.screenSize ?? supplement.screenSize,
    os: base.os ?? supplement.os,
    capacity: base.capacity ?? supplement.capacity,
    compatibleDevice: base.compatibleDevice ?? supplement.compatibleDevice,
    productForm: base.productForm ?? supplement.productForm,
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
      os: base.attributes.os ?? supplement.attributes.os,
      capacity: base.attributes.capacity ?? supplement.attributes.capacity,
      compatibleDevice: base.attributes.compatibleDevice ?? supplement.attributes.compatibleDevice,
      typeTokens: unique([...base.attributes.typeTokens, ...supplement.attributes.typeTokens]),
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
    if (!brand || !model || !identity.storage) return undefined;
    const ram = ramBelongsInPhoneKey(identity) ? identity.ram : undefined;
    const sim = identity.simType === "esim_only" ? "esim_only" : undefined;
    return key([brand, model, ram, identity.storage, identity.color, sim]);
  }
  if (identity.productType === "laptop") {
    if (!brand || !model) return undefined;
    if (identity.modelCode || identity.sku) {
      return key([brand, model, identity.modelCode ?? identity.sku, identity.cpu, identity.ram, identity.storage, identity.color]);
    }
    if (identity.cpu && identity.ram && identity.storage) {
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
    return key([brand, model, identity.screenSize, identity.color]);
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
    model: family,
    variant: attributes.variant,
    storage: chooseStorage(attributes.storage),
    ram: chooseRam(attributes.ram),
    color: attributes.color,
    simType: attributes.sim,
    modelCode: attributes.modelCodes[0],
    sku: attributes.skuCodes[0],
    cpu: attributes.cpu,
    gpu: attributes.gpu,
    screenSize: attributes.screenSize,
    os: attributes.os,
    capacity: attributes.capacity,
    compatibleDevice: attributes.compatibleDevice,
    productForm: productForm(attributes),
    normalizedTitle: attributes.normalizedTitle,
    cleanTitle: attributes.cleanTitle,
    confidence: identityConfidence(attributes, productType),
    attributes,
  };
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
    /^(iphone|galaxy|pixel|redmi|poco|honor|xiaomi|vivo|realme|oppo|zte|nubia|hmd|oneplus|nothing_phone|motorola)_/.test(
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
