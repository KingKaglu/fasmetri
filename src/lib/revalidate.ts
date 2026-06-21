import { revalidatePath, revalidateTag } from "next/cache";

// Single source of truth for pushing DB changes to the public site immediately.
//
// The public catalog data caches in lib/catalog.ts are all tagged "catalog",
// and the public pages render with ISR (export const revalidate = 300..600).
// Without this, an admin edit or a price/stock sync doesn't appear on the live
// site until that window expires (up to ~10 min). Calling this after any
// mutation that changes public data makes the website reflect the actual DB
// right away.
//
// Safe to call from anywhere: revalidateTag/revalidatePath throw when invoked
// outside a request/render scope (e.g. a CLI script), so the whole thing is
// wrapped — in that case the DB write still lands and ISR catches up normally.
export function revalidatePublicCatalog() {
  try {
    revalidateTag("catalog", "max");
    for (const path of ["/", "/deals", "/categories", "/shops", "/search"]) {
      revalidatePath(path);
    }
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/categories/[slug]", "page");
    revalidatePath("/shops/[slug]", "page");
  } catch {
    // Outside a Next request scope (CLI sync) — ignore; ISR will refresh later.
  }
}
