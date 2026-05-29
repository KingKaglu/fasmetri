import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, Clock3, PackageSearch, ShieldCheck, Store } from "lucide-react";
import { Availability, ShopView } from "@/lib/catalog-types";
import { formatGel, formatRelativeUpdated, formatUpdated } from "@/lib/format";
export { ProductImage } from "@/components/product-image";

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const meta =
    availability === "IN_STOCK"
      ? { label: "მარაგშია", className: "bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]" }
      : availability === "OUT_OF_STOCK"
        ? { label: "არ არის", className: "bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]" }
        : { label: "მოწმდება", className: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]" };

  return (
    <span className={`inline-flex h-5 items-center rounded-sm border px-1.5 text-[10px] font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function DiscountBadge({ percent, label }: { percent: number; label?: string }) {
  if (!percent) return null;
  return (
    <span className="inline-flex items-center rounded-sm bg-[#b91c1c] px-1.5 py-0.5 text-[11px] font-black leading-none text-white">
      {label ?? `-${percent}%`}
    </span>
  );
}

export function PriceDisplay({
  price,
  oldPrice,
  strong = false,
  deal = false,
}: {
  price: number;
  oldPrice?: number | null;
  strong?: boolean;
  deal?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <strong
        className={`${strong ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"} price-now ${deal ? "price-now-deal" : ""} leading-none`}
      >
        {formatGel(price)}
      </strong>
      {oldPrice ? <span className="price-old text-xs sm:text-sm">{formatGel(oldPrice)}</span> : null}
    </div>
  );
}

export function LastUpdatedText({ value, exact = false, className = "" }: { value: string | Date; exact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 text-[#64748b] ${className}`}>
      <Clock3 className="size-3 shrink-0" />
      <span className="min-w-0">
        <span className="block">{formatRelativeUpdated(value)}</span>
        {exact ? <span className="block text-[11px] font-medium text-[#64748b]">{formatUpdated(value)}</span> : null}
      </span>
    </span>
  );
}

export function ShopMark({ shop, size = "md" }: { shop: Pick<ShopView, "name" | "logoUrl">; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "size-6" : "size-9";
  return (
    <span className={`relative grid ${dimension} shrink-0 place-items-center overflow-hidden rounded-sm border border-[#e2e8f0] bg-white text-[11px] font-black text-[#0f172a]`}>
      {shop.logoUrl ? <Image src={shop.logoUrl} alt="" fill unoptimized className="object-contain p-0.5" /> : shop.name.slice(0, 1)}
    </span>
  );
}

export function ShopStatusBadge({ shop }: { shop: ShopView }) {
  const hasComparedProducts = shop.productCount == null ? Boolean(shop.lastScrapedAt) : shop.productCount > 0;
  const meta =
    hasComparedProducts && shop.lastScrapedAt
      ? { label: "აქტიური", className: "bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]" }
      : shop.enabled
        ? { label: "მონაცემები მოწმდება", className: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]" }
        : { label: "მალე დაემატება", className: "bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]" };

  return (
    <span className={`inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-bold ${meta.className}`}>
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
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#e2e8f0] pb-3">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-black text-[#0f172a] sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-[#64748b]">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="inline-flex h-9 items-center gap-1 text-sm font-bold text-[#0f172a] hover:text-[#65a30d]">
          {action}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
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
    <div className="surface-flat grid min-h-60 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]">
          <Icon className="size-5" />
        </span>
        <h2 className="mt-4 text-lg font-black text-[#0f172a]">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-[#64748b]">{description}</p>
        {href ? (
          <Link href={href} className="mt-5 inline-flex h-10 items-center rounded-md bg-[#0f172a] px-4 text-sm font-bold text-white hover:bg-black">
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
    <div className="surface-flat grid min-h-60 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-md border border-[#fecaca] bg-[#fef2f2] text-[#dc2626]">
          <AlertCircle className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-black text-[#0f172a]">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-[#64748b]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function TrustNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`surface-flat ${compact ? "p-4" : "p-5"}`}>
      <p className="flex gap-2 text-sm font-bold text-[#0f172a]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#65a30d]" />
        ფასები და მარაგი რეგულარულად ახლდება.
      </p>
      <p className="mt-1.5 text-sm leading-5 text-[#64748b]">შეძენამდე საბოლოო ფასი ყოველთვის გადაამოწმე მაღაზიის საიტზე.</p>
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
    <div className="overflow-hidden rounded-md border border-[#e2e8f0] bg-white">
      <div className="aspect-square animate-pulse bg-[#f1f5f9]" />
      <div className="grid gap-2 p-2.5">
        <div className="h-4 w-20 animate-pulse rounded bg-[#f1f5f9]" />
        <div className="h-8 animate-pulse rounded bg-[#f1f5f9]" />
        <div className="h-6 w-24 animate-pulse rounded bg-[#f1f5f9]" />
      </div>
    </div>
  );
}
