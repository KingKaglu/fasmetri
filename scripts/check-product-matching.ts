import assert from "node:assert/strict";
import { extractProductIdentity } from "../src/lib/productIdentity";
import { explainMatchDecision } from "../src/lib/productMatching";
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
  if (testCase.expectAutoOrReview) {
    assert.ok(
      decision.band === "AUTO" || decision.band === "REVIEW",
      `${testCase.label}: expected AUTO/REVIEW same-product, got ${decision.band} (${decision.confidence}) ${decision.reason}`,
    );
  }
  console.log(`${decision.band} ${testCase.label}: ${decision.confidence}%`);
}

console.log(`Verified ${safeCases.length} safe cross-store matcher cases.`);
