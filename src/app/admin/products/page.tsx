import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ChevronDown, ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { AdminDebouncedSearch } from "@/components/admin-search";
import {
  AdminEmptyState,
  AdminLoginShell,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminShopAvatar,
  AdminStatusPill,
} from "@/components/admin-ui";
import { AdminProductThumb } from "@/components/admin-product-thumb";
import { ProductBulkBar, ProductBulkProvider, ProductSelectCheckbox } from "@/components/admin-products-bulk";
import { UnlinkOfferButton } from "@/components/admin-unlink-button";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatGel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  if (!prisma) {
    return (
      <AdminShell>
        <AdminEmptyState title="DATABASE_URL არ არის მითითებული" />
      </AdminShell>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q)?.trim() || undefined;
  const categoryParam = firstParam(params.category);
  const category = categoryParam === "mobiles" || categoryParam === "laptops" ? categoryParam : undefined;
  const shopSlug = firstParam(params.shop) || undefined;
  const linkedParam = firstParam(params.linked);
  const linked = linkedParam === "orphan" || linkedParam === "linked" ? linkedParam : undefined;
  const page = Math.max(1, Number(firstParam(params.page)) || 1);

  const offerFilters: Prisma.CanonicalProductWhereInput[] = [];
  if (shopSlug) offerFilters.push({ offers: { some: { isActive: true, shop: { slug: shopSlug } } } });
  if (linked === "orphan") offerFilters.push({ offers: { none: { isActive: true } } });
  if (linked === "linked") offerFilters.push({ offers: { some: { isActive: true } } });

  const where: Prisma.CanonicalProductWhereInput = {
    categorySlug: category,
    AND: offerFilters.length ? offerFilters : undefined,
    OR: q
      ? [
          { title: { contains: q, mode: "insensitive" } },
          { normalizedTitle: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { canonicalKey: { contains: q, mode: "insensitive" } },
        ]
      : undefined,
  };

  const [total, products, shops] = await Promise.all([
    prisma.canonicalProduct.count({ where }),
    prisma.canonicalProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        product: { select: { slug: true } },
        offers: {
          orderBy: [{ isActive: "desc" }, { currentPrice: "asc" }],
          include: { shop: { select: { name: true, slug: true } } },
        },
      },
    }),
    prisma.shop.findMany({
      where: { offers: { some: { isActive: true } } },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const query = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { q, category, shop: shopSlug, linked, page: undefined, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const text = next.toString();
    return text ? `/admin/products?${text}` : "/admin/products";
  };

  const chip = (active: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-xs font-black transition ${
      active ? "bg-[#151713] text-white" : "border border-[#c8d7bd] bg-white text-[var(--brand)] hover:border-[#151713]"
    }`;

  return (
    <AdminShell>
      <ProductBulkProvider>
      <AdminPageHeader
        breadcrumbs={[{ label: "ადმინი", href: "/admin" }, { label: "პროდუქტები" }]}
        title="პროდუქტები"
        description="ყველა canonical პროდუქტი მიბმული შეთავაზებებით. გახსენი რიგი ყველა მაღაზიის შეთავაზების სანახავად, ცუდი match-ის მოსახსნელად ან მონიშნე რამდენიმე bulk მოქმედებისთვის (გაერთიანება, დაშლა, ობლების წაშლა)."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard label="ნაპოვნია" value={total} tone="info" detail={q ? `ძიება: ${q}` : "სრული კატალოგი"} />
        <AdminMetricCard label="გვერდი" value={`${page}/${totalPages}`} />
        <AdminMetricCard label="კატეგორია" value={category ?? "ყველა"} />
      </div>

      <AdminPanel>
        <div className="grid gap-3 p-4">
          <AdminDebouncedSearch placeholder="ძიება სახელით, ბრენდით ან canonical key-თ…" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">კატეგორია</span>
            <Link href={query({ category: undefined })} className={chip(!category)}>ყველა</Link>
            <Link href={query({ category: "mobiles" })} className={chip(category === "mobiles")}>ტელეფონები</Link>
            <Link href={query({ category: "laptops" })} className={chip(category === "laptops")}>ლეპტოპები</Link>
            <span className="ml-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">სტატუსი</span>
            <Link href={query({ linked: undefined })} className={chip(!linked)}>ყველა</Link>
            <Link href={query({ linked: "linked" })} className={chip(linked === "linked")}>აქტიური შეთავაზებით</Link>
            <Link href={query({ linked: "orphan" })} className={chip(linked === "orphan")}>ობოლი</Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">მაღაზია</span>
            <Link href={query({ shop: undefined })} className={chip(!shopSlug)}>ყველა</Link>
            {shops.map((shop) => (
              <Link key={shop.slug} href={query({ shop: shop.slug })} className={chip(shopSlug === shop.slug)}>
                {shop.name}
              </Link>
            ))}
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="hidden grid-cols-[1.25rem_minmax(0,1.6fr)_repeat(4,minmax(0,auto))_1.25rem] gap-3 border-b border-[#dbe5d3] bg-[#f8fbf4] px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)] sm:grid">
          <span />
          <span>პროდუქტი</span>
          <span>კატეგორია</span>
          <span className="text-right">შეთავაზებები</span>
          <span className="text-right">ფასი</span>
          <span className="text-right">ფასი განახლდა</span>
          <span />
        </div>
        <div className="divide-y divide-[#edf2e8]">
          {products.map((product) => {
            const activeOffers = product.offers.filter((offer) => offer.isActive);
            const storeCount = new Set(activeOffers.map((offer) => offer.shop.slug)).size;
            const prices = activeOffers.map((offer) => Number(offer.currentPrice)).filter((price) => price > 0);
            const minPrice = prices.length ? Math.min(...prices) : null;
            const maxPrice = prices.length ? Math.max(...prices) : null;
            const priceChangeTimes = product.offers
              .map((offer) => offer.lastPriceChangedAt?.getTime())
              .filter((time): time is number => Boolean(time));
            const lastPriceUpdate = priceChangeTimes.length ? new Date(Math.max(...priceChangeTimes)) : null;
            return (
              <details key={product.id} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 p-4 hover:bg-[#f8fbf4] sm:grid-cols-[1.25rem_minmax(0,1.6fr)_repeat(4,minmax(0,auto))_1.25rem]">
                  <ProductSelectCheckbox id={product.id} title={product.title} activeOffers={activeOffers.length} />
                  <div className="flex min-w-0 items-center gap-3">
                    <AdminProductThumb src={product.primaryImage} alt={product.title} />
                    <div className="min-w-0">
                    <p className="break-words font-black leading-snug text-[var(--brand)]">{product.title}</p>
                    <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">
                      {product.brand} — განახლდა {formatRelativeTime(product.updatedAt)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                      <AdminStatusPill tone="info">{product.categorySlug}</AdminStatusPill>
                      <AdminStatusPill tone={activeOffers.length ? "good" : "warn"}>
                        {storeCount} მაღაზია / {activeOffers.length} შეთავაზება
                      </AdminStatusPill>
                      <AdminStatusPill tone="neutral">ფასი: {lastPriceUpdate ? formatRelativeTime(lastPriceUpdate) : "—"}</AdminStatusPill>
                    </div>
                    </div>
                  </div>
                  <div className="hidden sm:block"><AdminStatusPill tone="info">{product.categorySlug}</AdminStatusPill></div>
                  <div className="hidden text-right text-sm font-black text-[var(--brand)] sm:block">
                    {storeCount} მაღაზია / {activeOffers.length} შეთავაზება
                  </div>
                  <div className="text-right text-sm font-black tabular-nums text-[#087d8f]">
                    {minPrice == null ? "—" : maxPrice !== minPrice ? `${formatGel(minPrice)} – ${formatGel(maxPrice!)}` : formatGel(minPrice)}
                  </div>
                  <div className="hidden text-right text-xs font-bold text-[var(--muted)] sm:block">
                    {lastPriceUpdate ? formatRelativeTime(lastPriceUpdate) : "—"}
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-[var(--muted)] transition group-open:rotate-180" />
                </summary>

                <div className="grid gap-2 border-t border-[#edf2e8] bg-[#f8fbf4] p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--muted)]">
                    <span className="break-all">key: {product.canonicalKey}</span>
                    {product.product?.slug ? (
                      <Link href={`/products/${product.product.slug}`} target="_blank" className="inline-flex items-center gap-1 font-black text-[var(--brand)] underline-offset-2 hover:underline">
                        Public page <ExternalLink className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                  {product.offers.map((offer) => {
                    const availabilityTone =
                      offer.availability === "IN_STOCK" ? "good" : offer.availability === "OUT_OF_STOCK" ? "danger" : "warn";
                    return (
                      <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dbe5d3] bg-white p-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <AdminProductThumb src={offer.imageUrl} alt={offer.title} size={36} />
                          <AdminShopAvatar name={offer.shop.name} slug={offer.shop.slug} />
                          <div className="min-w-0">
                            <p className="break-words text-sm font-black text-[var(--brand)]">
                              {offer.shop.name} — {offer.title}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-[var(--muted)]">
                              <span className="tabular-nums">{formatGel(Number(offer.currentPrice))}</span>
                              <AdminStatusPill tone={availabilityTone}>{offer.availability}</AdminStatusPill>
                              {offer.isActive ? null : <AdminStatusPill tone="danger">inactive</AdminStatusPill>}
                              {offer.matchConfidence != null ? <AdminStatusPill tone="info">match {offer.matchConfidence}%</AdminStatusPill> : null}
                              {offer.lastPriceChangedAt ? <span>ფასი განახლდა {formatRelativeTime(offer.lastPriceChangedAt)}</span> : null}
                            </p>
                            <a
                              href={offer.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block max-w-md truncate text-xs font-bold text-[#087d8f] underline-offset-2 hover:underline"
                            >
                              {offer.url}
                            </a>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={offer.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#c8d7bd] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#151713]">
                            ნახვა <ExternalLink className="size-3.5" />
                          </a>
                          <UnlinkOfferButton offerId={offer.id} offerTitle={`${offer.shop.name}: ${offer.title}`} />
                        </div>
                      </div>
                    );
                  })}
                  {!product.offers.length ? <p className="text-sm font-bold text-[var(--muted)]">შეთავაზება არ აქვს.</p> : null}
                </div>
              </details>
            );
          })}
        </div>
        {!products.length ? <div className="p-4"><AdminEmptyState title="პროდუქტი ვერ მოიძებნა" /></div> : null}
      </AdminPanel>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {page > 1 ? (
            <Link href={query({ page: String(page - 1) })} className="inline-flex h-10 items-center rounded-2xl border border-[#c8d7bd] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#151713]">
              წინა
            </Link>
          ) : null}
          <span className="text-sm font-black text-[var(--muted)]">{page} / {totalPages}</span>
          {page < totalPages ? (
            <Link href={query({ page: String(page + 1) })} className="inline-flex h-10 items-center rounded-2xl border border-[#c8d7bd] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#151713]">
              შემდეგი
            </Link>
          ) : null}
        </div>
      ) : null}

      <ProductBulkBar />
      </ProductBulkProvider>
    </AdminShell>
  );
}
