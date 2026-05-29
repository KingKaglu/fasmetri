import { ProductCardSkeleton } from "@/components/public-ui";

export function PageLoading({ cards = 12 }: { cards?: number }) {
  return (
    <section className="shell py-8">
      <div className="mb-5 grid gap-2 border-b border-[#e2e8f0] pb-4">
        <div className="h-3 w-24 animate-pulse rounded bg-[#e2e8f0]" />
        <div className="h-7 w-full max-w-md animate-pulse rounded bg-[#e2e8f0]" />
      </div>
      <div className="product-grid-dense grid">
        {Array.from({ length: cards }).map((_, index) => <ProductCardSkeleton key={index} />)}
      </div>
    </section>
  );
}
