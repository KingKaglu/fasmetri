/**
 * Guards the rule that decides when a Zoommer detail page must be re-read for
 * stock. Getting this wrong is expensive in both directions: too strict and the
 * catalogue shows a stocked store as sold out, too loose and every price run
 * re-fetches several hundred detail pages.
 */
import { STOCK_MAX_AGE_MS, stockNeedsRefresh } from "../src/lib/stockRefresh";

const NOW = Date.parse("2026-09-18T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

type Case = {
  name: string;
  availability: string | null | undefined;
  stockCheckedAt: string | null | undefined;
  expected: boolean;
};

const cases: Case[] = [
  { name: "never resolved", availability: "UNKNOWN", stockCheckedAt: null, expected: true },
  { name: "unknown even with a fresh timestamp", availability: "UNKNOWN", stockCheckedAt: ago(60_000), expected: true },
  { name: "missing availability", availability: undefined, stockCheckedAt: ago(60_000), expected: true },
  { name: "in stock, just checked", availability: "IN_STOCK", stockCheckedAt: ago(60_000), expected: false },
  { name: "in stock, checked an hour ago", availability: "IN_STOCK", stockCheckedAt: ago(60 * 60_000), expected: false },
  { name: "out of stock, just checked", availability: "OUT_OF_STOCK", stockCheckedAt: ago(60_000), expected: false },
  { name: "in stock but never timestamped", availability: "IN_STOCK", stockCheckedAt: null, expected: true },
  { name: "in stock with a corrupt timestamp", availability: "IN_STOCK", stockCheckedAt: "not-a-date", expected: true },
  { name: "one second inside the window", availability: "IN_STOCK", stockCheckedAt: ago(STOCK_MAX_AGE_MS - 1_000), expected: false },
  { name: "one second past the window", availability: "IN_STOCK", stockCheckedAt: ago(STOCK_MAX_AGE_MS + 1_000), expected: true },
  { name: "out of stock, a day old", availability: "OUT_OF_STOCK", stockCheckedAt: ago(24 * 60 * 60_000), expected: true },
  { name: "timestamp from the future is still trusted", availability: "IN_STOCK", stockCheckedAt: ago(-60_000), expected: false },
];

let failures = 0;
for (const testCase of cases) {
  const actual = stockNeedsRefresh(testCase.availability, testCase.stockCheckedAt, NOW);
  if (actual !== testCase.expected) {
    failures += 1;
    console.error(`FAIL ${testCase.name}: expected ${testCase.expected}, got ${actual}`);
  }
}

if (failures) {
  console.error(`\n${failures}/${cases.length} stock-refresh cases failed`);
  process.exit(1);
}
console.log(`${cases.length}/${cases.length} stock-refresh cases pass`);
