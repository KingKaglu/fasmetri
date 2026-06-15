"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { CategoryView, ShopView } from "@/lib/catalog-types";

// Removable chips for every active filter, shown above the product grid. Reads
// the live querystring so it stays in sync with the (now instant) filters; each
// chip removes its own param and re-navigates. Pairs with CatalogFilters.
export function ActiveFilterChips({
  basePath,
  categories,
  shops,
  fixedCategory,
}: {
  basePath: string;
  categories: CategoryView[];
  shops: ShopView[];
  fixedCategory?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.nameKa ?? slug;
  const shopName = (slug: string) => shops.find((s) => s.slug === slug)?.name ?? slug;
  const availabilityLabel = (v: string) =>
    ({ IN_STOCK: "მარაგშია", OUT_OF_STOCK: "ამოიწურა", UNKNOWN: "მოწმდება" } as Record<string, string>)[v] ?? v;

  // Build the chip list from the live params (order is intentional).
  const chips: { keys: string[]; label: string }[] = [];
  const get = (k: string) => searchParams.get(k) ?? undefined;

  const category = get("category");
  if (category && !fixedCategory) chips.push({ keys: ["category"], label: categoryName(category) });
  const shop = get("shop");
  if (shop) chips.push({ keys: ["shop"], label: shopName(shop) });
  const minPrice = get("minPrice");
  if (minPrice) chips.push({ keys: ["minPrice"], label: `ფასი ≥ ₾${minPrice}` });
  const maxPrice = get("maxPrice");
  if (maxPrice) chips.push({ keys: ["maxPrice"], label: `ფასი ≤ ₾${maxPrice}` });
  const minDiscount = get("minDiscount");
  if (minDiscount) chips.push({ keys: ["minDiscount"], label: `ფასდაკლება ≥ ${minDiscount}%` });
  const availability = get("availability");
  if (availability) chips.push({ keys: ["availability"], label: availabilityLabel(availability) });
  if (get("dealsOnly") === "true") chips.push({ keys: ["dealsOnly"], label: "ფასდაკლებული" });
  if (get("inStockOnly") === "true") chips.push({ keys: ["inStockOnly"], label: "მარაგში" });
  if (get("popularOnly") === "true") chips.push({ keys: ["popularOnly"], label: "პოპულარული" });
  if (get("techOnly") === "true") chips.push({ keys: ["techOnly"], label: "ტექნიკა" });
  if (get("largeDiscountOnly") === "true") chips.push({ keys: ["largeDiscountOnly"], label: "დიდი ფასდაკლება" });

  if (chips.length === 0) return null;

  const navigate = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams.toString());
    mutate(p);
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.keys.join("-")}
          type="button"
          onClick={() => navigate((p) => chip.keys.forEach((k) => p.delete(k)))}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-2 text-xs font-medium text-gray-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {chip.label}
          <X className="size-3.5 text-gray-400" />
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          navigate((p) =>
            ["category", "shop", "minPrice", "maxPrice", "minDiscount", "availability", "dealsOnly", "inStockOnly", "popularOnly", "techOnly", "largeDiscountOnly"].forEach((k) => {
              if (k !== "category" || !fixedCategory) p.delete(k);
            }),
          )
        }
        className="text-xs font-semibold text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
      >
        გასუფთავება
      </button>
    </div>
  );
}
