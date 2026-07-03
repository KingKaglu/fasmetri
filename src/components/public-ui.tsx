import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, Clock3, Info, PackageSearch, ShieldCheck, Store } from "lucide-react";
import { Availability, OfferView, ShopView } from "@/lib/catalog-types";
import { formatGel, formatRelativeUpdated, formatUpdated } from "@/lib/format";
export { ProductImage } from "@/components/product-image";

export function hasRealDiscount(offer: Pick<OfferView, "currentPrice" | "oldPrice" | "discountPercent">) {
  return Boolean(offer.oldPrice && offer.oldPrice > offer.currentPrice && offer.discountPercent > 0);
}

export function realDiscountPercent(offer: Pick<OfferView, "currentPrice" | "oldPrice" | "discountPercent">) {
  return hasRealDiscount(offer) ? offer.discountPercent : 0;
}

export function AvailabilityBadge({ availability, hideUnknown = false }: { availability: Availability; hideUnknown?: boolean }) {
  if (hideUnknown && availability === "UNKNOWN") return null;
  const meta =
    availability === "IN_STOCK"
      ? { label: "მარაგშია", className: "border-zinc-900 bg-zinc-900 text-white", dot: "bg-white" }
      : availability === "OUT_OF_STOCK"
        ? { label: "არ არის მარაგში", className: "border-zinc-200 bg-zinc-50 text-zinc-400", dot: "bg-zinc-300" }
        : { label: "მარაგი მოწმდება", className: "border-zinc-300 bg-white text-zinc-600", dot: "bg-zinc-400" };

  return (
    <span className={`inline-flex h-5 items-center gap-1 border px-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] ${meta.className}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function DiscountBadge({ percent, label }: { percent: number; label?: string }) {
  if (!percent) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-950 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
      {label ?? `-${percent}%`}
    </span>
  );
}

export function PriceDisplay({
  price,
  oldPrice,
  strong = false,
  deal = false,
  tone = "dark",
}: {
  price: number;
  oldPrice?: number | null;
  strong?: boolean;
  deal?: boolean;
  tone?: "dark" | "light";
}) {
  const priceClass = tone === "light" ? "text-white" : "price-now";
  const dealClass = deal ? "underline decoration-2 underline-offset-4 decoration-zinc-900/40" : "";
  const oldPriceClass = tone === "light" ? "text-white/50" : "price-old";
  const validOldPrice = oldPrice && oldPrice > price ? oldPrice : null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <strong className={`${strong ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"} ${priceClass} ${dealClass} font-bold leading-none`}>
        {formatGel(price)}
      </strong>
      {validOldPrice ? <span className={`${oldPriceClass} text-xs line-through`}>{formatGel(validOldPrice)}</span> : null}
    </div>
  );
}

export function LastUpdatedText({ value, exact = false, className = "" }: { value: string | Date; exact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 text-gray-400 ${className}`}>
      <Clock3 className="size-3 shrink-0" />
      <span className="min-w-0">
        <span className="block">{formatRelativeUpdated(value)}</span>
        {exact ? <span className="block text-[11px] font-medium text-gray-500">{formatUpdated(value)}</span> : null}
      </span>
    </span>
  );
}

export function ShopMark({ shop, size = "md" }: { shop: Pick<ShopView, "name" | "logoUrl">; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "size-6" : "size-9";
  return (
    <span className={`relative grid ${dimension} shrink-0 place-items-center overflow-hidden rounded-md border border-gray-200 bg-white text-[10px] font-semibold text-gray-600`}>
      {shop.logoUrl ? <Image src={shop.logoUrl} alt="" fill unoptimized className="object-contain p-1" /> : shop.name.slice(0, 1)}
    </span>
  );
}

export function ShopStatusBadge({ shop }: { shop: ShopView }) {
  const hasComparedProducts = shop.productCount == null ? Boolean(shop.lastScrapedAt) : shop.productCount > 0;
  const meta =
    hasComparedProducts && shop.lastScrapedAt
      ? { label: "აქტიური", className: "border-zinc-900 bg-zinc-900 text-white" }
      : shop.enabled
        ? { label: "მოწმდება", className: "border-zinc-300 bg-white text-zinc-600" }
        : { label: "მალე", className: "border-zinc-200 bg-zinc-50 text-zinc-400" };

  return (
    <span className={`inline-flex shrink-0 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  action = "ნახვა",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="masthead mb-5">
      <div className="masthead-row flex-wrap">
        <div className="max-w-2xl min-w-0">
          {eyebrow ? <p className="masthead-kicker mb-0.5">{eyebrow}</p> : null}
          <h2 className="masthead-title">{title}</h2>
          {description ? <p className="mt-1.5 text-sm leading-6 text-gray-500">{description}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="masthead-link inline-flex items-center gap-1">
            {action}
            <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title = "პროდუქტი ვერ მოიძებნა",
  description = "სცადე სხვა საძიებო სიტყვა ან შეცვალე ფილტრები.",
  href,
  action = "ფილტრების გასუფთავება",
  icon = "search",
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
  icon?: "search" | "store" | "error";
}) {
  const Icon = icon === "store" ? Store : icon === "error" ? AlertCircle : PackageSearch;
  return (
    <div className="grid min-h-60 place-items-center rounded-lg border border-gray-200 bg-white px-5 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
          <Icon className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-gray-500">{description}</p>
        {href ? (
          <Link href={href} className="mt-5 inline-flex h-9 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-black">
            {action}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "მონაცემების ჩატვირთვა ვერ მოხერხდა",
  description = "სცადე გვერდის განახლება ან მოგვიანებით დაბრუნდი.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-60 place-items-center rounded-lg border border-gray-200 bg-white px-5 py-10 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-lg border border-zinc-300 bg-zinc-950 text-white">
          <AlertCircle className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-gray-900">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-gray-500">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function TrustNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${compact ? "p-4" : "p-5"}`}>
      <p className="flex gap-2 text-sm font-semibold text-gray-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-zinc-900" />
        ფასები და მარაგი რეგულარულად ახლდება.
      </p>
      <p className="mt-1.5 text-sm leading-5 text-gray-500">
        ყიდვამდე საბოლოო ფასი ყოველთვის გადაამოწმე მაღაზიის ოფიციალურ გვერდზე.
      </p>
    </div>
  );
}

export function PriceDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-md border border-gray-200 bg-gray-50 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <p className="flex gap-2 text-xs font-medium leading-5 text-gray-600">
        <Info className="mt-0.5 size-3.5 shrink-0 text-gray-400" />
        ფასები შეიძლება შეიცვალოს. საბოლოო ფასი გადაამოწმე მაღაზიის ვებსაიტზე.
      </p>
    </div>
  );
}

export function ProductNotFound() {
  return (
    <section className="shell py-12 sm:py-16">
      <EmptyState
        title="პროდუქტი ვერ მოიძებნა"
        description="შესაძლოა პროდუქტი წაიშალა, აღარ არის ხელმისაწვდომი ან მონაცემი ჯერ არ განახლებულა."
        href="/categories"
        action="კატეგორიებში დაბრუნება"
      />
    </section>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="aspect-square animate-pulse bg-gray-100" />
      <div className="grid gap-2 p-3">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
        <div className="h-8 animate-pulse rounded bg-gray-100" />
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
