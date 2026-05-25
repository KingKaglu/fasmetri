import { ProductCardSkeleton } from "@/components/public-ui";

export function PageLoading({ cards = 6 }: { cards?: number }) {
  return (
    <section className="shell py-10">
      <div className="mb-6 grid gap-3">
        <div className="h-5 w-28 animate-pulse rounded bg-[#dfeceb]" />
        <div className="h-10 w-full max-w-xl animate-pulse rounded bg-[#dfeceb]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => <ProductCardSkeleton key={index} />)}
      </div>
    </section>
  );
}
