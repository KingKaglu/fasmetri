import { ProductCardSkeleton } from "@/components/public-ui";

export default function SearchLoading() {
  return <section className="shell grid gap-4 py-10 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}</section>;
}
