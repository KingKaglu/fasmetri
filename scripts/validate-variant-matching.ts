import { categorizeProduct } from "../src/lib/categorizeProduct";
import { extractVariantIdentity, compareVariantIdentities } from "../src/lib/variantMatching";

type Case = {
  name: string;
  left: string;
  right: string;
  leftCategory: string;
  rightCategory?: string;
  expected: "SAME_VARIANT" | "SAME_PARENT_DIFFERENT_VARIANT" | "REJECTED";
};

const cases: Case[] = [
  {
    name: "iPhone title wording still resolves to the same exact color/storage variant",
    left: "Apple iPhone 17 Pro Max 12GB 256GB Cosmic Orange",
    right: "Apple iPhone 17 Pro Max e-SIM Only | 256GB Cosmic Orange მობილური ტელეფონი",
    leftCategory: "mobiles",
    expected: "SAME_VARIANT",
  },
  {
    name: "same Samsung model/storage with different color is same parent but separate variant",
    left: "Samsung Galaxy A07 4GB/64GB Green",
    right: "Samsung Galaxy A07 4GB/64GB Violet",
    leftCategory: "mobiles",
    expected: "SAME_PARENT_DIFFERENT_VARIANT",
  },
  {
    name: "different Xiaomi storage must stay separate",
    left: "Xiaomi Redmi 14C 6/128 Purple",
    right: "Xiaomi Redmi 14C 8/256 Purple",
    leftCategory: "mobiles",
    expected: "REJECTED",
  },
  {
    name: "different brands and product types are rejected",
    left: "Xiaomi Redmi Note 14 Pro 8/256 Black",
    right: "Beelink MINI S12 Intel N95 8/256",
    leftCategory: "mobiles",
    rightCategory: "computers",
    expected: "REJECTED",
  },
  {
    name: "Dell laptop CPU/RAM variants are rejected",
    left: "Dell Pro 15 Essential RPLU_002_M_UBUNTU i7-1355U 16GB 512GB",
    right: "Dell Pro 15 Essential RPLU_004_P_UBU Core 3 100U 8GB 512GB",
    leftCategory: "laptops",
    expected: "REJECTED",
  },
  {
    name: "MacBook chip variants are rejected",
    left: "MacBook Pro 14 M5 Pro 24GB 2TB Silver",
    right: "MacBook Pro 14 M5 Max 36GB 2TB Space Black",
    leftCategory: "laptops",
    expected: "REJECTED",
  },
];

const categoryCases = [
  ["Hair dryer 2000W", "small-appliances"],
  ["Redmi Buds 6 Active", "audio"],
  ["Monitor Samsung Odyssey 27 inch", "monitors"],
  ["Pet leash nylon", "pets"],
  ["Turntable Audio-Technica", "audio"],
  ["Toy car remote control", "kids"],
  ["Soundcore Sport X20 Earbuds", "audio"],
] as const;

let failed = 0;

for (const item of cases) {
  const left = extractVariantIdentity({ title: item.left, categorySlug: item.leftCategory });
  const right = extractVariantIdentity({ title: item.right, categorySlug: item.rightCategory ?? item.leftCategory });
  const decision = compareVariantIdentities(left, right);
  if (decision.status !== item.expected) {
    failed += 1;
    console.error(`FAIL ${item.name}: expected ${item.expected}, got ${decision.status}`);
    console.error(decision);
  } else {
    console.log(`PASS ${item.name}: ${decision.status}`);
  }
}

for (const [title, expected] of categoryCases) {
  const decision = categorizeProduct({ title });
  if (decision.publicCategorySlug !== expected) {
    failed += 1;
    console.error(`FAIL category ${title}: expected ${expected}, got ${decision.publicCategorySlug}`);
  } else {
    console.log(`PASS category ${title}: ${expected}`);
  }
}

if (failed) process.exit(1);
console.log("Variant matching/category validation passed.");
