import { Metadata } from "next";
import { Boxes } from "lucide-react";
import { listPublicCategories } from "@/lib/catalog";
import { CategoryCard } from "@/components/category-card";
import { EmptyState } from "@/components/public-ui";

export const metadata: Metadata = {
  title: "კატეგორიები",
  description: "შეადარე ტელეფონებისა და ლეპტოპების ფასები ქართულ ონლაინ მაღაზიებში.",
  alternates: { canonical: "/categories" },
};
export const revalidate = 600;

export default async function CategoriesPage() {
  const categories = await listPublicCategories();
  const publicCategories = categories.filter((category) => (category.productCount ?? 0) > 0);

  return (
    <section className="shell py-7 sm:py-10">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <p className="eyebrow inline-flex items-center gap-1.5"><Boxes className="size-3.5" /> კატალოგი</p>
        <h1 className="font-display mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">კატეგორიები</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">ფასმეტრი აჩვენებს დამოწმებულ შეთავაზებებს: ტელეფონები, ლეპტოპები, კონსოლები, ტელევიზორები, აუდიო და სმარტ საათები.</p>
      </div>
      {publicCategories.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {publicCategories.map((category) => <CategoryCard key={category.id} category={category} comingSoon={(category.productCount ?? 0) === 0} />)}
        </div>
      ) : <EmptyState title="კატეგორიები მალე შეივსება" description="ტელეფონებისა და ლეპტოპების შეთავაზებები უკვე მოწმდება." />}
    </section>
  );
}
