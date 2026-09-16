/**
 * Cases for phoneModelTier, taken from model strings actually stored on
 * RawOffer. The Fold and POCO rows are the regression: their tier sits in the
 * middle of the string with the SKU on the end, so the old terminal-suffix
 * check saw no tier and merged two different phones into one price page.
 *
 *   npm run test:tiers
 */
import { phoneModelTier } from "../src/server/matching/safeProductMatcher";

const CASES: ReadonlyArray<readonly [string | undefined, string | undefined]> = [
  // The bug: tier in the middle, SKU at the end.
  ["samsung galaxy fold 8 ultra f976 5g", "ultra"],
  ["samsung galaxy fold 8 ultra sm f976bzkncau", "ultra"],
  ["samsung galaxy fold 8 f971 5g", undefined],
  ["samsung galaxy fold 8 sm f971bzkbcau", undefined],
  ["xiaomi poco x8 pro max", "pro_max"],
  ["xiaomi poco x8 pro 5g", "pro"],

  // Compound tiers must never read as the bare word.
  ["apple iphone 17 pro max", "pro_max"],
  ["apple iphone 17 pro", "pro"],
  ["apple iphone 17", undefined],
  ["samsung galaxy s26 ultra", "ultra"],
  ["samsung galaxy s26 plus", "plus"],
  ["samsung galaxy s26", undefined],
  ["samsung galaxy s25 fe", "fe"],
  ["apple iphone se", "se"],

  // Nothing to read.
  [undefined, undefined],
  ["", undefined],
];

let failed = 0;
for (const [model, expected] of CASES) {
  const actual = phoneModelTier(model);
  if (actual !== expected) {
    failed += 1;
    console.log(`FAIL  ${String(model)}\n      expected ${String(expected)}, got ${String(actual)}`);
  }
}

console.log(`${CASES.length - failed}/${CASES.length} phone-tier cases pass`);
if (failed) process.exitCode = 1;
