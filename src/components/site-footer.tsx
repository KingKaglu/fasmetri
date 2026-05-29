import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  const columns: Array<[string, Array<[string, string]>]> = [
    [
      "კატალოგი",
      [
        ["/", "მთავარი"],
        ["/categories", "კატეგორიები"],
        ["/deals", "აქციები"],
        ["/shops", "მაღაზიები"],
      ],
    ],
    [
      "კომპანია",
      [
        ["/about", "ჩვენ შესახებ"],
        ["/contact", "კონტაქტი"],
      ],
    ],
  ];

  return (
    <footer className="mt-12 border-t border-[#e2e8f0] bg-white">
      <div className="shell grid gap-8 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <BrandLogo compact />
          <p className="mt-4 max-w-md text-sm leading-6 text-[#64748b]">
            ფასები და მარაგი რეგულარულად ახლდება. შეძენამდე საბოლოო ფასი ყოველთვის გადაამოწმე მაღაზიის საიტზე.
          </p>
          <p className="mt-2 max-w-md text-[11px] leading-5 text-[#94a3b8]">
            ზოგი ბმული შეიძლება იყოს პარტნიორული ან დასპონსორებული. ეს არ ცვლის ფასს მომხმარებლისთვის.
          </p>
        </div>

        {columns.map(([title, items]) => (
          <div key={title}>
            <p className="eyebrow text-[#64748b]">{title}</p>
            <ul className="mt-3 grid gap-2">
              {items.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm font-semibold text-[#0f172a] hover:text-[#65a30d]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#e2e8f0]">
        <div className="shell flex flex-wrap items-center justify-between gap-2 py-4 text-[11px] font-bold text-[#94a3b8]">
          <span>© {new Date().getFullYear()} ფასმეტრი. ყველა უფლება დაცულია.</span>
          <span>ფასების შედარება ქართულ მაღაზიებში</span>
        </div>
      </div>
    </footer>
  );
}
