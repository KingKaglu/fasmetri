import Link from "next/link";
import {
  AirVent,
  ArrowRight,
  Baby,
  BookOpen,
  CarFront,
  Frame,
  Microwave,
  Monitor,
  Refrigerator,
  WashingMachine,
  Dumbbell,
  Footprints,
  Gamepad2,
  Headphones,
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
  Watch,
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
  "home-appliances": "გაზქურები, ღუმელები, გამწოვები, მტვერსასრუტები და კონდიციონერები.",
  "small-appliances": "სამზარეულოს წვრილი ტექნიკა — მიკროტალღურები, ბლენდერები, ჩაიდნები.",
  beauty: "თმის საშრობები, სტაილერები, ეპილატორები და პირადი მოვლის ტექნიკა.",
  refrigerators: "მაცივრები, საყინულეები და ღვინის მაცივრები.",
  "washing-machines": "სარეცხი მანქანები, საშრობები და ჭურჭლის სარეცხი მანქანები.",
  "tv-mounts": "ტელევიზორის საკიდები და კრონშტეინები.",
};

// Friendly variety: each category gets a distinct soft-pastel tile so the
// grid reads as colorful and approachable at a glance.
const accentColors: Record<string, string> = {
  mobiles: "bg-blue-100 text-blue-600",
  laptops: "bg-violet-100 text-violet-600",
  tablets: "bg-sky-100 text-sky-600",
  audio: "bg-pink-100 text-pink-600",
  wearables: "bg-amber-100 text-amber-600",
  gaming: "bg-indigo-100 text-indigo-600",
  televisions: "bg-emerald-100 text-emerald-600",
  monitors: "bg-cyan-100 text-cyan-600",
  "home-appliances": "bg-orange-100 text-orange-600",
  "small-appliances": "bg-lime-100 text-lime-600",
  beauty: "bg-rose-100 text-rose-600",
  refrigerators: "bg-teal-100 text-teal-600",
  "washing-machines": "bg-slate-100 text-slate-600",
  "tv-mounts": "bg-stone-100 text-stone-600",
};

export function CategoryCard({
  category,
  comingSoon = false,
  layout = "card",
}: {
  category: CategoryView;
  comingSoon?: boolean;
  layout?: "card" | "row";
}) {
  const colorClass = accentColors[category.slug] ?? "bg-gray-100 text-gray-600";

  if (layout === "row") {
    return (
      <Link
        href={`/categories/${category.slug}`}
        className="card-hover group flex items-center gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        {/* Left: icon tile */}
        <span className={`grid size-14 shrink-0 place-items-center rounded-xl sm:size-16 ${colorClass}`}>
          {categoryIcon(category.slug, "lg")}
        </span>

        {/* Center: title + description + meta */}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-gray-900 group-hover:text-[var(--accent)] sm:text-lg">
            {category.nameKa}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-gray-500 sm:text-[13px]">
            {descriptions[category.slug] ?? "შეთავაზებები ამ კატეგორიაში რეგულარულად ახლდება."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-gray-500 sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold text-gray-900">{(category.productCount ?? 0).toLocaleString()}</span>
              პროდუქტი
            </span>
            {!comingSoon && (category.dealCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="font-semibold">{(category.dealCount ?? 0).toLocaleString()}</span>
                აქტიური აქცია
              </span>
            )}
            {comingSoon && (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-semibold text-zinc-600">მალე</span>
            )}
          </div>
        </div>

        {/* Right: open affordance */}
        <span className="hidden shrink-0 items-center gap-1.5 self-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-[var(--accent)] transition-colors group-hover:border-[var(--accent)] group-hover:bg-[var(--accent-soft)] sm:inline-flex">
          გახსნა
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
        <ArrowRight className="size-5 shrink-0 self-center text-[var(--accent)] sm:hidden" />
      </Link>
    );
  }

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="card-hover group flex min-h-36 flex-col gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-10 place-items-center rounded-lg ${colorClass}`}>
          {categoryIcon(category.slug)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            comingSoon
              ? "border border-zinc-200 bg-zinc-50 text-zinc-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {comingSoon ? "მალე" : `${(category.productCount ?? 0).toLocaleString()} პროდუქტი`}
        </span>
      </div>

      <div className="flex-1">
        <h2 className="font-display font-bold text-gray-900 group-hover:text-[var(--accent)]">
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

export function categoryIcon(slug: string, size: "md" | "lg" = "md") {
  const cls = size === "lg" ? "size-7" : "size-5";
  if (slug === "wearables") return <Watch className={cls} />;
  if (slug === "audio") return <Headphones className={cls} />;
  if (slug === "gaming") return <Gamepad2 className={cls} />;
  if (slug === "mobiles" || slug === "tablets" || slug === "tablet-accessories" || slug === "phone-accessories") return <Smartphone className={cls} />;
  if (slug === "computers" || slug === "computer-accessories" || slug === "cables-adapters" || slug === "laptops") return <Laptop className={cls} />;
  if (slug === "televisions") return <Tv className={cls} />;
  if (slug === "monitors") return <Monitor className={cls} />;
  if (slug === "tv-mounts") return <Frame className={cls} />;
  if (slug === "clothing") return <Shirt className={cls} />;
  if (slug === "shoes") return <Footprints className={cls} />;
  if (slug === "beauty") return <Sparkles className={cls} />;
  if (slug === "furniture") return <Sofa className={cls} />;
  if (slug === "refrigerators") return <Refrigerator className={cls} />;
  if (slug === "washing-machines") return <WashingMachine className={cls} />;
  if (slug === "small-appliances") return <Microwave className={cls} />;
  if (slug === "home-appliances" || slug === "air-conditioners") return <AirVent className={cls} />;
  if (slug === "home-garden" || slug === "kitchen-dishes") return <House className={cls} />;
  if (slug === "sport") return <Dumbbell className={cls} />;
  if (slug === "kids") return <Baby className={cls} />;
  if (slug === "auto-accessories") return <CarFront className={cls} />;
  if (slug === "supermarket") return <Leaf className={cls} />;
  if (slug === "books-stationery") return <BookOpen className={cls} />;
  if (slug === "pets") return <PawPrint className={cls} />;
  if (slug === "tools") return <Wrench className={cls} />;
  return <Package className={cls} />;
}
