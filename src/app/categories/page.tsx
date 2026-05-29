import { Metadata } from "next";
import { Boxes } from "lucide-react";
import { listPublicCategories } from "@/lib/catalog";
import { CategoryCard } from "@/components/category-card";
import { EmptyState } from "@/components/public-ui";

export const metadata: Metadata = {
  title: "კატეგორიები",
  description: "შეარჩიე კატეგორია და შეადარე ფასები ქართულ ონლაინ მაღაზიებში.",
  alternates: { canonical: "/categories" },
};
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listPublicCategories();
  const publicCategories = categories.filter((category) => (category.productCount ?? 0) > 0);

  return (
    <section className="shell py-7 sm:py-10">
      <div className="mb-6 border-b border-[#e2e8f0] pb-4">
        <p className="eyebrow inline-flex items-center gap-1.5 text-[#65a30d]"><Boxes className="size-3.5" /> კატალოგი</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl">კატეგორიები</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#64748b]">იპოვე შეთავაზებები ტექნიკაში, სახლში, მოვლაში და ყოველდღიურ საყიდლებში.</p>
      </div>
      {publicCategories.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {publicCategories.map((category) => <CategoryCard key={category.id} category={category} comingSoon={(category.productCount ?? 0) === 0} />)}
        </div>
      ) : <EmptyState title="კატეგორიები მალე შეივსება" description="მონაცემები უკვე მოწმდება და ახალი კატეგორიები ეტაპობრივად დაემატება." />}
    </section>
  );
}
