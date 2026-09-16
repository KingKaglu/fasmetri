/**
 * Cases for extractLaptopSku, from real laptop titles across all three shops.
 *
 * The pairs matter most: the same part number must survive every shop's
 * layout, because that is the whole point of matching on it.
 *
 *   npm run test:sku
 */
import { extractLaptopSku } from "../src/lib/laptopSku";

const CASES: ReadonlyArray<readonly [string, string | undefined]> = [
  // Same machine, three layouts, one code.
  ["ASUS TUF Gaming 16/FA608PM-RV041 Gray", "FA608PM-RV041"],
  ["Asus TUF A16 FA608PM-RV041, AMD Ryzen 9-8940HX, NVIDIA GeForce RTX", "FA608PM-RV041"],
  ["ASUS TUF Gaming A16 FA608PM-RV048", "FA608PM-RV048"],

  // Acer's dotted form.
  ["ACER Nitro V15/NH.QZ7ER.003", "NH.QZ7ER.003"],
  ["Acer Nitro 15 ANV15-52 NH.QZ7ER.003, Intel Core i7", "NH.QZ7ER.003"],
  ["ACER Aspire Go 14/NX.J4QER.001 Silver", "NX.J4QER.001"],

  // Other shapes.
  ["ASUS Zenbook 14 OLED/UX3405CA-QD1741W Silver", "UX3405CA-QD1741W"],
  ["Asus Vivobook S16 M3607HA-RP010, AMD Ryzen 7-260", "M3607HA-RP010"],
  ["LENOVO Legion 5 15AHP10/83M00042RK", "83M00042RK"],

  // The regional suffix is identity: these are different configurations.
  ["ASUS Vivobook Go 15//E1504FA-BQ521 Green", "E1504FA-BQ521"],
  ["Asus Vivobook Go 15 E1504FA-BQ2965 Silver", "E1504FA-BQ2965"],

  // Specs must never be read as a part number.
  ["Apple MacBook Air 15\" Sky Blue", undefined],
  ["HP Notebook OmniBook 5 Flip 14 Intel Core 7-150U", undefined],
  ["Asus ROG Strix G18 AMD Ryzen 9-9955HX 16C", undefined],
  ["", undefined],
];

let failed = 0;
for (const [title, expected] of CASES) {
  const actual = extractLaptopSku(title);
  if (actual !== expected) {
    failed += 1;
    console.log(`FAIL  ${title}\n      expected ${String(expected)}, got ${String(actual)}`);
  }
}

console.log(`${CASES.length - failed}/${CASES.length} laptop-SKU cases pass`);
if (failed) process.exitCode = 1;
