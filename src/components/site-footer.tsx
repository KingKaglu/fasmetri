import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  const links = [
    ["/", "მთავარი"],
    ["/deals", "აქციები"],
    ["/categories", "კატეგორიები"],
    ["/shops", "მაღაზიები"],
    ["/about", "ჩვენ შესახებ"],
    ["/contact", "კონტაქტი"],
  ];

  return (
    <footer className="mt-16 border-t border-[#d9e4f2] bg-white/95">
      <div className="shell grid gap-7 py-9 text-sm text-[#64748b] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <BrandLogo />
          <p className="mt-3 max-w-2xl leading-7">
            ფასები და მარაგის ინფორმაცია რეგულარულად ახლდება, თუმცა საბოლოო ფასი შეძენამდე გადაამოწმე მაღაზიის ვებსაიტზე.
          </p>
          <p className="mt-2 max-w-2xl text-xs font-bold leading-6 text-[#64748b]">
            ზოგი ბმული შეიძლება იყოს პარტნიორული ან დასპონსორებული. ეს არ ცვლის ფასს მომხმარებლისთვის.
          </p>
        </div>
        <div className="flex max-w-lg flex-wrap gap-x-5 gap-y-2 font-black text-[#12203a]">
          {links.map(([href, label]) => <Link key={href} href={href} className="hover:text-[#0054d2]">{label}</Link>)}
        </div>
      </div>
    </footer>
  );
}
