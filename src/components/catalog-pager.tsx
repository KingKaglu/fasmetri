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
      className="mt-8 flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
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
        <span className="text-gray-500">გვერდი</span>
        <span className="flex size-8 items-center justify-center rounded-md bg-gray-900 text-sm font-semibold text-white">
          {currentPage}
        </span>
        {hasNext && (
          <>
            <span className="text-gray-300">·</span>
            <Link
              href={pageHref(baseHref, params, currentPage + 1)}
              className="flex size-8 items-center justify-center rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            >
              {currentPage + 1}
            </Link>
          </>
        )}
        {!hasNext && (
          <span className="text-xs text-gray-400">ბოლო</span>
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
      className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
        direction === "next"
          ? "border-gray-900 bg-gray-900 text-white hover:bg-black"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {direction === "prev" && <Icon className="size-4" />}
      {label}
      {direction === "next" && <Icon className="size-4" />}
    </Link>
  );
}

function PagerGhost({ label, direction }: { label: string; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm font-semibold text-gray-300 cursor-not-allowed">
      {direction === "prev" && <Icon className="size-4" />}
      {label}
      {direction === "next" && <Icon className="size-4" />}
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
