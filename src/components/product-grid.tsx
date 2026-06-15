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
}) {
  if (!products.length) return <EmptyState href={resetHref} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  const gridClassName = density === "compact" ? "product-grid-dense" : "product-grid-catalog";
  return <div className={`${gridClassName} grid min-w-0 items-start`}>{products.map((product, index) => <ProductCard key={product.id} product={product} deal={deal} imagePriority={index < priorityImages} />)}</div>;
}
