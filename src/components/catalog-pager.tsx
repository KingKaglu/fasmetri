import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type SearchParams = Record<string, string | string[] | undefined>;

export function CatalogPager({
  baseHref,
  params,
  page,
  hasNext,
}: {
  baseHref: string;
  params: SearchParams;
  page?: number;
  hasNext: boolean;
}) {
  const currentPage = normalizePage(page);
  if (currentPage === 1 && !hasNext) return null;

  return (
    <nav
      aria-label="კატალოგის გვერდები"
      className="mt-8 overflow-hidden rounded-3xl border border-white/70 bg-white/88 p-2 shadow-[0_14px_34px_rgba(18,19,15,0.08)] ring-1 ring-black/[0.03]"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="hidden sm:block">
          {currentPage > 1 ? (
            <PagerLink href={pageHref(baseHref, params, currentPage - 1)} direction="prev" label="წინა გვერდი" />
          ) : (
            <PagerGhost label="პირველი გვერდი" />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-4 py-3">
          <span className="text-[11px] font-black uppercase text-[var(--muted)]">გვერდი</span>
          <span className="grid size-9 place-items-center rounded-full bg-[var(--brand)] text-sm font-black text-white">
            {currentPage}
          </span>
          <span className="text-[11px] font-black uppercase text-[var(--muted)]">{hasNext ? "კიდევ არის" : "ბოლოა"}</span>
        </div>

        <div className="hidden justify-end sm:flex">
          {hasNext ? (
            <PagerLink href={pageHref(baseHref, params, currentPage + 1)} direction="next" label="შემდეგი გვერდი" primary />
          ) : (
            <PagerGhost label="ბოლო გვერდი" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {currentPage > 1 ? (
            <PagerLink href={pageHref(baseHref, params, currentPage - 1)} direction="prev" label="წინა" />
          ) : (
            <PagerGhost label="პირველი" />
          )}
          {hasNext ? (
            <PagerLink href={pageHref(baseHref, params, currentPage + 1)} direction="next" label="შემდეგი" primary />
          ) : (
            <PagerGhost label="ბოლო" />
          )}
        </div>
      </div>
    </nav>
  );
}

function PagerLink({
  href,
  label,
  direction,
  primary = false,
}: {
  href: string;
  label: string;
  direction: "prev" | "next";
  primary?: boolean;
}) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={href}
      className={`inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ${
        primary
          ? "bg-[var(--brand)] text-white shadow-[0_14px_26px_rgba(18,19,15,0.18)] hover:-translate-y-0.5 hover:bg-black"
          : "border border-[var(--line)] bg-white text-[var(--brand)] hover:border-[var(--brand)] hover:bg-[var(--surface-soft)]"
      }`}
    >
      {direction === "prev" ? <Icon className="size-4" /> : null}
      <span className="truncate">{label}</span>
      {direction === "next" ? <Icon className="size-4" /> : null}
    </Link>
  );
}

function PagerGhost({ label }: { label: string }) {
  return (
    <span className="inline-flex h-12 min-w-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-sm font-black text-[var(--muted)] opacity-70">
      {label}
    </span>
  );
}

function pageHref(baseHref: string, params: SearchParams, page: number) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value == null || value === "") continue;
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => query.append(key, item));
    } else {
      query.set(key, value);
    }
  }

  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return suffix ? `${baseHref}?${suffix}` : baseHref;
}

function normalizePage(page?: number) {
  if (!page || !Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}
