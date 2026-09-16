/**
 * Pulls the manufacturer part number out of a laptop title.
 *
 * Every shop prints it, in its own layout:
 *
 *   Elite Electronics  ASUS TUF Gaming 16/FA608PM-RV041 Gray
 *   Zoommer            Asus TUF A16 FA608PM-RV041, AMD Ryzen 9-8940HX, NVIDIA...
 *   PCShop             ASUS TUF Gaming A16 FA608PM-RV048
 *
 * That code is the one thing the three shops already agree on. The marketing
 * names do not agree — the same Acer is "Aspire Lite 14" at one shop and
 * "Swift Lite 14" at another — and the specs alone cannot separate an Air 13
 * from an Air 15. Two offers carrying an identical part number are the same
 * machine, by definition, which makes this the strongest match signal
 * available for laptops.
 *
 * The regional suffix is part of the identity and is deliberately kept:
 * E1504FA-BQ521 and E1504FA-BQ2965 are different configurations of one
 * chassis, so matching on the base alone would merge machines that differ in
 * CPU, RAM or storage.
 */

/** ASUS/MSI/HP style: letters, digits, optional letters, dash, suffix. */
const DASHED = /\b([A-Z]{1,3}\d{3,5}[A-Z]{0,4}-[A-Z0-9]{3,8})\b/g;

/** Acer style: NX.J4QER.001, NH.QSGER.002. */
const DOTTED = /\b(N[XHQ]\.[A-Z0-9]{5,7}\.[0-9]{3})\b/g;

/** Lenovo style: 83M00042RK, 82XQ008PRK. */
const LENOVO = /\b(8[0-9][A-Z0-9]{6,9})\b/g;

/**
 * Fragments that match the dashed shape but are specifications, not part
 * numbers. A CPU or GPU string would otherwise be read as an identity and
 * merge every laptop that shares a processor.
 */
const NOT_A_SKU =
  /^(?:I[3579]-|RYZEN|RTX|GTX|DDR[45]?-|LPDDR|USB|HDMI|WIFI|IEEE|SSD|NVME|M2-|PCIE|TYPE-)/i;

function collect(title: string, pattern: RegExp, into: Set<string>) {
  for (const match of title.matchAll(pattern)) {
    const code = match[1];
    if (NOT_A_SKU.test(code)) continue;
    into.add(code);
  }
}

/**
 * Every part number the title contains, uppercased. A title can legitimately
 * carry more than one (a bundle naming both machine and accessory), so callers
 * decide what to do with several.
 */
export function extractLaptopSkus(title: string | null | undefined): string[] {
  if (!title) return [];
  const upper = title.toUpperCase();
  const found = new Set<string>();
  collect(upper, DOTTED, found);
  collect(upper, DASHED, found);
  collect(upper, LENOVO, found);
  return [...found];
}

/** The single most likely part number, or `undefined` when the title has none. */
export function extractLaptopSku(title: string | null | undefined): string | undefined {
  // Acer's dotted form is unambiguous, so it wins when present; otherwise take
  // the first, which is the machine's own code — accessories bundled into a
  // title are listed after it.
  const skus = extractLaptopSkus(title);
  return skus.find((sku) => sku.includes(".")) ?? skus[0];
}
