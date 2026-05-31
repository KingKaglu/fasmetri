import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, Clock3, PackageSearch, ShieldCheck, Store } from "lucide-react";
import { Availability, ShopView } from "@/lib/catalog-types";
import { formatGel, formatRelativeUpdated, formatUpdated } from "@/lib/format";
export { ProductImage } from "@/components/product-image";

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const meta =
    availability === "IN_STOCK"
      ? { label: "მარაგშია", className: "border-[#bfeecf] bg-[var(--savings-soft)] text-[var(--savings)]" }
      : availability === "OUT_OF_STOCK"
        ? { label: "ამოიწურა", className: "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]" }
        : { label: "მოწმდება", className: "border-[#ffdca6] bg-[var(--warn-soft)] text-[var(--warn)]" };

  return (
    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-black ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function DiscountBadge({ percent, label }: { percent: number; label?: string }) {
  if (!percent) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--price-deal)] px-2 py-1 text-[11px] font-black leading-none text-white shadow-[0_10px_20px_rgba(217,65,47,0.22)]">
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
  const priceClass = tone === "light" ? "text-white" : deal ? "price-now-deal" : "price-now";
  const oldPriceClass = tone === "light" ? "text-white/50" : "price-old";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <strong className={`${strong ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"} ${priceClass} leading-none`}>
        {formatGel(price)}
      </strong>
      {oldPrice ? <span className={`${oldPriceClass} text-xs font-bold line-through sm:text-sm`}>{formatGel(oldPrice)}</span> : null}
    </div>
  );
}

export function LastUpdatedText({ value, exact = false, className = "" }: { value: string | Date; exact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 text-[var(--muted)] ${className}`}>
      <Clock3 className="size-3 shrink-0" />
      <span className="min-w-0">
        <span className="block">{formatRelativeUpdated(value)}</span>
        {exact ? <span className="block text-[11px] font-semibold text-[var(--muted)]">{formatUpdated(value)}</span> : null}
      </span>
    </span>
  );
}

export function ShopMark({ shop, size = "md" }: { shop: Pick<ShopView, "name" | "logoUrl">; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "size-7" : "size-10";
  return (
    <span className={`relative grid ${dimension} shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--line)] bg-white text-[11px] font-black text-[var(--brand)]`}>
      {shop.logoUrl ? <Image src={shop.logoUrl} alt="" fill unoptimized className="object-contain p-1" /> : shop.name.slice(0, 1)}
    </span>
  );
}

export function ShopStatusBadge({ shop }: { shop: ShopView }) {
  const hasComparedProducts = shop.productCount == null ? Boolean(shop.lastScrapedAt) : shop.productCount > 0;
  const meta =
    hasComparedProducts && shop.lastScrapedAt
      ? { label: "აქტიური", className: "border-[#bfeecf] bg-[var(--savings-soft)] text-[var(--savings)]" }
      : shop.enabled
        ? { label: "მონაცემები მოწმდება", className: "border-[#ffdca6] bg-[var(--warn-soft)] text-[var(--warn)]" }
        : { label: "მალე დაემატება", className: "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]" };

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${meta.className}`}>
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow text-[var(--accent-strong)]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-black text-[var(--brand)] sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-3 text-sm font-black text-[var(--brand)] hover:bg-[var(--accent-soft)]">
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
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]">
          <Icon className="size-5" />
        </span>
        <h2 className="mt-4 text-lg font-black text-[var(--brand)]">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{description}</p>
        {href ? (
          <Link href={href} className="mt-5 inline-flex h-10 items-center rounded-xl bg-[var(--brand)] px-4 text-sm font-black text-white hover:bg-black">
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
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#f5beb7] bg-[#fff1ef] text-[var(--danger)]">
          <AlertCircle className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-black text-[var(--brand)]">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function TrustNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`surface-flat ${compact ? "p-4" : "p-5"}`}>
      <p className="flex gap-2 text-sm font-black text-[var(--brand)]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--accent-strong)]" />
        ფასები და მარაგი რეგულარულად ახლდება.
      </p>
      <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">
        ყიდვამდე საბოლოო ფასი ყოველთვის გადაამოწმე მაღაზიის ოფიციალურ გვერდზე.
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
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="aspect-square animate-pulse bg-[var(--surface-soft)]" />
      <div className="grid gap-2 p-3">
        <div className="h-4 w-20 animate-pulse rounded bg-[var(--surface-soft)]" />
        <div className="h-8 animate-pulse rounded bg-[var(--surface-soft)]" />
        <div className="h-6 w-24 animate-pulse rounded bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}
