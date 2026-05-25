import Link from "next/link";

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
    <nav aria-label="კატალოგის გვერდები" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white/90 p-3 shadow-sm">
      <span className="text-sm font-black text-[#64748b]">გვერდი {currentPage}</span>
      <div className="flex flex-wrap items-center gap-2">
        {currentPage > 1 ? (
          <Link href={pageHref(baseHref, params, currentPage - 1)} className="inline-flex h-10 items-center rounded-md border px-3 text-sm font-black text-[#003f9f] hover:border-[#0054d2] hover:bg-[#eef5ff]">
            წინა
          </Link>
        ) : null}
        {hasNext ? (
          <Link href={pageHref(baseHref, params, currentPage + 1)} className="inline-flex h-10 items-center rounded-md bg-[#12203a] px-3 text-sm font-black text-white hover:bg-[#0054d2]">
            შემდეგი
          </Link>
        ) : null}
      </div>
    </nav>
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
