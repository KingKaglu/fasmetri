import assert from "node:assert/strict";
import { extractProductAttributes } from "../src/lib/productNormalization";

// Colour is a hard mismatch in the matcher: a wrong colour rejects an offer
// against the very same phone in another store. Substring matching used to read
// the colour out of the model name, so these titles are pinned.

const color = (title: string) => extractProductAttributes({ title }).color;

const cases: Array<[string, string | undefined]> = [
  // The bug that started this: "Redmi" is a product line, not the colour red.
  ["Xiaomi Redmi Note 15 Pro 8GB/256GB Titanium", undefined],
  ["Xiaomi Redmi Note 15 Pro 8GB 256GB NFC Blue", "blue"],
  ["XIAOMI Redmi Note 15 Pro 12GB/512GB Blue", "blue"],
  ["Xiaomi Redmi 15 8GB 128GB Grey", "gray"],
  ["Xiaomi Redmi 15 8GB 128GB Black", "black"],
  ["Xiaomi Redmi 15C 8GB 256GB Moonlight Blue", "blue"],
  // "Titanium" alone is not "tan"; the real titanium colourways still resolve.
  ["Apple iPhone 17 Pro 256GB Black Titanium", "black_titanium"],
  ["Apple iPhone 17 Pro 256GB Natural Titanium", "natural_titanium"],
  // "Stealth" is an MSI laptop line, not teal.
  ["MSI Stealth 16 AI Studio i9 RTX 4080 32GB 1TB", undefined],
  ["MSI Stealth 16 AI Studio Black", "black"],
  // A spec word that merely contains a colour must not become one.
  ["Samsung Galaxy Buds 3 Pro Bluetooth 5.4", undefined],
  // Glued colourways the way Zoommer writes them must still resolve, and must
  // resolve the SAME as the spaced spelling another store uses.
  ["Samsung S931B/DS Galaxy S25 12/128GB CoralRed", color("Samsung Galaxy S25 12/128GB Coral Red")],
  ["Samsung S931B/DS Galaxy S25 12/128GB PinkGold", color("Samsung Galaxy S25 12/128GB Pink Gold")],
  // Ordinary colours keep working.
  ["Apple iPhone 17 128GB Cosmic Orange", "cosmic_orange"],
  ["Samsung Galaxy A17 A175F/DS LTE 6/128GB Grey", "gray"],
  ["Apple MacBook Air 13 M5 16GB 512GB Space Gray", "space_gray"],
  ["HONOR X8d 8GB 128GB Light Blue", "blue"],
  ["Nothing Phone 3a Lite 5G 8/256GB Black", "black"],
];

let failed = 0;
for (const [title, expected] of cases) {
  const actual = color(title);
  try {
    assert.equal(actual, expected);
  } catch {
    failed += 1;
    console.error(`FAIL ${title}\n  expected ${String(expected)}, got ${String(actual)}`);
  }
}

// Cross-store pairs that a bad colour read would have split apart.
const samePairs: Array<[string, string]> = [
  ["Xiaomi Redmi Note 15 Pro 8GB/256GB Blue", "XIAOMI Redmi Note 15 Pro 8GB 256GB NFC Blue"],
  ["Xiaomi Redmi 15 8GB 128GB Grey", "Xiaomi Redmi 15 8GB 128GB Gray"],
];
for (const [left, right] of samePairs) {
  if (color(left) !== color(right)) {
    failed += 1;
    console.error(`FAIL cross-store colour split: "${left}" (${color(left)}) vs "${right}" (${color(right)})`);
  }
}

if (failed) {
  console.error(`\ncolor extraction: ${failed} failing case(s)`);
  process.exit(1);
}
console.log(`color extraction: ${cases.length + samePairs.length}/${cases.length + samePairs.length} checks passed`);
