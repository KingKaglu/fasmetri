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
  tech: "ტექნიკა, აქსესუარები და ყოველდღიური ელექტრონიკა.",
  mobiles: "სმარტფონები და მობილური ტელეფონები.",
  tablets: "ტაბლეტები მუშაობის, სწავლისა და გართობისთვის.",
  "tablet-accessories": "ქეისები, კლავიატურები და ტაბლეტის დამატებითი აქსესუარები.",
  "phone-accessories": "დამტენები, ქეისები, კაბელები და ენერგიის აქსესუარები.",
  computers: "კომპიუტერები, ნაწილები და სამუშაო მოწყობილობები.",
  "computer-accessories": "პერიფერია, სტენდები და კომპიუტერის აქსესუარები.",
  "cables-adapters": "კაბელები, ჰაბები და ადაპტერები.",
  monitors: "სამუშაო და გეიმინგ მონიტორები.",
  laptops: "ლეპტოპები სხვადასხვა ბიუჯეტისთვის.",
  televisions: "ტელევიზორები და სახლის ეკრანები.",
  audio: "ყურსასმენები, დინამიკები და აუდიო სისტემები.",
  wearables: "სმარტ საათები და ყოველდღიური wearables.",
  gaming: "კონსოლები, კონტროლერები და გეიმინგ აქსესუარები.",
  refrigerators: "მაცივრები და საყინულეები სახლისთვის.",
  "washing-machines": "სარეცხი მანქანები და კომბინირებული მოდელები.",
  "home-appliances": "საყოფაცხოვრებო ტექნიკა სახლისთვის.",
  "small-appliances": "ყავის აპარატები, ბლენდერები და მცირე სამზარეულოს ტექნიკა.",
  "kitchen-dishes": "ჭიქები, თეფშები, ქვაბები და სამზარეულოს ყოველდღიური ჭურჭელი.",
  "air-conditioners": "კონდიციონერები და კლიმატის მოწყობილობები.",
  "photo-video": "კამერები, მიკროფონები და ვიდეო აქსესუარები.",
  clothing: "ტანსაცმელი და ყოველდღიური სტილი.",
  shoes: "ფეხსაცმელი სეზონისა და აქტივობისთვის.",
  beauty: "სილამაზე, მოვლა და პირადი ჰიგიენა.",
  furniture: "მაგიდები, სკამები, საწოლები და შესანახი ავეჯი.",
  "home-garden": "სახლი, ბაღი და სასარგებლო ნივთები.",
  sport: "სპორტი, ვარჯიში და აქტიური დრო.",
  kids: "საბავშვო ნივთები და საჩუქრები.",
  "auto-accessories": "ავტო აქსესუარები და გზისთვის საჭირო ნივთები.",
  supermarket: "ყოველდღიური საყიდლები და საკვები.",
  "books-stationery": "წიგნები და საკანცელარიო ნივთები.",
  pets: "ცხოველების მოვლა და აქსესუარები.",
  tools: "ხელსაწყოები და სახელოსნო.",
  other: "სხვა შეთავაზებები, რომლებსაც დამატებითი კატეგორიზაცია სჭირდება.",
};

export function CategoryCard({ category, comingSoon = false }: { category: CategoryView; comingSoon?: boolean }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex min-h-44 flex-col gap-3 overflow-hidden rounded-md border border-[#e2e8f0] bg-white p-4 transition hover:border-[#0f172a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-[#0f172a] text-[#84cc16] group-hover:bg-[#84cc16] group-hover:text-[#1a2e05]">
          {categoryIcon(category.slug)}
        </span>
        <span
          className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-bold ${
            comingSoon
              ? "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
              : "border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a]"
          }`}
        >
          {comingSoon ? "მალე" : `${category.productCount ?? 0} პროდ.`}
        </span>
      </div>
      <div className="flex-1">
        <h2 className="text-base font-black tracking-tight text-[#0f172a] group-hover:text-[#65a30d]">
          {category.nameKa}
        </h2>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748b]">
          {descriptions[category.slug] ?? "შეთავაზებები ამ კატეგორიაში რეგულარულად ახლდება."}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#e2e8f0] pt-2.5 text-xs font-bold">
        <span className="text-[#64748b]">
          {category.dealCount ?? 0} აქცია
        </span>
        <span className="inline-flex items-center gap-1 text-[#0f172a] group-hover:text-[#65a30d]">
          ნახვა <ArrowRight className="size-3.5" />
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
