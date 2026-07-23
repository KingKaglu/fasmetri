import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, MoveHorizontal } from "lucide-react";
import { getPublicProduct } from "@/lib/catalog";
import type { ProductView } from "@/lib/catalog-types";
import { formatGel } from "@/lib/format";
import { extractProductAttributes, type ProductAttributes } from "@/lib/productNormalization";
import { ShopClickLink } from "@/components/shop-click-link";
import { CompareRemove } from "@/components/compare-remove";
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

  // Mobile-friendly: each product is a fixed-width column; the whole grid
  // scrolls horizontally on small screens with the spec-label column pinned
  // left for alignment. Column widths come from CSS vars set on the wrapper so
  // phones get a narrower label rail + columns without a JS media query.
  const gridTemplate = `var(--cmp-label) repeat(${columns.length}, minmax(var(--cmp-col), 1fr))`;

  return (
    <section className="shell py-6 sm:py-10">
      <Breadcrumb />
      <SectionHeader
        eyebrow="შედარება"
        title={`${columns.length} პროდუქტი გვერდიგვერდ`}
        description="მახასიათებლები გასწორებულია; ყველაზე დაბალი ფასი მონიშნულია, განსხვავებული მნიშვნელობები გამუქებულია."
      />

      {/* Swipe affordance — the grid overflows on phones even with 2 columns. */}
      <p className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 sm:hidden">
        <MoveHorizontal className="size-3.5 shrink-0" />
        გაასრიალე ცხრილი, რომ ყველა პროდუქტი ნახო
      </p>

      <div className="mt-2 overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 bg-white [--cmp-label:5.75rem] [--cmp-col:9.75rem] sm:mt-4 sm:[--cmp-label:8.5rem] sm:[--cmp-col:11.5rem]">
        <div role="table" aria-label="პროდუქტების შედარების ცხრილი" className="min-w-fit">
          {/* Header row: image + title (+ per-column remove) */}
          <div role="row" className="grid border-b border-gray-200 bg-white" style={{ gridTemplateColumns: gridTemplate }}>
            <div role="columnheader" aria-label="მახასიათებელი" className="sticky left-0 z-20 border-r border-gray-100 bg-white p-3" />
            {columns.map((column, index) => (
              <div key={column.product.id} role="columnheader" className={`relative p-3 ${index > 0 ? "border-l border-gray-100" : ""}`}>
                <CompareRemove slug={column.product.slug} name={column.product.name} />
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
                  <span className="text-base font-bold tabular-nums text-gray-900">
                    {Number.isFinite(column.lowestPrice) ? formatGel(column.lowestPrice) : "—"}
                  </span>
                  {isCheapest && columns.length > 1 ? (
                    <span className="w-fit rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold text-white">
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

          {/* Spec rows (union of keys across all products, stable order). Rows
              where the products actually differ render darker + semibold so
              the differences are scannable at a glance. */}
          {specRows.map((row) => (
            <Row
              key={row.key}
              label={row.label}
              gridTemplate={gridTemplate}
              cells={row.values.map((value, index) => (
                <span
                  key={columns[index].product.id}
                  className={`text-xs ${row.differs && value != null ? "font-semibold text-gray-900" : "text-gray-600"}`}
                >
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
                className="flex h-10 w-full max-w-[11rem] items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-[11px] font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
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
  // Row backgrounds must be fully opaque: the label cell is sticky and scrolled
  // cells slide underneath it — any translucency lets their text bleed through.
  return (
    <div
      role="row"
      className={`grid border-b border-gray-100 last:border-b-0 ${highlight ? "bg-gray-50" : "bg-white"}`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div
        role="rowheader"
        className="sticky left-0 z-20 flex items-center border-r border-gray-100 bg-inherit p-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
      >
        {label}
      </div>
      {cells.map((cell, index) => (
        <div key={index} role="cell" className={`flex items-center p-3 ${index > 0 ? "border-l border-gray-100" : ""}`}>
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
// `pretty` marks machine tokens (lowercase, underscore-joined) that should be
// humanized for display; codes like CPU/GPU/model stay verbatim.
const SPEC_FIELDS: Array<{ key: string; label: string; pretty?: boolean; get: (a: ProductAttributes) => string | undefined }> = [
  { key: "brand", label: "ბრენდი", pretty: true, get: (a) => a.brand },
  { key: "cpu", label: "CPU", get: (a) => a.cpu },
  { key: "gpu", label: "GPU", get: (a) => a.gpu },
  { key: "ram", label: "RAM", pretty: true, get: (a) => (a.ram.length ? a.ram.join("/") : undefined) },
  { key: "storage", label: "მეხსიერება", pretty: true, get: (a) => (a.storage.length ? a.storage.join("/") : undefined) },
  { key: "screenSize", label: "ეკრანი", get: (a) => a.screenSize },
  { key: "sim", label: "SIM", pretty: true, get: (a) => a.sim },
  { key: "os", label: "OS", pretty: true, get: (a) => a.os },
  { key: "color", label: "ფერი", pretty: true, get: (a) => a.color },
  { key: "capacity", label: "მოცულობა", pretty: true, get: (a) => a.capacity },
  { key: "modelCode", label: "მოდელი", get: (a) => a.modelCodes[0] },
];

function buildSpecRows(columns: CompareColumn[]) {
  return SPEC_FIELDS.map((field) => {
    const values = columns.map((column) => {
      const value = normalizeValue(field.get(column.attributes));
      return value && field.pretty ? prettifySpecValue(value) : value;
    });
    const distinct = new Set(values.filter((value): value is string => value != null));
    return {
      key: field.key,
      label: field.label,
      values,
      // A row "differs" when products disagree — including when only some
      // products have the value at all.
      differs: distinct.size > 1 || (distinct.size === 1 && values.some((value) => value == null)),
    };
  }).filter((row) => row.values.some((value) => value != null));
}

// Extracted attributes are lowercase machine tokens ("cosmic_orange",
// "esim_only", "256gb"). Render them the way a person would write them.
const SPEC_TOKEN_MAP: Record<string, string> = {
  gb: "GB",
  tb: "TB",
  mb: "MB",
  hz: "Hz",
  esim: "eSIM",
  sim: "SIM",
  ios: "iOS",
  ipados: "iPadOS",
  macos: "macOS",
  watchos: "watchOS",
  os: "OS",
  "5g": "5G",
  "4g": "4G",
  lte: "LTE",
  oled: "OLED",
  amoled: "AMOLED",
  lcd: "LCD",
  uhd: "UHD",
  hdr: "HDR",
  ssd: "SSD",
  hdd: "HDD",
};

function prettifySpecValue(value: string): string {
  // Multi-value fields join options with "/" ("256gb/512gb") — prettify each side.
  if (value.includes("/")) return value.split("/").map(prettifySpecValue).join("/");
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (SPEC_TOKEN_MAP[lower]) return SPEC_TOKEN_MAP[lower];
      // "256gb" / "1.5tb" / "120hz" → "256GB" / "1.5TB" / "120Hz"
      const unit = lower.match(/^(\d+(?:\.\d+)?)(gb|tb|mb|hz)$/);
      if (unit) return `${unit[1]}${SPEC_TOKEN_MAP[unit[2]]}`;
      if (/^\d/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
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
