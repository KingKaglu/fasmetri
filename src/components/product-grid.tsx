import { ProductView } from "@/lib/catalog-types";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/public-ui";

export function ProductGrid({
  products,
  deal = false,
  density = "catalog",
  resetHref,
  emptyTitle,
  emptyDescription,
  emptyAction,
  priorityImages = 4,
  mobileRail = false,
}: {
  products: ProductView[];
  deal?: boolean;
  density?: "catalog" | "compact";
  resetHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: string;
  // How many leading card images get next/image priority (eager + high
  // fetchPriority). Defaults to the first row (4) for above-the-fold grids;
  // pass 0 for grids that render below the fold so they don't compete with the
  // page's real LCP image for early bandwidth.
  priorityImages?: number;
  // Homepage sections: on phones a stacked grid of 6-12 cards per section
  // makes the page endless. mobileRail renders ONE swipeable snap row below
  // md and falls back to the normal grid from md up.
  mobileRail?: boolean;
}) {
  if (!products.length) return <EmptyState href={resetHref} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  const gridClassName = density === "compact" ? "product-grid-dense" : "product-grid-catalog";
  return (
    <div className={`${gridClassName} ${mobileRail ? "product-rail-mobile" : ""} grid min-w-0 items-start`}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} deal={deal} imagePriority={index < priorityImages} />
      ))}
    </div>
  );
}
