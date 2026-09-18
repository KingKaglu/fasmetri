// Golden check for the per-shop offer dedupe (src/lib/catalog.ts).
//
// A product record holds every offer a shop has for it — colour variants,
// superseded SKUs, rejected matches. The catalogue shows one price per shop,
// and the row it picks decides whether the product is visible at all: pick a
// rejected row and the public filter drops it, leaving a product with zero
// offers, a 404 page and a sitemap entry pointing at nothing. This locks the
// rule in: cheapest *displayable* row per shop, everything else falls back to
// cheapest so the admin views still see something.
//
// Run: npm run test:dedupe
import { selectShopOffers } from "@/lib/catalog";
import { OfferView } from "@/lib/catalog-types";

type OfferSeed = {
  id: string;
  shop: string;
  price: number;
  matchStatus?: string;
  verificationStatus?: string;
  matchConfidence?: number | null;
  url?: string;
};

function offer(seed: OfferSeed): OfferView {
  return {
    id: seed.id,
    shop: {
      id: seed.shop,
      slug: seed.shop,
      name: seed.shop,
      baseUrl: `https://${seed.shop}.ge`,
      enabled: true,
      needsConfiguration: false,
    },
    url: seed.url ?? `https://${seed.shop}.ge/laptops/item-${seed.id}`,
    title: `offer ${seed.id}`,
    matchStatus: seed.matchStatus ?? "CONFIRMED",
    matchConfidence: seed.matchConfidence === undefined ? 100 : seed.matchConfidence,
    verificationStatus: seed.verificationStatus ?? "CONFIRMED",
    currentPrice: seed.price,
    oldPrice: null,
    discountPercent: 0,
    currency: "GEL",
    availability: "IN_STOCK",
    imageUrl: null,
    lastSeenAt: new Date().toISOString(),
  };
}

type Case = { name: string; offers: OfferView[]; expect: string[] };

const cases: Case[] = [
  {
    name: "cheapest offer per shop wins when every row is displayable",
    offers: [
      offer({ id: "a", shop: "zoommer", price: 2199 }),
      offer({ id: "b", shop: "zoommer", price: 2149 }),
      offer({ id: "c", shop: "ee", price: 2399 }),
    ],
    expect: ["b", "c"],
  },
  {
    name: "a cheaper rejected row does not evict the shop's confirmed offer",
    offers: [
      offer({ id: "rejected", shop: "zoommer", price: 2149, matchStatus: "REJECTED", verificationStatus: "REJECTED" }),
      offer({ id: "confirmed", shop: "zoommer", price: 2199 }),
    ],
    expect: ["confirmed"],
  },
  {
    name: "an unverified row does not evict the confirmed one either",
    offers: [
      offer({ id: "pending", shop: "ee", price: 1000, verificationStatus: "PENDING" }),
      offer({ id: "confirmed", shop: "ee", price: 1200 }),
    ],
    expect: ["confirmed"],
  },
  {
    name: "an offer below the matcher's AUTO band does not evict the one above it",
    offers: [
      offer({ id: "weak", shop: "pcshop", price: 800, matchConfidence: 70 }),
      offer({ id: "auto", shop: "pcshop", price: 850, matchConfidence: 85 }),
    ],
    expect: ["auto"],
  },
  {
    name: "a shop with nothing displayable still keeps its cheapest row",
    offers: [
      offer({ id: "rejected-cheap", shop: "zoommer", price: 100, matchStatus: "REJECTED", verificationStatus: "REJECTED" }),
      offer({ id: "rejected-dear", shop: "zoommer", price: 200, matchStatus: "REJECTED", verificationStatus: "REJECTED" }),
    ],
    expect: ["rejected-cheap"],
  },
  {
    name: "one row per shop, ordered by price",
    offers: [
      offer({ id: "ee-cheap", shop: "ee", price: 900 }),
      offer({ id: "zoommer-dear", shop: "zoommer", price: 1100 }),
      offer({ id: "zoommer-cheap", shop: "zoommer", price: 950 }),
      offer({ id: "pcshop", shop: "pcshop", price: 880 }),
    ],
    expect: ["pcshop", "ee-cheap", "zoommer-cheap"],
  },
];

let failures = 0;
for (const testCase of cases) {
  const actual = selectShopOffers(testCase.offers).map((item) => item.id);
  const passed = actual.length === testCase.expect.length && actual.every((id, index) => id === testCase.expect[index]);
  if (!passed) failures += 1;
  console.log(`${passed ? "PASS" : "FAIL"} ${testCase.name}`);
  if (!passed) console.log(`  expected [${testCase.expect.join(", ")}] got [${actual.join(", ")}]`);
}

console.log(`Verified ${cases.length} offer-dedupe cases.`);
if (failures) {
  console.error(`${failures} case(s) failed.`);
  process.exit(1);
}
