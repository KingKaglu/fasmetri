import assert from "node:assert/strict";
import { extractProductIdentity } from "../src/lib/productIdentity";
import { explainMatchDecision } from "../src/lib/productMatching";

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
