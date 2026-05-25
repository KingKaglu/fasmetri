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
}: {
  products: ProductView[];
  deal?: boolean;
  density?: "catalog" | "compact";
  resetHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: string;
}) {
  if (!products.length) return <EmptyState href={resetHref} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  const gridClassName = density === "compact" ? "product-grid-dense gap-3" : "product-grid-catalog gap-4";
  return <div className={`${gridClassName} grid min-w-0 items-start`}>{products.map((product, index) => <ProductCard key={product.id} product={product} deal={deal} imagePriority={index < 4} />)}</div>;
}
