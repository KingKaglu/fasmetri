import Link from "next/link";
import {
  ArrowRight,
  Baby,
  BookOpen,
  CarFront,
  Dumbbell,
  Footprints,
  House,
  Laptop,
  Leaf,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Sparkles,
  Sofa,
  Tv,
  Wrench,
} from "lucide-react";
import { CategoryView } from "@/lib/catalog-types";

const descriptions: Record<string, string> = {
  mobiles: "სმარტფონები, iPhone, Galaxy, Xiaomi და სხვა პოპულარული მოდელები.",
  laptops: "ლეპტოპები ყოველდღიური, სამუშაო და gaming ბიუჯეტებისთვის.",
  tablets: "ტაბლეტები მუშაობის, სწავლისა და გართობისთვის.",
  audio: "ყურსასმენები, დინამიკები და აუდიო მოწყობილობები.",
  wearables: "სმარტ საათები და ყოველდღიური wearable მოწყობილობები.",
  gaming: "კონსოლები, კონტროლერები და gaming აქსესუარები.",
  televisions: "ტელევიზორები და სახლის დიდი ეკრანები.",
  monitors: "სამუშაო და gaming მონიტორები.",
};

const accentColors: Record<string, string> = {
  mobiles: "bg-blue-50 text-blue-600",
  laptops: "bg-violet-50 text-violet-600",
  tablets: "bg-sky-50 text-sky-600",
  audio: "bg-purple-50 text-purple-600",
  wearables: "bg-rose-50 text-rose-600",
  gaming: "bg-orange-50 text-orange-600",
  televisions: "bg-teal-50 text-teal-600",
  monitors: "bg-indigo-50 text-indigo-600",
};

export function CategoryCard({ category, comingSoon = false }: { category: CategoryView; comingSoon?: boolean }) {
  const colorClass = accentColors[category.slug] ?? "bg-gray-100 text-gray-600";

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex min-h-36 flex-col gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-10 place-items-center rounded-lg ${colorClass}`}>
          {categoryIcon(category.slug)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            comingSoon
              ? "bg-amber-50 text-amber-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {comingSoon ? "მალე" : `${(category.productCount ?? 0).toLocaleString()} პროდუქტი`}
        </span>
      </div>

      <div className="flex-1">
        <h2 className="font-semibold text-gray-900 group-hover:text-[var(--accent)]">
          {category.nameKa}
        </h2>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-gray-500">
          {descriptions[category.slug] ?? "შეთავაზებები ამ კატეგორიაში რეგულარულად ახლდება."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2 text-xs">
        <span className="text-gray-400">{(category.dealCount ?? 0).toLocaleString()} აქტიური აქცია</span>
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]">
          გახსნა <ArrowRight className="size-3" />
        </span>
      </div>
    </Link>
  );
}

function categoryIcon(slug: string) {
  if (slug === "mobiles" || slug === "tablets" || slug === "tablet-accessories" || slug === "phone-accessories" || slug === "wearables") return <Smartphone className="size-5" />;
  if (slug === "computers" || slug === "computer-accessories" || slug === "cables-adapters" || slug === "laptops") return <Laptop className="size-5" />;
  if (slug === "televisions" || slug === "monitors" || slug === "audio" || slug === "gaming") return <Tv className="size-5" />;
  if (slug === "clothing") return <Shirt className="size-5" />;
  if (slug === "shoes") return <Footprints className="size-5" />;
  if (slug === "beauty") return <Sparkles className="size-5" />;
  if (slug === "furniture") return <Sofa className="size-5" />;
  if (slug === "home-garden" || slug === "home-appliances" || slug === "refrigerators" || slug === "washing-machines" || slug === "small-appliances" || slug === "kitchen-dishes" || slug === "air-conditioners") return <House className="size-5" />;
  if (slug === "sport") return <Dumbbell className="size-5" />;
  if (slug === "kids") return <Baby className="size-5" />;
  if (slug === "auto-accessories") return <CarFront className="size-5" />;
  if (slug === "supermarket") return <Leaf className="size-5" />;
  if (slug === "books-stationery") return <BookOpen className="size-5" />;
  if (slug === "pets") return <PawPrint className="size-5" />;
  if (slug === "tools") return <Wrench className="size-5" />;
  return <Package className="size-5" />;
}
