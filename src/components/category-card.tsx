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
import { formatNumber } from "@/lib/format";

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
  mobiles: "bg-tint-blue-soft text-tint-blue",
  laptops: "bg-tint-violet-soft text-tint-violet",
  tablets: "bg-tint-sky-soft text-tint-sky",
  audio: "bg-tint-pink-soft text-tint-pink",
  wearables: "bg-tint-amber-soft text-tint-amber",
  gaming: "bg-tint-indigo-soft text-tint-indigo",
  televisions: "bg-tint-emerald-soft text-tint-emerald",
  monitors: "bg-tint-cyan-soft text-tint-cyan",
  "home-appliances": "bg-tint-orange-soft text-tint-orange",
  "small-appliances": "bg-tint-lime-soft text-tint-lime",
  beauty: "bg-tint-rose-soft text-tint-rose",
  refrigerators: "bg-tint-teal-soft text-tint-teal",
  "washing-machines": "bg-tint-slate-soft text-tint-slate",
  "tv-mounts": "bg-tint-stone-soft text-tint-stone",
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
  const colorClass = accentColors[category.slug] ?? "bg-surface-mute text-ink-soft";

  if (layout === "row") {
    return (
      <Link
        href={`/categories/${category.slug}`}
        className="card-hover group flex items-center gap-4 overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5"
      >
        {/* Left: icon tile */}
        <span className={`grid size-14 shrink-0 place-items-center rounded-xl sm:size-16 ${colorClass}`}>
          {categoryIcon(category.slug, "lg")}
        </span>

        {/* Center: title + description + meta */}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-ink group-hover:text-accent sm:text-lg">
            {category.nameKa}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted sm:text-[13px]">
            {descriptions[category.slug] ?? "შეთავაზებები ამ კატეგორიაში რეგულარულად ახლდება."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-muted sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold text-ink">{formatNumber(category.productCount ?? 0)}</span>
              პროდუქტი
            </span>
            {!comingSoon && (category.dealCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-success">
                <span className="font-semibold">{formatNumber(category.dealCount ?? 0)}</span>
                აქტიური აქცია
              </span>
            )}
            {comingSoon && (
              <span className="rounded-full border border-line bg-surface-soft px-2 py-0.5 font-semibold text-ink-soft">მალე</span>
            )}
          </div>
        </div>

        {/* Right: open affordance */}
        <span className="hidden shrink-0 items-center gap-1.5 self-center rounded-md border border-line px-3 py-2 text-sm font-semibold text-accent transition-colors group-hover:border-accent group-hover:bg-accent-soft sm:inline-flex">
          გახსნა
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
        <ArrowRight className="size-5 shrink-0 self-center text-accent sm:hidden" />
      </Link>
    );
  }

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="card-hover group flex min-h-36 flex-col gap-3 overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-10 place-items-center rounded-lg ${colorClass}`}>
          {categoryIcon(category.slug)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            comingSoon
              ? "border border-line bg-surface-soft text-ink-soft"
              : "bg-surface-mute text-muted"
          }`}
        >
          {comingSoon ? "მალე" : `${formatNumber(category.productCount ?? 0)} პროდუქტი`}
        </span>
      </div>

      <div className="flex-1">
        <h2 className="font-display font-bold text-ink group-hover:text-accent">
          {category.nameKa}
        </h2>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">
          {descriptions[category.slug] ?? "შეთავაზებები ამ კატეგორიაში რეგულარულად ახლდება."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-xs">
        <span className="text-muted">{formatNumber(category.dealCount ?? 0)} აქტიური აქცია</span>
        <span className="inline-flex items-center gap-1 font-semibold text-accent">
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
