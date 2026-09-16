/**
 * Cases for extractScreenSizeFromTitle, all real EE laptop titles.
 *
 * The negatives matter more than the positives: a wrong screen size splits
 * laptops that genuinely match, which is worse than leaving the field empty.
 *
 *   npm run test:screen
 */
import { extractScreenSizeFromTitle } from "../src/lib/screenSize";

const CASES: ReadonlyArray<readonly [string, number | undefined]> = [
  // Explicit unit, including EE's missing space before the order code.
  ['APPLE MacBook Neo 13"MHFD4LL/A Citrus', 13],
  ['Apple MacBook Air 15" Sky Blue MDVQ4RU/A', 15],
  ['Apple MacBook Pro 16" Silver MGE44RU/A', 16],
  ["Lenovo IdeaPad 13.3 inch Cloud Grey", 13.3],

  // Bare number standing alone.
  ["ASUS TUF 16/FX607VJB-RL10316", 16],
  ["ACER Aspire Go 14/NX.J4QER.001 Silver", 14],
  ["ASUS Vivobook 15/X1504MA-BQ813W Quiet Blue", 15],
  ["Acer Nitro 16 (NH.QLKER.002)", 16],
  ["ASUS Notebook 90NR0L17-M00620 ROG Strix 16 / G614FM-TS147W", 16],

  // A series number is not a screen size; the size later in the title is.
  ["HP Notebook OmniBook 5 Flip 14/CV6X8EA", 14],
  ["Lenovo Legion 5 15AHP10/83M00042RK", undefined],

  // Digits fused to letters or inside model codes must never be read.
  ["ASUS TUF Gaming/FX607VU-RL046 Gray", undefined],
  ["Asus ROG Strix 16 G614FM-S5031, AMD Ryzen 9-9955HX", 16],
  ["ACER Nitro V15/NH.QNDER.003", undefined],
  ["HP Notebook BK9Z0EA OmniBook 5 AI / 16-af100", undefined],
  ["Apple MacBook Pro MDE14LL/A M5 Chip 10 CPU", undefined],

  // Nothing to find.
  ["ASUS Notebook 90NB1681-M00BY0 Vivobook S14", undefined],
  ["", undefined],
];

let failed = 0;
for (const [title, expected] of CASES) {
  const actual = extractScreenSizeFromTitle(title);
  if (actual !== expected) {
    failed += 1;
    console.log(`FAIL  ${title}\n      expected ${String(expected)}, got ${String(actual)}`);
  }
}

console.log(`${CASES.length - failed}/${CASES.length} screen-size cases pass`);
if (failed) process.exitCode = 1;
