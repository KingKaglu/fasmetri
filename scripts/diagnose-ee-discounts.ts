/**
 * Answers one question: does Elite Electronics publish previous prices at all?
 *
 * Production shows ee with 0 deals across ~435 products while Zoommer has 88
 * and PCShop 94. Either ee genuinely never advertises a discount, or the sync
 * is reading the wrong fields. The sync already looks for `previousPrice`,
 * `discountAmount` and `discountPercent`, so this samples the live listing feed
 * and reports which of those are ever populated.
 *
 * Must run from a Georgian residential IP — ee.ge returns 403 to data-centre
 * addresses, which is why this cannot be answered from CI or a cloud sandbox.
 *
 *   npx tsx scripts/diagnose-ee-discounts.ts [--pages=3]
 */

// `export {}` scopes this file as a module — scripts/ is compiled as one
// program, so a bare top-level `main` would collide with other scripts.
export {};

const CATEGORY_URLS = [
  { label: "phones", url: "https://ee.ge/en/mobile-phone" },
  { label: "laptops", url: "https://ee.ge/en/laptops" },
];

type Listing = {
  id?: number | string;
  name?: string;
  price?: number | string | null;
  previousPrice?: number | string | null;
  discountAmount?: number | string | null;
  discountPercent?: number | string | null;
};

function arg(name: string, fallback: number) {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

// The listing data is embedded in the Next.js payload on the category page.
function extractNextData(html: string): unknown {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function readListing(data: unknown): Listing[] {
  const props = (data as Record<string, any>)?.props?.pageProps?.initialListingData;
  return Array.isArray(props?.products) ? (props.products as Listing[]) : [];
}

const present = (v: unknown) => v != null && v !== "" && Number(v) !== 0;

async function main() {
  const pages = arg("pages", 3);
  let grandTotal = 0;
  const grand = { previousPrice: 0, discountAmount: 0, discountPercent: 0 };
  const examples: string[] = [];

  for (const { label, url } of CATEGORY_URLS) {
    for (let page = 1; page <= pages; page += 1) {
      const target = page === 1 ? url : `${url}?page=${page}`;
      let html: string;
      try {
        const response = await fetch(target, {
          headers: {
            "user-agent": process.env.SCRAPER_USER_AGENT ?? "FasmetriPriceBot/0.1 (+hello@fasmetri.ge)",
            accept: "text/html,application/xhtml+xml",
            "accept-language": "en,ka;q=0.8",
          },
        });
        if (!response.ok) {
          console.log(`  ${label} p${page}: HTTP ${response.status}${response.status === 403 ? "  (run this from your Georgian connection)" : ""}`);
          continue;
        }
        html = await response.text();
      } catch (error) {
        console.log(`  ${label} p${page}: request failed — ${(error as Error).message}`);
        continue;
      }

      const products = readListing(extractNextData(html));
      if (!products.length) {
        console.log(`  ${label} p${page}: no products parsed (page layout may have changed)`);
        continue;
      }

      const counts = { previousPrice: 0, discountAmount: 0, discountPercent: 0 };
      for (const product of products) {
        if (present(product.previousPrice)) counts.previousPrice += 1;
        if (present(product.discountAmount)) counts.discountAmount += 1;
        if (present(product.discountPercent)) counts.discountPercent += 1;
        if (examples.length < 5 && (present(product.previousPrice) || present(product.discountPercent))) {
          examples.push(
            `${product.name ?? product.id} — price=${product.price} previousPrice=${product.previousPrice} discountPercent=${product.discountPercent}`,
          );
        }
      }
      grandTotal += products.length;
      grand.previousPrice += counts.previousPrice;
      grand.discountAmount += counts.discountAmount;
      grand.discountPercent += counts.discountPercent;
      console.log(
        `  ${label} p${page}: ${products.length} products — previousPrice ${counts.previousPrice}, discountAmount ${counts.discountAmount}, discountPercent ${counts.discountPercent}`,
      );
    }
  }

  console.log(`\nSampled ${grandTotal} ee.ge products.`);
  if (!grandTotal) {
    console.log("Nothing sampled — every request failed. Re-run from a connection ee.ge accepts.");
    return;
  }
  console.log(`  previousPrice populated:   ${grand.previousPrice}`);
  console.log(`  discountAmount populated:  ${grand.discountAmount}`);
  console.log(`  discountPercent populated: ${grand.discountPercent}`);

  if (examples.length) {
    console.log("\nExamples carrying discount data:");
    for (const line of examples) console.log(`  ${line}`);
  }

  const anyDiscounts = grand.previousPrice + grand.discountAmount + grand.discountPercent > 0;
  console.log(
    anyDiscounts
      ? "\nVERDICT: ee.ge DOES publish discount data, so the 0-deal count is a sync bug worth fixing."
      : "\nVERDICT: ee.ge publishes no discount data in its listing feed. 0 deals is correct, not a bug —\n" +
        "         their discounts would have to come from the product detail pages instead.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
