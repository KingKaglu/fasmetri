import Link from "next/link";
import {
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
    <Link href={`/categories/${category.slug}`} className="group grid min-h-56 gap-4 overflow-hidden rounded-[1.35rem] border border-[#d9e4f2] bg-white p-5 shadow-[0_10px_32px_rgba(18,32,58,.06)] hover:-translate-y-1 hover:border-[#b8cdf0] hover:shadow-[0_22px_54px_rgba(0,84,210,.12)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-13 place-items-center rounded-2xl border border-[#d9e4f2] bg-[#eef5ff] text-[#0054d2] shadow-sm group-hover:bg-[#0054d2] group-hover:text-white">{categoryIcon(category.slug)}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${comingSoon ? "bg-[#fff1e8] text-[#c2410c]" : "bg-[#eef5ff] text-[#0054d2]"}`}>
          {comingSoon ? "მალე დაემატება" : `${category.productCount ?? 0} პროდუქტი`}
        </span>
      </div>
      <div>
        <h2 className="text-xl font-black text-[#12203a] group-hover:text-[#0054d2]">{category.nameKa}</h2>
        <p className="mt-2 line-clamp-2 leading-6 text-[#64748b]">{descriptions[category.slug] ?? "შეთავაზებები ამ კატეგორიაში რეგულარულად ახლდება."}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#e6edf7] pt-4 text-sm font-black">
        <span className="text-[#64748b]">{category.dealCount ?? 0} აქტიური აქცია</span>
        <span className="text-[#ff6800]">ნახვა</span>
      </div>
    </Link>
  );
}

function categoryIcon(slug: string) {
  if (slug === "mobiles" || slug === "tablets" || slug === "tablet-accessories" || slug === "phone-accessories" || slug === "wearables") return <Smartphone className="size-6" />;
  if (slug === "computers" || slug === "computer-accessories" || slug === "cables-adapters" || slug === "laptops") return <Laptop className="size-6" />;
  if (slug === "televisions" || slug === "monitors" || slug === "audio" || slug === "gaming") return <Tv className="size-6" />;
  if (slug === "clothing") return <Shirt className="size-6" />;
  if (slug === "shoes") return <Footprints className="size-6" />;
  if (slug === "beauty") return <Sparkles className="size-6" />;
  if (slug === "furniture") return <Sofa className="size-6" />;
  if (slug === "home-garden" || slug === "home-appliances" || slug === "refrigerators" || slug === "washing-machines" || slug === "small-appliances" || slug === "kitchen-dishes" || slug === "air-conditioners") return <House className="size-6" />;
  if (slug === "sport") return <Dumbbell className="size-6" />;
  if (slug === "kids") return <Baby className="size-6" />;
  if (slug === "auto-accessories") return <CarFront className="size-6" />;
  if (slug === "supermarket") return <Leaf className="size-6" />;
  if (slug === "books-stationery") return <BookOpen className="size-6" />;
  if (slug === "pets") return <PawPrint className="size-6" />;
  if (slug === "tools") return <Wrench className="size-6" />;
  return <Package className="size-6" />;
}
