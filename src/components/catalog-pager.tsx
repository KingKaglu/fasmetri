import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      className="mt-8 flex items-center justify-between gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-3 shadow-sm sm:gap-2 sm:px-4"
    >
      {/* Previous */}
      <div className="flex-1">
        {currentPage > 1 ? (
          <PagerLink href={pageHref(baseHref, params, currentPage - 1)} direction="prev" label="წინა" />
        ) : (
          <PagerGhost label="წინა" direction="prev" />
        )}
      </div>

      {/* Page indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">გვერდი</span>
        <span className="flex size-8 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-ink">
          {currentPage}
        </span>
        {hasNext && (
          <>
            <span className="text-subtle">·</span>
            <Link
              href={pageHref(baseHref, params, currentPage + 1)}
              className="flex size-8 items-center justify-center rounded-md border border-line text-sm font-medium text-ink-soft hover:border-line-strong hover:bg-surface-soft"
            >
              {currentPage + 1}
            </Link>
          </>
        )}
        {!hasNext && (
          <span className="text-xs text-muted">ბოლო</span>
        )}
      </div>

      {/* Next */}
      <div className="flex flex-1 justify-end">
        {hasNext ? (
          <PagerLink href={pageHref(baseHref, params, currentPage + 1)} direction="next" label="შემდეგი" />
        ) : (
          <PagerGhost label="შემდეგი" direction="next" />
        )}
      </div>
    </nav>
  );
}

function PagerLink({
  href,
  label,
  direction,
}: {
  href: string;
  label: string;
  direction: "prev" | "next";
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-sm font-semibold transition-colors sm:px-3 ${
        direction === "next"
          ? "border-accent bg-accent text-accent-ink hover:bg-accent-strong"
          : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-soft"
      }`}
    >
      {direction === "prev" && <Icon className="size-4 shrink-0" />}
      {/* Text label hides on the narrowest phones so prev/next stay a single
          non-wrapping row; icon alone is understood, aria-label keeps it named. */}
      <span className="hidden min-[380px]:inline">{label}</span>
      {direction === "next" && <Icon className="size-4 shrink-0" />}
    </Link>
  );
}

function PagerGhost({ label, direction }: { label: string; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <span
      aria-label={label}
      className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md border border-line bg-surface-soft px-2.5 text-sm font-semibold text-subtle sm:px-3"
    >
      {direction === "prev" && <Icon className="size-4 shrink-0" />}
      <span className="hidden min-[380px]:inline">{label}</span>
      {direction === "next" && <Icon className="size-4 shrink-0" />}
    </span>
  );
}

function pageHref(baseHref: string, params: SearchParams, page: number) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value == null || value === "") continue;
    const safeKey = safeQueryPart(key, 80);
    if (!safeKey) continue;
    if (Array.isArray(value)) {
      value
        .map((item) => safeQueryPart(item, 180))
        .filter((item): item is string => Boolean(item))
        .forEach((item) => query.append(safeKey, item));
    } else {
      const safeValue = safeQueryPart(value, 180);
      if (safeValue) query.set(safeKey, safeValue);
    }
  }

  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return suffix ? `${baseHref}?${suffix}` : baseHref;
}

function safeQueryPart(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return trimmed || null;
}

function normalizePage(page?: number) {
  if (!page || !Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}
