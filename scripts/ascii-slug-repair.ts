import "./load-env";
import { prisma } from "../src/lib/prisma";
import { latinizeGeorgian } from "../src/lib/georgian";

// One-off repair for product slugs containing non-ASCII characters.
//
// Those pages answer 500 on the deployed site while rendering fine locally, so
// every Georgian-titled product was unreachable in production. slugifyProduct
// now transliterates, but rows created before that fix keep their old slug —
// this rewrites them in place.
//
// The whole slug is transliterated rather than rebuilt from the product name,
// so the uniqueness suffix each generator appended ("-70753e6f",
// "-zoommer-53628") survives untouched.
//
// Dry-run by default; pass --apply to write.

function asciiSlug(slug: string) {
  return latinizeGeorgian(slug)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  if (!prisma) throw new Error("DATABASE_URL is required.");
  const db = prisma;
  const apply = process.argv.includes("--apply");

  const products = await db.product.findMany({ select: { id: true, slug: true, name: true } });
  const broken = products.filter((product) => /[^\x20-\x7E]/.test(product.slug));
  const taken = new Set(products.map((product) => product.slug));

  console.log(`products=${products.length} nonAsciiSlugs=${broken.length} mode=${apply ? "APPLY" : "DRY-RUN"}`);

  let changed = 0;
  let unchanged = 0;
  for (const product of broken) {
    let next = asciiSlug(product.slug);
    if (!next) next = `product-${product.id.slice(-8)}`;
    if (next === product.slug) {
      unchanged += 1;
      continue;
    }
    if (taken.has(next)) {
      next = `${next}-${product.id.slice(-6)}`;
    }
    taken.add(next);
    console.log(`  ${product.slug}\n    -> ${next}`);
    if (apply) {
      await db.product.update({ where: { id: product.id }, data: { slug: next } });
    }
    changed += 1;
  }

  console.log(`${apply ? "rewrote" : "would rewrite"} ${changed} slugs (${unchanged} already ascii)`);
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
