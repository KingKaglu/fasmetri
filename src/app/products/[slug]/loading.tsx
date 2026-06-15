// Route-level skeleton for the product detail page. Mirrors the real layout in
// page.tsx (same `shell` container, breadcrumb, `lg:grid-cols-[minmax(0,1fr)_280px]`
// main+sidebar split, and the hero `md:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]`
// image/info two-column) so there is no layout shift when content swaps in.
// Server-renderable, no client JS.

export default function Loading() {
  return (
    <section className="shell py-5 sm:py-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="h-3 w-12 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-3 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-3 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-w-0 gap-8">
          {/* Product hero: image + info */}
          <article className="grid min-w-0 gap-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]">
            <div className="aspect-square animate-pulse rounded-lg border border-gray-100 bg-gray-100" />
            <div className="flex min-w-0 flex-col gap-3">
              {/* Badges row */}
              <div className="flex gap-1.5">
                <div className="h-5 w-24 animate-pulse rounded-full bg-gray-100" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
              </div>
              {/* Title */}
              <div className="h-7 w-full max-w-md animate-pulse rounded bg-gray-100" />
              <div className="h-7 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
              {/* Price block */}
              <div className="mt-2 border-t border-gray-100 pt-4">
                <div className="mb-2 h-2.5 w-20 animate-pulse rounded bg-gray-100" />
                <div className="h-9 w-40 animate-pulse rounded bg-gray-100" />
              </div>
              {/* Price stats */}
              <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-md bg-gray-100" />
                ))}
              </div>
              {/* Trust metrics */}
              <div className="grid gap-1.5 min-[420px]:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-md bg-gray-100" />
                ))}
              </div>
              {/* Best shop card */}
              <div className="h-14 animate-pulse rounded-lg bg-gray-100" />
              {/* CTA */}
              <div className="h-11 w-full animate-pulse rounded-md bg-gray-100 sm:w-48" />
            </div>
          </article>

          {/* All offers list */}
          <div>
            <div className="mb-3 grid gap-2">
              <div className="h-2.5 w-16 animate-pulse rounded bg-gray-100" />
              <div className="h-6 w-48 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="grid min-w-0 gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="size-12 shrink-0 animate-pulse rounded-md bg-gray-100" />
                    <div className="grid min-w-0 flex-1 gap-2">
                      <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                    <div className="h-7 w-24 animate-pulse rounded bg-gray-100" />
                    <div className="h-9 w-20 animate-pulse rounded-md bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price history */}
          <div>
            <div className="mb-3 grid gap-2">
              <div className="h-2.5 w-16 animate-pulse rounded bg-gray-100" />
              <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-56 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
          </div>

          {/* Similar products grid */}
          <div>
            <div className="mb-3 grid gap-2">
              <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100" />
              <div className="h-6 w-56 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="product-grid-dense grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className="aspect-square animate-pulse bg-gray-100" />
                  <div className="grid gap-2 p-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                    <div className="h-8 animate-pulse rounded bg-gray-100" />
                    <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: alert form + trust note */}
        <aside className="grid h-fit gap-3 lg:sticky lg:top-[4.5rem]">
          <div className="h-44 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
          <div className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
        </aside>
      </div>
    </section>
  );
}
