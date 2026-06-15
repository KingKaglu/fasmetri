import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { getPublicProduct } from "@/lib/catalog";
import type { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { extractProductAttributes, type ProductAttributes } from "@/lib/productNormalization";
import { ShopClickLink } from "@/components/shop-click-link";
import { EmptyState, ProductImage, SectionHeader } from "@/components/public-ui";

export const metadata: Metadata = {
  title: "პროდუქტების შედარება",
  description: "შეადარე პროდუქტები გვერდიგვერდ — ფასი, მახასიათებლები და მაღაზიები.",
  robots: { index: false, follow: true },
};

// The compare page reflects a user's transient selection — never cache it.
export const dynamic = "force-dynamic";

const COMPARE_MAX = 4;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string | string[] }>;
}) {
  const slugs = parseItems((await searchParams).items);

  // Reuse the SAME by-slug loader the product page uses. Unknown slugs resolve
  // to null and are skipped; order follows the user's selection order.
  const loaded = await Promise.all(slugs.map((slug) => getPublicProduct(slug)));
  const products = loaded.filter((product): product is ProductView => Boolean(product && product.offers[0]));

  if (products.length < 2) {
    return (
      <section className="shell py-6 sm:py-10">
        <Breadcrumb />
        <SectionHeader eyebrow="შედარება" title="პროდუქტების შედარება" />
        <div className="mt-4">
          <EmptyState
            icon="search"
            title={products.length === 1 ? "დაამატე კიდევ ერთი პროდუქტი" : "შესადარებელი პროდუქტები არ არის არჩეული"}
            description="პროდუქტის ბარათზე დააჭირე „+“ ღილაკს, რომ რამდენიმე პროდუქტი გვერდიგვერდ შეადარო (მინიმუმ 2, მაქსიმუმ 4)."
            href="/categories"
            action="კატალოგის დათვალიერება"
          />
        </div>
      </section>
    );
  }

  const columns = products.map((product) => buildColumn(product));
  const specRows = buildSpecRows(columns);
  const lowestPrices = columns.map((column) => column.lowestPrice);
  const cheapest = Math.min(...lowestPrices.filter((price) => Number.isFinite(price) && price > 0));

  // Mobile-friendly: each product is a fixed-width column; the whole grid scrolls
  // horizontally on small screens. Spec column is sticky-left for alignment.
  const gridTemplate = `minmax(7.5rem,9rem) repeat(${columns.length}, minmax(11rem, 1fr))`;

  return (
    <section className="shell py-6 sm:py-10">
      <Breadcrumb />
      <SectionHeader
        eyebrow="შედარება"
        title={`${columns.length} პროდუქტი გვერდიგვერდ`}
        description="მახასიათებლები გასწორებულია; ყველაზე დაბალი ფასი მონიშნულია."
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="min-w-fit">
          {/* Header row: image + title */}
          <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="sticky left-0 z-10 bg-white p-3" />
            {columns.map((column) => (
              <div key={column.product.id} className="border-l border-gray-100 p-3">
                <Link href={`/products/${column.product.slug}`} className="block">
                  <div className="overflow-hidden rounded-md border border-gray-100 bg-gray-50">
                    <ProductImage
                      src={column.image}
                      alt={column.product.name}
                      categorySlug={column.product.category?.slug}
                      shopName={column.cheapestOffer.shop.name}
                    />
                  </div>
                  <p className="mt-2 line-clamp-3 text-[12px] font-semibold leading-[1.4] text-gray-900 hover:text-[var(--accent)]">
                    {column.product.name}
                  </p>
                </Link>
              </div>
            ))}
          </div>

          {/* Price row (highlighted, sits right under the titles) */}
          <Row
            label="ფასი"
            gridTemplate={gridTemplate}
            highlight
            cells={columns.map((column) => {
              const isCheapest = Number.isFinite(cheapest) && column.lowestPrice === cheapest;
              return (
                <div key={column.product.id} className="flex flex-col gap-1">
                  <span
                    className={`text-base font-bold tabular-nums ${isCheapest ? "text-green-700" : "text-gray-900"}`}
                  >
                    {Number.isFinite(column.lowestPrice) ? formatGel(column.lowestPrice) : "—"}
                  </span>
                  {isCheapest && columns.length > 1 ? (
                    <span className="w-fit rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      საუკეთესო ფასი
                    </span>
                  ) : null}
                  <span className="text-[10px] text-gray-400">
                    {column.shopCount > 1 ? `${column.shopCount} მაღაზია` : column.cheapestOffer.shop.name}
                  </span>
                </div>
              );
            })}
          />

          {/* Spec rows (union of keys across all products, stable order) */}
          {specRows.map((row) => (
            <Row
              key={row.key}
              label={row.label}
              gridTemplate={gridTemplate}
              cells={row.values.map((value, index) => (
                <span key={columns[index].product.id} className="text-xs text-gray-700">
                  {value ?? <span className="text-gray-300">—</span>}
                </span>
              ))}
            />
          ))}

          {/* Action row: jump to the cheapest store for each product */}
          <Row
            label="მაღაზია"
            gridTemplate={gridTemplate}
            cells={columns.map((column) => (
              <ShopClickLink
                key={column.product.id}
                offerId={column.cheapestOffer.id}
                productId={column.product.id}
                productName={column.product.name}
                category={column.product.category?.slug}
                shopName={column.cheapestOffer.shop.name}
                price={column.cheapestOffer.currentPrice}
                sourceUrl={column.cheapestOffer.url}
                ariaLabel={`${column.cheapestOffer.shop.name} შეთავაზება`}
                className="flex h-9 w-fit items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-[11px] font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              >
                ნახვა
                <ArrowUpRight className="size-3.5" />
              </ShopClickLink>
            ))}
          />
        </div>
      </div>
    </section>
  );
}

function Breadcrumb() {
  return (
    <nav aria-label="ნავიგაცია" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-400">
      <Link href="/" className="hover:text-gray-700">მთავარი</Link>
      <ChevronRight className="size-3" />
      <span className="font-medium text-gray-700">შედარება</span>
    </nav>
  );
}

function Row({
  label,
  cells,
  gridTemplate,
  highlight = false,
}: {
  label: string;
  cells: React.ReactNode[];
  gridTemplate: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid border-b border-gray-100 last:border-b-0 ${highlight ? "bg-gray-50/70" : "odd:bg-white even:bg-gray-50/40"}`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="sticky left-0 z-10 flex items-center bg-inherit p-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </div>
      {cells.map((cell, index) => (
        <div key={index} className="flex items-center border-l border-gray-100 p-3">
          {cell}
        </div>
      ))}
    </div>
  );
}

type CompareColumn = {
  product: ProductView;
  cheapestOffer: ProductView["offers"][number];
  image?: string | null;
  lowestPrice: number;
  shopCount: number;
  attributes: ProductAttributes;
};

function buildColumn(product: ProductView): CompareColumn {
  // Offers are pre-sorted cheapest-first by the catalog layer (same as the
  // product page), so offers[0] is the lowest price.
  const cheapestOffer = product.offers[0];
  const prices = product.offers.map((offer) => offer.currentPrice).filter((price) => Number.isFinite(price) && price > 0);
  return {
    product,
    cheapestOffer,
    image: cheapestOffer.imageUrl ?? product.imageUrl,
    lowestPrice: prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY,
    shopCount: new Set(product.offers.map((offer) => offer.shop.id)).size,
    // Derive specs from the product title (same extractor the product page uses).
    attributes: extractProductAttributes({ title: product.name, categorySlug: product.category?.slug }),
  };
}

// Stable, meaningful spec ordering. A row is only emitted when at least one
// product has a value for that key; missing values render as "—" per-cell.
const SPEC_FIELDS: Array<{ key: string; label: string; get: (a: ProductAttributes) => string | undefined }> = [
  { key: "brand", label: "ბრენდი", get: (a) => a.brand },
  { key: "cpu", label: "CPU", get: (a) => a.cpu },
  { key: "gpu", label: "GPU", get: (a) => a.gpu },
  { key: "ram", label: "RAM", get: (a) => (a.ram.length ? a.ram.join("/") : undefined) },
  { key: "storage", label: "მეხსიერება", get: (a) => (a.storage.length ? a.storage.join("/") : undefined) },
  { key: "screenSize", label: "ეკრანი", get: (a) => a.screenSize },
  { key: "sim", label: "SIM", get: (a) => a.sim },
  { key: "os", label: "OS", get: (a) => a.os },
  { key: "color", label: "ფერი", get: (a) => a.color },
  { key: "capacity", label: "მოცულობა", get: (a) => a.capacity },
  { key: "modelCode", label: "მოდელი", get: (a) => a.modelCodes[0] },
];

function buildSpecRows(columns: CompareColumn[]) {
  return SPEC_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    values: columns.map((column) => normalizeValue(field.get(column.attributes))),
  })).filter((row) => row.values.some((value) => value != null));
}

function normalizeValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseItems(raw: string | string[] | undefined): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of joined.split(",")) {
    let slug = part.trim();
    try {
      slug = decodeURIComponent(slug).trim();
    } catch {
      // keep raw on malformed encoding
    }
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= COMPARE_MAX) break;
  }
  return out;
}
