import { ProductIdentity, ProductType, extractProductIdentity, readProductIdentity } from "@/lib/productIdentity";
import { ProductAttributeInput } from "@/lib/productNormalization";
import { explainMatchDecision } from "@/lib/productMatching";

export type VariantIdentity = ProductIdentity & {
  canonicalParentKey?: string;
  canonicalVariantKey?: string;
};

export type VariantMatchDecision = {
  status: "SAME_VARIANT" | "SAME_PARENT_DIFFERENT_VARIANT" | "POSSIBLE" | "REJECTED";
  confidence: number;
  reasons: string[];
  hardMismatchReasons: string[];
  missingAttributes: string[];
  parentKey?: string;
  variantKey?: string;
  left: VariantIdentity;
  right: VariantIdentity;
};

export function extractVariantIdentity(input: ProductAttributeInput | ProductIdentity | unknown): VariantIdentity {
  const identity =
    readProductIdentity(input) ??
    ("productType" in Object(input) ? (input as ProductIdentity) : extractProductIdentity(input as ProductAttributeInput));
  return {
    ...identity,
    canonicalParentKey: buildParentKey(identity),
    canonicalVariantKey: buildVariantKey(identity),
  };
}

export function buildParentKey(identity: ProductIdentity) {
  if (identity.productType === "mobile_phone" || identity.productType === "tablet") {
    if (!identity.brand || !identity.model || !identity.storage) return undefined;
    const ram = phoneRamBelongsInParentKey(identity) ? identity.ram : undefined;
    return key([identity.brand, identity.model, ram, identity.storage]);
  }

  if (identity.productType === "laptop") {
    if (!identity.brand || !identity.model) return undefined;
    if (isMacBook(identity)) {
      return key([identity.brand, identity.model, identity.screenSize, identity.cpu, identity.ram, identity.storage]);
    }
    return key([identity.brand, identity.model, identity.modelCode ?? identity.sku, identity.cpu, identity.ram, identity.storage]);
  }

  if (identity.productType === "television" || identity.productType === "monitor") {
    if (!identity.brand || !(identity.modelCode || identity.model) || !identity.screenSize) return undefined;
    return key([identity.brand, identity.modelCode ?? identity.model, identity.screenSize]);
  }

  if (identity.productType === "appliance" || identity.productType === "small_appliance") {
    if (!identity.brand || !(identity.modelCode || identity.model || identity.productForm)) return undefined;
    return key([identity.brand, identity.modelCode ?? identity.model, identity.capacity, identity.productForm]);
  }

  if (identity.productType === "phone_accessory" || identity.productType === "tablet_accessory") {
    if (!identity.brand || !identity.productForm) return undefined;
    return key([identity.brand, identity.productForm, identity.compatibleDevice, identity.modelCode ?? identity.sku]);
  }

  if (identity.productType === "furniture") {
    return key([identity.brand, identity.productForm ?? identity.model, identity.modelCode ?? identity.screenSize]);
  }

  if (identity.productType === "kitchenware") {
    return key([identity.productForm ?? identity.model, identity.capacity, identity.brand ?? identity.modelCode]);
  }

  if (identity.brand && (identity.modelCode || identity.model || identity.productForm)) {
    return key([identity.brand, identity.modelCode ?? identity.model, identity.productForm]);
  }

  return undefined;
}

export function buildVariantKey(identity: ProductIdentity) {
  const parentKey = buildParentKey(identity);
  if (!parentKey) return undefined;

  if (identity.productType === "mobile_phone" || identity.productType === "tablet") {
    return key([parentKey, identity.color]);
  }

  if (identity.productType === "laptop") {
    if (isMacBook(identity)) {
      return key([identity.brand, identity.model, identity.screenSize, identity.modelCode ?? identity.sku, identity.cpu, identity.ram, identity.storage, identity.color]);
    }
    return key([parentKey, identity.color, identity.os]);
  }

  if (identity.productType === "phone_accessory" || identity.productType === "tablet_accessory") {
    return key([parentKey, identity.color]);
  }

  if (identity.productType === "furniture") {
    return key([parentKey, identity.capacity, identity.color]);
  }

  if (identity.productType === "appliance" || identity.productType === "small_appliance" || identity.productType === "television" || identity.productType === "monitor") {
    return key([parentKey, identity.color]);
  }

  return key([parentKey, identity.color]);
}

export function compareVariantIdentities(leftInput: ProductIdentity | ProductAttributeInput, rightInput: ProductIdentity | ProductAttributeInput): VariantMatchDecision {
  const left = extractVariantIdentity(leftInput);
  const right = extractVariantIdentity(rightInput);
  const decision = explainMatchDecision(left, right);

  if (decision.status === "CONFIRMED" && left.canonicalVariantKey && left.canonicalVariantKey === right.canonicalVariantKey) {
    return {
      status: "SAME_VARIANT",
      confidence: 100,
      reasons: [`Variant key matched: ${left.canonicalVariantKey}.`, ...decision.reasons],
      hardMismatchReasons: [],
      missingAttributes: decision.missingAttributes,
      parentKey: left.canonicalParentKey,
      variantKey: left.canonicalVariantKey,
      left,
      right,
    };
  }

  if (
    !decision.hardMismatchReasons.length &&
    left.canonicalParentKey &&
    left.canonicalParentKey === right.canonicalParentKey &&
    left.canonicalVariantKey !== right.canonicalVariantKey
  ) {
    return {
      status: "SAME_PARENT_DIFFERENT_VARIANT",
      confidence: Math.min(89, Math.max(70, decision.confidence || 80)),
      reasons: [`Parent key matched: ${left.canonicalParentKey}.`, "Variant key differs, so prices must stay separate."],
      hardMismatchReasons: [],
      missingAttributes: decision.missingAttributes,
      parentKey: left.canonicalParentKey,
      variantKey: left.canonicalVariantKey,
      left,
      right,
    };
  }

  return {
    status: decision.status === "POSSIBLE" ? "POSSIBLE" : "REJECTED",
    confidence: decision.confidence,
    reasons: decision.reasons,
    hardMismatchReasons: decision.hardMismatchReasons,
    missingAttributes: decision.missingAttributes,
    parentKey: left.canonicalParentKey,
    variantKey: left.canonicalVariantKey,
    left,
    right,
  };
}

export function shouldAttachOfferToVariant(left: ProductIdentity | ProductAttributeInput, right: ProductIdentity | ProductAttributeInput) {
  return compareVariantIdentities(left, right).status === "SAME_VARIANT";
}

function phoneRamBelongsInParentKey(identity: ProductIdentity) {
  if (!identity.ram) return false;
  if (identity.brand === "apple" || identity.model?.startsWith("iphone_")) return false;
  return true;
}

function isMacBook(identity: ProductIdentity) {
  return identity.brand === "apple" && Boolean(identity.model?.startsWith("macbook_"));
}

function key(parts: Array<string | undefined>) {
  const cleaned = parts
    .filter(Boolean)
    .map((part) => part!.toLowerCase().trim().replace(/[\s/-]+/g, "_").replace(/[^a-z0-9_ა-ჰ|]+/g, ""));
  return cleaned.length ? cleaned.join("|") : undefined;
}

export function productTypeNeedsSeparateColorVariant(type: ProductType) {
  return ["mobile_phone", "tablet", "laptop", "audio", "wearable", "phone_accessory", "tablet_accessory"].includes(type);
}
