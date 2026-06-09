import { AUTO_MATCH_CONFIDENCE, REVIEW_MATCH_CONFIDENCE } from "@/config/matchingRules";
import { matchingTokens } from "@/lib/matching";
import { ProductIdentity, ProductType, extractProductIdentity } from "@/lib/productIdentity";
import { ProductAttributeInput } from "@/lib/productNormalization";

type Matchable = ProductIdentity | ProductAttributeInput;

export type MatchDecision = {
  confidence: number;
  status: "CONFIRMED" | "POSSIBLE" | "REJECTED";
  reasons: string[];
  missingAttributes: string[];
  hardMismatchReasons: string[];
  left: ProductIdentity;
  right: ProductIdentity;
};

export function compareProductIdentities(identityA: ProductIdentity, identityB: ProductIdentity) {
  return explainMatchDecision(identityA, identityB);
}

/** Alias exported under the name the spec requires. */
export const compareIdentities = compareProductIdentities;

export function compareProductVariants(left: ProductAttributeInput, right: ProductAttributeInput) {
  return explainMatchDecision(left, right);
}

export function calculateMatchConfidence(left: Matchable, right: Matchable) {
  return explainMatchDecision(left, right).confidence;
}

export function shouldAttachOfferToProduct(product: Matchable, offer: Matchable) {
  return explainMatchDecision(product, offer).status === "CONFIRMED";
}

export function shouldAutoMergeOffers(left: Matchable, right: Matchable) {
  return shouldAttachOfferToProduct(left, right);
}

export function explainMatchDecision(leftInput: Matchable, rightInput: Matchable): MatchDecision {
  const left = toIdentity(leftInput);
  const right = toIdentity(rightInput);
  const reasons: string[] = [];
  const hardMismatchReasons = conflicts(left, right);
  const missingAttributes = missingSignals(left, right);
  const specConflictReview = exactIdentifierSpecConflictReview(left, right, hardMismatchReasons);

  if (specConflictReview) {
    reasons.push(specConflictReview);
    return decision(85, reasons, missingAttributes, [], left, right);
  }

  if (hardMismatchReasons.length) {
    return decision(0, reasons, missingAttributes, hardMismatchReasons, left, right);
  }

  if (compatibleCanonicalMatch(left, right)) {
    const readiness = autoMatchReadiness(left, right);
    reasons.push(`Canonical key matched: ${left.canonicalKey}.`);
    reasons.push(...readiness.reasons);
    return decision(readiness.auto ? 100 : Math.min(89, readiness.confidenceCap), reasons, [...missingAttributes, ...readiness.missingAttributes], [], left, right);
  }

  let exactTitleBoost = 0;
  if (compatibleExactTitleMatch(left, right)) {
    exactTitleBoost = isStrictPair(left, right) ? 20 : 45;
    reasons.push("Exact normalized title matched as a supporting signal.");
  }

  let confidence = exactTitleBoost;
  if (sameKnown(left.categorySlug, right.categorySlug)) {
    confidence += 5;
    reasons.push(`Category matched: ${left.categorySlug}.`);
  }
  if (sameKnown(left.brand, right.brand)) {
    confidence += 20;
    reasons.push(`Brand matched: ${left.brand}.`);
  }
  if (sameKnown(left.model, right.model)) {
    confidence += 45;
    reasons.push(`Exact model family matched: ${left.model}.`);
  }
  if (sameKnown(left.sku, right.sku) || sameKnown(left.modelCode, right.modelCode)) {
    confidence += 95;
    reasons.push(`Exact model code matched: ${left.sku ?? left.modelCode}.`);
  }
  if (sameKnown(left.storage, right.storage)) {
    confidence += 20;
    reasons.push(`Storage matched: ${left.storage}.`);
  }
  if (sameKnown(left.ram, right.ram)) confidence += 12;
  if (sameKnown(left.cpu, right.cpu)) confidence += 22;
  if (sameKnown(left.gpu, right.gpu)) confidence += 10;
  if (sameKnown(left.color, right.color)) {
    confidence += 10;
    reasons.push(`Color matched: ${left.color}.`);
  }
  if (compatibleSim(left.simType, right.simType) && left.simType && right.simType) confidence += 5;
  if (sameKnown(left.screenSize, right.screenSize)) confidence += 8;
  if (sameKnown(left.capacity, right.capacity)) confidence += 12;
  if (sameKnown(left.compatibleDevice, right.compatibleDevice)) confidence += 18;
  if (sameKnown(left.imageFingerprint, right.imageFingerprint)) {
    confidence += 4;
    reasons.push("Image fingerprint matched as supporting evidence.");
  }
  if (left.productType === right.productType && left.productType !== "other") confidence += 5;
  confidence += Math.round(titleOverlap(left, right) * 10);

  const readiness = autoMatchReadiness(left, right);
  reasons.push(...readiness.reasons);
  confidence = Math.min(confidence, readiness.confidenceCap);

  if (!left.model && !right.model && !left.modelCode && !right.modelCode && !left.sku && !right.sku) {
    confidence = Math.min(confidence, REVIEW_MATCH_CONFIDENCE - 1);
    reasons.push("No reliable model identity was extracted.");
  }
  if (isStrictType(left.productType) || isStrictType(right.productType)) {
    if (!sameKnown(left.model, right.model) && !sameKnown(left.modelCode, right.modelCode) && !sameKnown(left.sku, right.sku)) {
      confidence = Math.min(confidence, REVIEW_MATCH_CONFIDENCE - 1);
      reasons.push("A strict product type requires a matching model or code.");
    }
  }

  return decision(Math.min(100, confidence), reasons, missingAttributes, [], left, right);
}

function conflicts(left: ProductIdentity, right: ProductIdentity) {
  const mismatches: string[] = [];
  if (differentKnown(left.categorySlug, right.categorySlug) && strictCategoryConflict(left.categorySlug, right.categorySlug)) {
    mismatches.push(`Category differs: ${left.categorySlug} / ${right.categorySlug}.`);
  }
  if (differentKnown(left.productType, right.productType) && typeConflict(left.productType, right.productType)) {
    mismatches.push(`Product type differs: ${left.productType} / ${right.productType}.`);
  }
  if (differentKnown(left.brand, right.brand)) mismatches.push(`Brand differs: ${left.brand} / ${right.brand}.`);
  if (differentKnown(left.model, right.model)) mismatches.push(`Model differs: ${left.model} / ${right.model}.`);
  if (differentKnown(left.modelCode, right.modelCode) && !compatibleModelCode(left, right)) mismatches.push(`Model code differs: ${left.modelCode} / ${right.modelCode}.`);
  if (differentKnown(left.sku, right.sku)) mismatches.push(`SKU differs: ${left.sku} / ${right.sku}.`);
  if (differentKnown(left.storage, right.storage)) mismatches.push(`Storage differs: ${left.storage} / ${right.storage}.`);
  if (differentKnown(left.ram, right.ram) && variantRamMatters(left, right)) mismatches.push(`RAM differs: ${left.ram} / ${right.ram}.`);
  if (differentKnown(left.cpu, right.cpu)) mismatches.push(`CPU differs: ${left.cpu} / ${right.cpu}.`);
  if (differentKnown(left.gpu, right.gpu) && isComputerType(left.productType, right.productType)) mismatches.push(`GPU differs: ${left.gpu} / ${right.gpu}.`);
  if (differentKnown(left.screenSize, right.screenSize) && screenMatters(left.productType, right.productType)) mismatches.push(`Screen size differs: ${left.screenSize} / ${right.screenSize}.`);
  if (differentKnown(left.capacity, right.capacity)) mismatches.push(`Capacity differs: ${left.capacity} / ${right.capacity}.`);
  if (differentKnown(left.compatibleDevice, right.compatibleDevice)) mismatches.push(`Compatible device differs: ${left.compatibleDevice} / ${right.compatibleDevice}.`);
  if (differentKnown(left.color, right.color) && colorMatters(left.productType, right.productType)) mismatches.push(`Color differs: ${left.color} / ${right.color}.`);
  const simConflict = Boolean(left.simType && right.simType && !compatibleSim(left.simType, right.simType));
  if (simConflict) mismatches.push(`SIM variant differs: ${left.simType} / ${right.simType}.`);
  return mismatches;
}

function missingSignals(left: ProductIdentity, right: ProductIdentity) {
  const fields: Array<keyof ProductIdentity> = [
    "brand",
    "model",
    "modelCode",
    "sku",
    "storage",
    "ram",
    "cpu",
    "gpu",
    "color",
    "simType",
    "screenSize",
    "capacity",
    "compatibleDevice",
    "imageFingerprint",
  ];
  return fields
    .filter((field) => Boolean(left[field]) !== Boolean(right[field]))
    .map((field) => `${field} is present in only one offer.`);
}

function decision(
  confidence: number,
  reasons: string[],
  missingAttributes: string[],
  hardMismatchReasons: string[],
  left: ProductIdentity,
  right: ProductIdentity,
): MatchDecision {
  return {
    confidence: Math.min(100, Math.max(0, Math.round(confidence))),
    status: hardMismatchReasons.length || confidence < REVIEW_MATCH_CONFIDENCE
      ? "REJECTED"
      : confidence >= AUTO_MATCH_CONFIDENCE
        ? "CONFIRMED"
        : "POSSIBLE",
    reasons,
    missingAttributes,
    hardMismatchReasons,
    left,
    right,
  };
}

function toIdentity(value: Matchable) {
  return "productType" in value ? value : extractProductIdentity(value);
}

function titleOverlap(left: ProductIdentity, right: ProductIdentity) {
  const leftTokens = new Set(matchingTokens(left.cleanTitle));
  const rightTokens = new Set(matchingTokens(right.cleanTitle));
  if (!leftTokens.size || !rightTokens.size) return 0;
  return [...leftTokens].filter((token) => rightTokens.has(token)).length / Math.max(leftTokens.size, rightTokens.size);
}

function compatibleSim(left?: string, right?: string) {
  if (!left || !right) return true;
  if (left === right) return true;
  return (left === "esim" && right === "esim_only") || (left === "esim_only" && right === "esim");
}

function typeConflict(left: ProductType, right: ProductType) {
  return left !== "other" && right !== "other";
}

function compatibleModelCode(left: ProductIdentity, right: ProductIdentity) {
  if (!left.modelCode || !right.modelCode) return false;
  if (!sameKnown(left.brand, right.brand) || !sameKnown(left.model, right.model)) return false;
  const leftCode = normalizeModelCode(left.modelCode);
  const rightCode = normalizeModelCode(right.modelCode);
  if (leftCode === rightCode) return true;
  const minPrefix = left.brand === "samsung" ? 5 : 6;
  return leftCode.length >= minPrefix && rightCode.length >= minPrefix && (leftCode.startsWith(rightCode.slice(0, minPrefix)) || rightCode.startsWith(leftCode.slice(0, minPrefix)));
}

function normalizeModelCode(value: string) {
  return value.toLowerCase().replace(/^sm[-_]?/, "").replace(/[^a-z0-9]/g, "");
}

function compatibleCanonicalMatch(left: ProductIdentity, right: ProductIdentity) {
  if (!left.canonicalKey || left.canonicalKey !== right.canonicalKey) return false;
  return (!differentKnown(left.productType, right.productType) || !typeConflict(left.productType, right.productType)) &&
    (!differentKnown(left.categorySlug, right.categorySlug) || !strictCategoryConflict(left.categorySlug, right.categorySlug));
}

function compatibleExactTitleMatch(left: ProductIdentity, right: ProductIdentity) {
  if (!left.cleanTitle || left.cleanTitle !== right.cleanTitle) return false;
  return !differentKnown(left.productType, right.productType) || !typeConflict(left.productType, right.productType);
}

function isStrictType(type: ProductType) {
  return ["mobile_phone", "tablet", "laptop", "computer", "monitor", "television", "appliance", "audio", "wearable", "gaming"].includes(type);
}

function isStrictPair(left: ProductIdentity, right: ProductIdentity) {
  return isStrictType(left.productType) || isStrictType(right.productType);
}

function isComputerType(left: ProductType, right: ProductType) {
  return left === "laptop" || right === "laptop" || left === "computer" || right === "computer";
}

function variantRamMatters(left: ProductIdentity, right: ProductIdentity) {
  if (left.productType === "mobile_phone" && right.productType === "mobile_phone") {
    return left.brand !== "apple" && right.brand !== "apple";
  }
  return isStrictType(left.productType) || isStrictType(right.productType);
}

function colorMatters(left: ProductType, right: ProductType) {
  return ["mobile_phone", "tablet", "laptop", "audio", "wearable", "phone_accessory", "tablet_accessory"].includes(left) ||
    ["mobile_phone", "tablet", "laptop", "audio", "wearable", "phone_accessory", "tablet_accessory"].includes(right);
}

function screenMatters(left: ProductType, right: ProductType) {
  return ["tablet", "laptop", "monitor", "television"].includes(left) || ["tablet", "laptop", "monitor", "television"].includes(right);
}

function strictCategoryConflict(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return (left === "mobiles" || left === "laptops" || right === "mobiles" || right === "laptops") && left !== right;
}

function autoMatchReadiness(left: ProductIdentity, right: ProductIdentity) {
  const missingAttributes: string[] = [];
  const reasons: string[] = [];
  let confidenceCap = 100;

  const requireBoth = (field: keyof ProductIdentity, label: string = String(field)) => {
    if (!left[field] || !right[field]) {
      missingAttributes.push(`${label} is required for auto matching.`);
      confidenceCap = Math.min(confidenceCap, 89);
    }
  };

  if (left.productType === "mobile_phone" || right.productType === "mobile_phone" || left.productType === "tablet" || right.productType === "tablet") {
    requireBoth("categorySlug", "category");
    requireBoth("brand");
    requireBoth("model", "model family");
    if (!phoneCanUseModelCodeInsteadOfStorage(left) && !phoneCanUseModelCodeInsteadOfStorage(right)) requireBoth("storage");
    if (phoneRamMattersForAuto(left, right)) requireBoth("ram");
    if (!sameKnown(left.sku, right.sku) && !sameKnown(left.modelCode, right.modelCode)) requireBoth("color");
  }

  if (left.productType === "laptop" || right.productType === "laptop") {
    requireBoth("categorySlug", "category");
    requireBoth("brand");
    const exactCode = sameKnown(left.sku, right.sku) || sameKnown(left.modelCode, right.modelCode);
    if (!exactCode) {
      requireBoth("model", "model family");
      requireBoth("cpu");
      requireBoth("ram");
      requireBoth("storage");
      if (!left.screenSize || !right.screenSize) {
        missingAttributes.push("screen size is missing in at least one laptop offer.");
        confidenceCap = Math.min(confidenceCap, 89);
      }
    }
  }

  if (missingAttributes.length) reasons.push("Strong identity fields are incomplete, so this stays below auto-merge confidence.");
  return { auto: confidenceCap >= AUTO_MATCH_CONFIDENCE, confidenceCap, missingAttributes, reasons };
}

function phoneRamMattersForAuto(left: ProductIdentity, right: ProductIdentity) {
  if (left.brand === "apple" || right.brand === "apple" || left.model?.startsWith("iphone_") || right.model?.startsWith("iphone_")) return false;
  return true;
}

function phoneCanUseModelCodeInsteadOfStorage(identity: ProductIdentity) {
  return Boolean(identity.model && /^(hmd|nokia|oukitel|sigma)_/.test(identity.model));
}

function exactIdentifierSpecConflictReview(left: ProductIdentity, right: ProductIdentity, hardMismatchReasons: string[]) {
  if (!hardMismatchReasons.length) return undefined;
  if (!(left.productType === "laptop" || right.productType === "laptop")) return undefined;
  if (!sameKnown(left.sku, right.sku) && !sameKnown(left.modelCode, right.modelCode)) return undefined;
  const specConflictOnly = hardMismatchReasons.every((reason) =>
    /^(CPU|GPU|RAM|Storage|Screen size|Color|SIM variant|SKU|Model code) differs/.test(reason),
  );
  if (!specConflictOnly) return undefined;
  return `Exact laptop identifier matched, but specs conflict and require review: ${hardMismatchReasons.join("; ")}`;
}

function sameKnown(left?: string | null, right?: string | null) {
  return Boolean(left && right && left === right);
}

function differentKnown(left?: string | null, right?: string | null) {
  return Boolean(left && right && left !== right);
}
