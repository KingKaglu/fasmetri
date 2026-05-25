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
      <div className="mb-7 max-w-2xl">
        <p className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[#0054d2]"><Boxes className="size-4" /> კატალოგი</p>
        <h1 className="text-3xl font-black sm:text-4xl">კატეგორიები</h1>
        <p className="mt-2 leading-7 text-[#64748b]">იპოვე შეთავაზებები ტექნიკაში, სახლში, მოვლაში და ყოველდღიურ საყიდლებში.</p>
      </div>
      {publicCategories.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publicCategories.map((category) => <CategoryCard key={category.id} category={category} comingSoon={(category.productCount ?? 0) === 0} />)}
        </div>
      ) : <EmptyState title="კატეგორიები მალე შეივსება" description="მონაცემები უკვე მოწმდება და ახალი კატეგორიები ეტაპობრივად დაემატება." />}
    </section>
  );
}
