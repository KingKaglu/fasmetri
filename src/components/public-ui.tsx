import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, Clock3, PackageSearch, ShieldCheck, Store } from "lucide-react";
import { Availability, ShopView } from "@/lib/catalog-types";
import { formatGel, formatRelativeUpdated, formatUpdated } from "@/lib/format";
export { ProductImage } from "@/components/product-image";

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const meta =
    availability === "IN_STOCK"
      ? { label: "მარაგშია", style: "bg-[#eaf8ef] text-[#15803d] ring-[#bbefcc]" }
      : availability === "OUT_OF_STOCK"
        ? { label: "არ არის მარაგში", style: "bg-[#f1f5f9] text-[#64748b] ring-[#d9e4f2]" }
        : { label: "მოწმდება", style: "bg-[#fff1e8] text-[#c2410c] ring-[#fed7aa]" };

  return <span className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-black ring-1 ${meta.style}`}>{meta.label}</span>;
}

export function DiscountBadge({ percent, label }: { percent: number; label?: string }) {
  if (!percent) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[#ff6800] px-2 py-0.5 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(255,104,0,.24)]">
      {label ?? `-${percent}%`}
    </span>
  );
}

export function PriceDisplay({ price, oldPrice, strong = false }: { price: number; oldPrice?: number | null; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
      <strong className={`${strong ? "text-4xl" : "text-xl sm:text-2xl"} font-black leading-none text-[#ff6800]`}>{formatGel(price)}</strong>
      {oldPrice ? <span className="text-sm font-bold text-[#64748b] line-through">{formatGel(oldPrice)}</span> : null}
    </div>
  );
}

export function LastUpdatedText({ value, exact = false, className = "" }: { value: string | Date; exact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-[#64748b] ${className}`}>
      <Clock3 className="size-3.5 shrink-0" />
      <span className="min-w-0">
        <span className="block">{formatRelativeUpdated(value)}</span>
        {exact ? <span className="block text-xs font-semibold text-[#64748b]">{formatUpdated(value)}</span> : null}
      </span>
    </span>
  );
}

export function ShopMark({ shop, size = "md" }: { shop: Pick<ShopView, "name" | "logoUrl">; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "size-8" : "size-11";
  return (
    <span className={`relative grid ${dimension} shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#d9e4f2] bg-white text-sm font-black text-[#0054d2] shadow-sm`}>
      {shop.logoUrl ? <Image src={shop.logoUrl} alt="" fill unoptimized className="object-contain p-1" /> : shop.name.slice(0, 1)}
    </span>
  );
}

export function ShopStatusBadge({ shop }: { shop: ShopView }) {
  const hasComparedProducts = shop.productCount == null ? Boolean(shop.lastScrapedAt) : shop.productCount > 0;
  const meta =
    hasComparedProducts && shop.lastScrapedAt
      ? { label: "აქტიური", style: "bg-[#eaf8ef] text-[#15803d]" }
    : shop.enabled
        ? { label: "მონაცემები მოწმდება", style: "bg-[#fff1e8] text-[#c2410c]" }
        : { label: "მალე დაემატება", style: "bg-[#f1f5f9] text-[#64748b]" };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${meta.style}`}>{meta.label}</span>;
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-sm font-black text-[#0054d2]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 leading-7 text-[#64748b]">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="inline-flex h-11 items-center gap-1 rounded-2xl border border-[#d9e4f2] bg-white px-4 text-sm font-black text-[#0054d2] shadow-sm hover:border-[#0054d2] hover:bg-[#eef5ff]">
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
    <div className="brand-card grid min-h-60 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#d9e4f2] bg-white text-[#0054d2] shadow-sm"><Icon className="size-6" /></span>
        <h2 className="mt-4 text-xl font-black">{title}</h2>
        <p className="mt-2 leading-7 text-[#64748b]">{description}</p>
        {href ? <Link href={href} className="mt-5 inline-flex h-11 items-center rounded-2xl bg-[#0054d2] px-4 font-black text-white hover:bg-[#003f9f]">{action}</Link> : null}
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
    <div className="brand-card grid min-h-60 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border bg-white text-[#dc2626] shadow-sm"><AlertCircle className="size-6" /></span>
        <h1 className="mt-4 text-2xl font-black">{title}</h1>
        <p className="mt-2 leading-7 text-[#64748b]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function TrustNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-card ${compact ? "p-4 text-sm" : "p-5"}`}>
      <p className="flex gap-2 font-black">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#0054d2]" />
        ფასები და მარაგის ინფორმაცია რეგულარულად ახლდება.
      </p>
      <p className="mt-2 leading-6 text-[#64748b]">შეძენამდე საბოლოო ფასი ყოველთვის გადაამოწმე მაღაზიის ვებსაიტზე.</p>
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
    <div className="overflow-hidden rounded-3xl border border-[#d9e4f2] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#eef5ff]" />
      <div className="grid gap-2.5 p-3">
        <div className="h-6 w-24 animate-pulse rounded bg-[#edf3f3]" />
        <div className="h-12 animate-pulse rounded bg-[#edf3f3]" />
        <div className="h-8 w-36 animate-pulse rounded bg-[#edf3f3]" />
        <div className="h-11 animate-pulse rounded bg-[#edf3f3]" />
      </div>
    </div>
  );
}
