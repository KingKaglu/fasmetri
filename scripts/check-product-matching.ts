import assert from "node:assert/strict";
import { extractProductIdentity } from "../src/lib/productIdentity";
import { explainMatchDecision } from "../src/lib/productMatching";
import { extractVariantIdentity } from "../src/lib/variantMatching";
import { normalizeSafeOffer, scoreSafeMatch } from "../src/server/matching/safeProductMatcher";

type MatchCase = {
  label: string;
  left: string;
  right: string;
  categorySlug: string;
  rightCategorySlug?: string;
  expected: "CONFIRMED" | "REJECTED";
  expectedLeftKey?: string;
  expectedRightKey?: string;
};

const cases: MatchCase[] = [
  {
    label: "same iPhone across PCShop and Zoommer title styles",
    left: "Apple iPhone 17 Pro Max 12GB 256GB Cosmic Orange",
    right: "Apple iPhone 17 Pro Max e-SIM Only | 256GB Cosmic Orange მობილური ტელეფონი",
    categorySlug: "mobiles",
    expected: "CONFIRMED",
    expectedLeftKey: "apple|iphone_17_pro_max|256gb|cosmic_orange",
    expectedRightKey: "apple|iphone_17_pro_max|256gb|cosmic_orange",
  },
  {
    label: "same iPhone with optional eSIM wording",
    left: "Apple iPhone 17 Pro Max 256GB Cosmic Orange",
    right: "iPhone 17 Pro Max 256GB Cosmic Orange eSIM",
    categorySlug: "mobiles",
    expected: "CONFIRMED",
  },
  {
    label: "same Xiaomi/Redmi 14C with shop wording differences",
    left: "Xiaomi 14C 6GB/128GB Purple",
    right: "Xiaomi Redmi 14C Dual Sim 6GB RAM 128GB LTE Global Version Purple",
    categorySlug: "mobiles",
    expected: "CONFIRMED",
    expectedLeftKey: "xiaomi|redmi_14c|6gb|128gb|purple",
    expectedRightKey: "xiaomi|redmi_14c|6gb|128gb|purple",
  },
  {
    label: "same Xiaomi/Redmi 14C with Georgian category words",
    left: "Xiaomi Redmi 14C 6/128GB Purple",
    right: "მობილური ტელეფონი XIAOMI REDMI 14C 6/128GB PURPLE",
    categorySlug: "mobiles",
    expected: "CONFIRMED",
  },
  {
    label: "same Honor phone with title decoration omitted",
    left: "HONOR 600 12GB 256GB Black",
    right: "Honor 600 12/256GB Black მობილური ტელეფონი",
    categorySlug: "mobiles",
    expected: "CONFIRMED",
  },
  {
    label: "iPhone Pro and Pro Max remain different",
    left: "Apple iPhone 17 Pro Max 256GB Cosmic Orange",
    right: "Apple iPhone 17 Pro 256GB Cosmic Orange",
    categorySlug: "mobiles",
    expected: "REJECTED",
  },
  {
    label: "iPhone storage variants remain different",
    left: "Apple iPhone 17 Pro Max 256GB Cosmic Orange",
    right: "Apple iPhone 17 Pro Max 512GB Cosmic Orange",
    categorySlug: "mobiles",
    expected: "REJECTED",
  },
  {
    label: "Android RAM/storage variants remain different",
    left: "Xiaomi Redmi 14C 6/128GB Purple",
    right: "Xiaomi Redmi 14C 8/256GB Purple",
    categorySlug: "mobiles",
    expected: "REJECTED",
  },
  {
    label: "Samsung Ultra and regular remain different",
    left: "Samsung Galaxy S26 Ultra 256GB",
    right: "Samsung Galaxy S26 256GB",
    categorySlug: "mobiles",
    expected: "REJECTED",
  },
  {
    label: "Dell SKU and hardware variants remain different",
    left: "Dell Pro 15 Essential RPLU_002_M_UBUNTU i7-1355U 16GB RAM SSD 512GB",
    right: "Dell Pro 15 Essential RPLU_004_P_UBU Core 3 100U 8GB RAM SSD 512GB",
    categorySlug: "laptops",
    expected: "REJECTED",
  },
  {
    label: "HP OmniBook and MSI Modern with same CPU/RAM/SSD remain different",
    left: "HP OmniBook 5 Flip x360 BY9H2EA, Intel core 5-120U, Intel UHD Graphics, 16GB RAM SSD 512GB, Free Dos, ლეპტოპი",
    right: "MSI Modern 15 9S7-15S112-1007, Intel Core 5-120U, Intel UHD Graphics, 16GB RAM SSD 512GB, Free Dos, ლეპტოპი",
    categorySlug: "laptops",
    expected: "REJECTED",
  },
  {
    label: "MacBook chip and memory variants remain different",
    left: "Apple MacBook Pro 14 M5 Pro 24GB RAM 2TB Silver",
    right: "Apple MacBook Pro 14 M5 Max 36GB RAM 2TB Space Black",
    categorySlug: "laptops",
    expected: "REJECTED",
  },
  {
    label: "Redmi Buds must not match Redmi phone",
    left: "Redmi Buds 6 Active Black",
    right: "Xiaomi Redmi 14C 6/128GB Black",
    categorySlug: "audio",
    expected: "REJECTED",
  },
  {
    label: "phone case must not match phone",
    left: "Spigen Samsung Galaxy S26 Ultra Case Black",
    right: "Samsung Galaxy S26 Ultra 256GB Black",
    categorySlug: "phone-accessories",
    rightCategorySlug: "mobiles",
    expected: "REJECTED",
  },
];

for (const testCase of cases) {
  const left = extractProductIdentity({ title: testCase.left, categorySlug: testCase.categorySlug });
  const right = extractProductIdentity({ title: testCase.right, categorySlug: testCase.rightCategorySlug ?? testCase.categorySlug });
  const decision = explainMatchDecision(left, right);
  assert.equal(
    decision.status,
    testCase.expected,
    `${testCase.label}: expected ${testCase.expected}, received ${decision.status} (${decision.confidence}) ${decision.hardMismatchReasons.join("; ")}`,
  );
  if (testCase.expectedLeftKey) assert.equal(left.canonicalKey, testCase.expectedLeftKey, `${testCase.label}: left key`);
  if (testCase.expectedRightKey) assert.equal(right.canonicalKey, testCase.expectedRightKey, `${testCase.label}: right key`);
  console.log(`${testCase.expected === "CONFIRMED" ? "MATCH" : "REJECT"} ${testCase.label}: ${decision.confidence}%`);
}

console.log(`Verified ${cases.length} structured product matching cases.`);

// ---------------------------------------------------------------------------
// Television variant keys (src/lib/variantMatching.ts). A television's parent
// key is brand + model code + screen size, so a title whose diagonal does not
// parse produces NO key and the offer can never be compared across shops.
// Georgian shops write the diagonal five different ways, and TechnoBoom states
// the model outright because codes like "32BS8000" are filtered out of
// `modelCodes()` as CPU/GPU lookalikes.
// ---------------------------------------------------------------------------

type TelevisionCase = {
  label: string;
  input: { title: string; brand?: string; model?: string; description?: string };
  expectedParentKey: string;
};

const televisionCases: TelevisionCase[] = [
  {
    label: "diagonal written with a straight quote",
    input: { title: 'ტელევიზორი LG 55UT80006LA 55" 4K Smart' },
    expectedParentKey: "lg|55ut80006la|55in",
  },
  {
    label: "diagonal written with two apostrophes",
    input: { title: "ტელევიზორი Samsung UE55DU7100UXRU 55'' 4K UHD Smart TV" },
    expectedParentKey: "samsung|ue55du7100uxru|55in",
  },
  {
    label: "diagonal written with a double prime",
    input: { title: "TV Hisense 55A6K 55″ UHD" },
    expectedParentKey: "hisense|55a6k|55in",
  },
  {
    label: "diagonal written with a curly quote",
    input: { title: "ტელევიზორი Samsung UE43DU7100UXRU 43”" },
    expectedParentKey: "samsung|ue43du7100uxru|43in",
  },
  {
    label: "diagonal spelled out",
    input: { title: "ტელევიზორი Samsung UE43DU7100UXRU 43 inch" },
    expectedParentKey: "samsung|ue43du7100uxru|43in",
  },
  {
    label: "model code ending in digits comes from the stated model (TechnoBoom)",
    input: { title: "ტელევიზორი BBS 32BS8000", brand: "BBS", model: "32BS8000", description: "32 inch | დიაგონალი: 32''" },
    expectedParentKey: "bbs|32bs8000|32in",
  },
  {
    // Zoommer never writes the diagonal: "LG TV 50UA75009LA Black" carries it
    // only inside the model code. Without inference these have no parent key,
    // so no Zoommer television could ever match another shop's.
    label: "diagonal inferred from a model code that leads with it",
    input: { title: "LG TV 50UA75009LA Black" },
    expectedParentKey: "lg|50ua75009la|50in",
  },
  {
    label: "diagonal inferred from a model code behind a separator (Sony)",
    input: { title: "Sony TV K-55XR50 Black" },
    expectedParentKey: "sony|k_55xr50|55in",
  },
  {
    label: "diagonal inferred from a short model code (TCL)",
    input: { title: "TCL TV 65V6D Black" },
    expectedParentKey: "tcl|65v6d|65in",
  },
  {
    label: "spec sheet must not hand the refresh rate over as a model code",
    input: {
      title: "ტელევიზორი HYUNDAI 65HY9909WOS",
      brand: "HYUNDAI",
      model: "65HY9909WOS",
      description: "65 inch | განახლების სიხშირე: 60 HZ | ეკრანის გაფართოება: 3840 x 2160",
    },
    expectedParentKey: "hyundai|65hy9909wos|65in",
  },
];

for (const testCase of televisionCases) {
  const identity = extractVariantIdentity({ ...testCase.input, categorySlug: "televisions" });
  assert.equal(
    identity.canonicalParentKey,
    testCase.expectedParentKey,
    `${testCase.label}: expected parent key ${testCase.expectedParentKey}, received ${identity.canonicalParentKey}`,
  );
  console.log(`TV KEY ${testCase.label}: ${identity.canonicalParentKey}`);
}

console.log(`Verified ${televisionCases.length} television variant-key cases.`);

// ---------------------------------------------------------------------------
// Safe cross-store matcher cases (src/server/matching/safeProductMatcher.ts) —
// this is the code path npm run match:phones / match:laptops actually uses.
// Regression guards for the v2 fixes: RAM=1 noise, SIM demotion, exactKey.
// ---------------------------------------------------------------------------

type SafeCase = {
  label: string;
  left: string;
  right: string;
  categorySlug: string;
  expectAutoOrReview?: boolean; // true => band AUTO|REVIEW (same product); false => not auto-linked
  expectRejected?: boolean;
  expectBandBelow?: number; // confidence must stay under this (auto-triage approves at ≥85)
  // assertions on the LEFT identity itself
  expectLeftRam?: number | undefined;
  expectLeftKeyEquals?: string;
  expectKeysEqual?: boolean; // left.exactKey === right.exactKey
  // Override the RIGHT identity after normalization to mimic a stored (corrupt)
  // canonical specsJson that no title would produce (e.g. legacy RAM=1).
  mutateRight?: (id: ReturnType<typeof normalizeSafeOffer>) => void;
};

const safeCases: SafeCase[] = [
  {
    // Stage 1: RAM=1 noise must never become a RAM signal (1+256 promo wording).
    label: "RAM=1 noise dropped (ZTE Nubia V70 1+256GB)",
    left: "ZTE Nubia V70 1+256GB Black",
    right: "ZTE Nubia V70 1+256GB Black",
    categorySlug: "mobiles",
    expectLeftRam: undefined,
    expectLeftKeyEquals: "phone|zte|nubia_v70|256|black",
    expectKeysEqual: true,
    expectAutoOrReview: true,
  },
  {
    // Stage 1: "1/256" promo wording must not parse as 1GB RAM.
    label: "RAM=1 noise dropped (Poco C75 1/256GB)",
    left: "Xiaomi Poco C75 1/256GB Black",
    right: "Xiaomi Poco C75 1/256GB Black",
    categorySlug: "mobiles",
    expectLeftRam: undefined,
    expectAutoOrReview: true,
  },
  {
    // Stage 1: a genuine RAM is still parsed correctly (no over-correction).
    label: "RAM correctly parsed (Honor 400 8/256GB)",
    left: "HONOR 400 8GB/256GB Black",
    right: "HONOR 400 8/256GB Black",
    categorySlug: "mobiles",
    expectLeftRam: 8,
    expectKeysEqual: true,
    expectAutoOrReview: true,
  },
  {
    // Stage 2: eSIM-only vs plain are the same product (SIM not in key, not a hard conflict).
    label: "iPhone 17e e-SIM Only == plain iPhone 17e",
    left: "Apple iPhone 17e 256GB Black",
    right: "Apple iPhone 17e e-SIM Only | 256GB Black",
    categorySlug: "mobiles",
    expectKeysEqual: true,
    expectAutoOrReview: true,
  },
  {
    // Stage 2: differing SIM types still link (dual vs physical = descriptive packaging).
    label: "Samsung dual-sim vs physical-sim same phone still links",
    left: "Samsung Galaxy A26 Dual Sim 128GB Black",
    right: "Samsung Galaxy A26 Nano Sim 128GB Black",
    categorySlug: "mobiles",
    expectKeysEqual: true,
    expectAutoOrReview: true,
  },
  {
    // Safety: genuinely different colors must NOT merge (over-merge guard kept).
    label: "different colors stay rejected (over-merge guard)",
    left: "Apple iPhone 17 Pro Max 256GB Cosmic Orange",
    right: "Apple iPhone 17 Pro Max 256GB Blue",
    categorySlug: "mobiles",
    expectRejected: true,
  },
  {
    // Safety: different storage must still hard-reject.
    label: "different storage stays rejected (over-merge guard)",
    left: "Samsung Galaxy S26 Ultra 256GB Black",
    right: "Samsung Galaxy S26 Ultra 512GB Black",
    categorySlug: "mobiles",
    expectRejected: true,
  },
  {
    // Stale-link guard: a real 8GB offer must HARD-REJECT a corrupt RAM=1 canonical
    // (legacy "…|1|…" specsJson — a value no title produces, since RAM=1 wording is
    // dropped as noise). scoreSafeMatch must REJECT it so match-products flags the
    // stale wrong-RAM auto-link and re-homes the offer instead of leaving it linked.
    label: "8GB offer rejects corrupt RAM=1 canonical (stale-link guard)",
    left: "Samsung Galaxy A26 8GB/256GB Black",
    right: "Samsung Galaxy A26 8GB/256GB Black",
    categorySlug: "mobiles",
    mutateRight: (id) => {
      if (id) id.ramGb = 1;
    },
    expectRejected: true,
  },
  {
    // The fallback model parser took the two words after the brand, so two
    // different Redmagic phones 1200 GEL apart both became zte_nubia_redmagic
    // and scored 80% — which the old auto-triage merged.
    label: "Redmagic 11s Pro != Redmagic 10 Air",
    left: "ZTE Nubia Redmagic 11s Pro 5G 12/256 GB Nightfreeze",
    right: "ZTE Nubia Redmagic 10 Air 5G 12/256GB Twilight",
    categorySlug: "mobiles",
    expectRejected: true,
  },
  {
    // Same model through the same fallback still links (no over-correction).
    label: "Redmagic 10 Air links to itself across title styles",
    left: "ZTE Nubia Redmagic 10 Air 5G 12/256GB Twilight",
    right: "Nubia Redmagic 10 Air 12/256GB",
    categorySlug: "mobiles",
    expectAutoOrReview: true,
  },
  {
    // A qualifier behind the number is part of the model, not noise.
    label: "Oukitel WP30 Pro != Oukitel WP30",
    left: "Oukitel WP30 Pro 5G 12/512GB Black",
    right: "Oukitel WP30 5G 12/512GB Black",
    categorySlug: "mobiles",
    expectRejected: true,
  },
  {
    // The screenshot case: a collab edition controller scored 84% against a
    // plain coloured one (family 60 + accessoryModel 30, capped for an unknown
    // colour) and auto-triage merged them. A named edition on one side only is
    // a different SKU.
    label: "Genshin Impact DualSense != plain DualSense Red",
    left: "Playstation DualSense PS5 Wireless Controller Genshin Impact Limited Edition / PS5 /KIA",
    right: "Sony PS5 Dualsense Red",
    categorySlug: "gaming",
    expectRejected: true,
  },
  {
    // Same guard, generic wording and no colour on either side.
    label: "Limited Edition DualSense != standard DualSense",
    left: "Sony DualSense Wireless Controller Limited Edition",
    right: "Sony PS5 DualSense Wireless Controller",
    categorySlug: "gaming",
    expectRejected: true,
  },
  {
    // Two shops listing the SAME collab edition must still link.
    label: "same collab edition links across shops",
    left: "Playstation DualSense PS5 Wireless Controller Genshin Impact Limited Edition",
    right: "Sony PS5 DualSense Genshin Impact Controller",
    categorySlug: "gaming",
    expectKeysEqual: true,
    expectAutoOrReview: true,
  },
  {
    // Colour is the accessory SKU: an unnamed colour must not clear the
    // auto-triage bar. WEAK = offered as similar, never merged.
    label: "accessory with unknown colour stays below auto-triage",
    left: "Sony PS5 DualSense Wireless Controller",
    right: "Sony PS5 Dualsense Red",
    categorySlug: "gaming",
    expectBandBelow: 70,
  },
  {
    // No over-correction: two plain controllers in the same named colour link.
    label: "same colour DualSense still links across shops",
    left: "Sony PS5 DualSense Wireless Controller White",
    right: "Sony PlayStation 5 Dualsense Controller White",
    categorySlug: "gaming",
    expectKeysEqual: true,
    expectAutoOrReview: true,
  },
  {
    // Different named colours were already a hard conflict — keep it that way.
    label: "different accessory colours stay rejected",
    left: "Sony PS5 DualSense Wireless Controller Black",
    right: "Sony PS5 Dualsense Red",
    categorySlug: "gaming",
    expectRejected: true,
  },
];

for (const testCase of safeCases) {
  const left = normalizeSafeOffer({ title: testCase.left, categorySlug: testCase.categorySlug });
  const right = normalizeSafeOffer({ title: testCase.right, categorySlug: testCase.categorySlug });
  assert.ok(left, `${testCase.label}: left identity should normalize`);
  assert.ok(right, `${testCase.label}: right identity should normalize`);

  if ("expectLeftRam" in testCase) {
    assert.equal(left!.ramGb, testCase.expectLeftRam, `${testCase.label}: left ram`);
  }
  if (testCase.expectLeftKeyEquals) {
    assert.equal(left!.exactKey, testCase.expectLeftKeyEquals, `${testCase.label}: left exactKey`);
  }
  if (testCase.expectKeysEqual) {
    assert.equal(left!.exactKey, right!.exactKey, `${testCase.label}: exactKeys should be equal`);
  }

  if (testCase.mutateRight) testCase.mutateRight(right);

  const decision = scoreSafeMatch(left!, right!);
  if (testCase.expectRejected) {
    assert.equal(decision.band, "REJECTED", `${testCase.label}: expected REJECTED, got ${decision.band} (${decision.confidence}) ${decision.reason}`);
  }
  if (testCase.expectBandBelow !== undefined) {
    assert.ok(
      decision.confidence < testCase.expectBandBelow,
      `${testCase.label}: expected confidence < ${testCase.expectBandBelow}, got ${decision.confidence} (${decision.band}) ${decision.reason}`,
    );
  }
  if (testCase.expectAutoOrReview) {
    assert.ok(
      decision.band === "AUTO" || decision.band === "REVIEW",
      `${testCase.label}: expected AUTO/REVIEW same-product, got ${decision.band} (${decision.confidence}) ${decision.reason}`,
    );
  }
  console.log(`${decision.band} ${testCase.label}: ${decision.confidence}%`);
}

console.log(`Verified ${safeCases.length} safe cross-store matcher cases.`);
