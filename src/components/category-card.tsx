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

export function CategoryCard({ category, comingSoon = false }: { category: CategoryView; comingSoon?: boolean }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative flex min-h-44 flex-col gap-3 overflow-hidden rounded-2xl border border-white/70 bg-white/88 p-4 shadow-[0_10px_26px_rgba(18,19,15,0.07)] ring-1 ring-black/[0.03] transition hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(18,19,15,0.13)]"
    >
      <span className="absolute -right-8 -top-10 size-28 rounded-full bg-[var(--accent-soft)] transition group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--brand)] text-[var(--accent)] shadow-[0_12px_26px_rgba(18,19,15,0.16)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)]">
          {categoryIcon(category.slug)}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${
            comingSoon
              ? "border-[#ffdca6] bg-[var(--warn-soft)] text-[var(--warn)]"
              : "border-[var(--line)] bg-white text-[var(--brand)]"
          }`}
        >
          {comingSoon ? "მალე" : `სულ ${(category.productCount ?? 0).toLocaleString()} უნიკალური პროდუქტი`}
        </span>
      </div>
      <div className="relative flex-1">
        <h2 className="text-lg font-black text-[var(--brand)] group-hover:text-[var(--accent-strong)]">
          {category.nameKa}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--muted)]">
          {descriptions[category.slug] ?? "შეთავაზებები ამ კატეგორიაში რეგულარულად ახლდება."}
        </p>
      </div>
      <div className="relative flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-xs font-black">
        <span className="text-[var(--muted)]">სულ {(category.dealCount ?? 0).toLocaleString()} აქტიური აქცია</span>
        <span className="inline-flex items-center gap-1 text-[var(--brand)] group-hover:text-[var(--accent-strong)]">
          გახსნა <ArrowRight className="size-3.5" />
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
