/**
 * Recovers a laptop's screen size from its title.
 *
 * Screen size is the field that separates laptops which are otherwise
 * identical on paper. These three pairs share brand, CPU, RAM and storage, and
 * merging either of them would put two different machines on one price page:
 *
 *   apple | m5 | 16 | 1024            -> MacBook Air 13"  vs  MacBook Pro 14"
 *   apple | m5 | 16 | 512             -> MacBook Air 13"  vs  MacBook Air 15"
 *   asus  | ryzen 9 9955hx | 32 | 1024 -> ROG Strix 16    vs  ROG Strix G18
 *
 * EE publishes a Screen Size spec on only 18% of its live laptops but prints
 * the number in the title of far more of them, so the matcher was refusing
 * correct merges for want of a number that was sitting in plain sight.
 *
 * The parsing has to be conservative, because laptop titles are full of digits
 * that are not screen sizes: series numbers ("OmniBook 5"), order codes
 * ("90NR0L17"), and model numbers with the size fused to letters ("X1504MA",
 * "AG15-32P"). A wrong size is worse than none — it would split machines that
 * genuinely match — so only two shapes are accepted.
 */

/** Laptop panels outside this range do not exist in the catalogue. */
const MIN_INCHES = 10;
const MAX_INCHES = 18;

/**
 * Shape 1: the number carries an explicit unit — `15"`, `13.3 inch`, `16”`.
 * Unambiguous, so it is allowed to touch the surrounding text: EE writes
 * `MacBook Neo 13"MHFD4LL/A` with no space before the order code.
 */
const WITH_UNIT = /(?<![\d.])(\d{2}(?:\.\d)?)\s*(?:"|''|”|″|inch(?:es)?|დიუმი)/iu;

/**
 * Shape 2: a bare number standing on its own — `Nitro 16 (NH.QLKER.002)`,
 * `TUF 16/FX607VJB`, `ROG Strix 16 / G614FM`.
 *
 * It must not be welded to letters or digits on either side, which is what
 * rules out `90NR0L17`, `X1504MA`, `AG15-32P` and `RL10316`. A hyphen counts
 * as part of a model code here, so `G614FM-S5031` cannot contribute either.
 */
const BARE = /(?<![\w.\-])(\d{2}(?:\.\d)?)(?![\w.\-])/gu;

/**
 * Words that identify a bare number as measuring something other than the
 * panel. "Apple MacBook Pro MDE14LL/A M5 Chip 10 CPU" offers a standalone 10
 * that is a core count, and reading it as a 10-inch screen would split every
 * MacBook Pro away from its twin in the other shop.
 */
const NON_SCREEN_UNIT = /^\s*(?:c|core|cores|cpu|gpu|gb|tb|mb|hz|w|wh|mah|mp|nm|bit|bits|thread|threads|cell|cells|kg|mm|%)\b/iu;

function inRange(value: number) {
  return Number.isFinite(value) && value >= MIN_INCHES && value <= MAX_INCHES;
}

/**
 * Returns the screen size in inches, or `undefined` when the title does not
 * state one clearly. `undefined` is the correct answer far more often than a
 * guess would be.
 */
export function extractScreenSizeFromTitle(title: string | null | undefined): number | undefined {
  if (!title) return undefined;

  const unit = title.match(WITH_UNIT);
  if (unit) {
    const value = Number(unit[1]);
    if (inRange(value)) return value;
  }

  // Among bare candidates take the first plausible one: titles read
  // "<series> <size>/<code>", so the size follows the series number that the
  // range check has already discarded.
  for (const match of title.matchAll(BARE)) {
    const value = Number(match[1]);
    if (!inRange(value)) continue;
    const rest = title.slice(match.index + match[0].length);
    if (NON_SCREEN_UNIT.test(rest)) continue;
    return value;
  }

  return undefined;
}
