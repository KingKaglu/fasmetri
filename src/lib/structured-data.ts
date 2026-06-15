import { siteUrl } from "@/config/site";
import { Availability, CategoryView, ProductView } from "@/lib/catalog-types";

// schema.org availability URLs keyed by our internal Availability union.
const AVAILABILITY_SCHEMA: Record<Availability, string> = {
  IN_STOCK: "https://schema.org/InStock",
  OUT_OF_STOCK: "https://schema.org/OutOfStock",
  UNKNOWN: "https://schema.org/InStock",
};

function absolute(path: string) {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Product JSON-LD with an AggregateOffer built from the product's real
 * per-store offers. lowPrice / highPrice / offerCount are derived from the
 * actual offers — no invented ratings or reviews.
 */
export function buildProductJsonLd(product: ProductView): Record<string, unknown> | null {
  const prices = product.offers
    .map((offer) => offer.currentPrice)
    .filter((price) => Number.isFinite(price) && price > 0);
  if (!prices.length) return null;

  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const anyInStock = product.offers.some((offer) => offer.availability === "IN_STOCK");
  const image = product.imageUrl ?? product.offers.find((offer) => offer.imageUrl)?.imageUrl ?? undefined;
  const currency = product.offers.find((offer) => offer.currency)?.currency ?? "GEL";

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: absolute(`/products/${product.slug}`),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: currency,
      lowPrice,
      highPrice,
      offerCount: product.offers.length,
      availability: anyInStock ? AVAILABILITY_SCHEMA.IN_STOCK : AVAILABILITY_SCHEMA.OUT_OF_STOCK,
    },
  };

  if (image) data.image = image;
  if (product.brand) data.brand = { "@type": "Brand", name: product.brand };

  const description =
    `${product.name} — ${product.offers.length > 1 ? `${product.offers.length} შეთავაზება` : "შეთავაზება"}, ` +
    `ფასი ${lowPrice} ${currency}-დან. შეადარე ფასები ქართულ ონლაინ მაღაზიებში.`;
  data.description = description;

  return data;
}

type Crumb = { name: string; path: string };

export function buildBreadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

export function buildProductBreadcrumbJsonLd(product: ProductView): Record<string, unknown> {
  const crumbs: Crumb[] = [{ name: "მთავარი", path: "/" }];
  if (product.category) {
    crumbs.push({ name: product.category.nameKa, path: `/categories/${product.category.slug}` });
  }
  crumbs.push({ name: product.name, path: `/products/${product.slug}` });
  return buildBreadcrumbJsonLd(crumbs);
}

export function buildCategoryBreadcrumbJsonLd(category: CategoryView): Record<string, unknown> {
  return buildBreadcrumbJsonLd([
    { name: "მთავარი", path: "/" },
    { name: category.nameKa, path: `/categories/${category.slug}` },
  ]);
}

/**
 * ItemList of the products visible on a category page. Cheap — only references
 * product names + URLs, no extra queries.
 */
export function buildCategoryItemListJsonLd(
  category: CategoryView,
  products: ProductView[],
): Record<string, unknown> | null {
  if (!products.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.nameKa,
    url: absolute(`/categories/${category.slug}`),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absolute(`/products/${product.slug}`),
      name: product.name,
    })),
  };
}
