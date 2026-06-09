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
        ["/contact", "Contact / კონტაქტი"],
      ],
    ],
    [
      "სამართლებრივი",
      [
        ["/legal", "Legal / Disclaimer"],
        ["/privacy", "Privacy / კონფიდენციალურობა"],
        ["/terms", "Terms / გამოყენების პირობები"],
      ],
    ],
  ];

  return (
    <footer className="mt-12 border-t border-[var(--line)] bg-[var(--brand)] text-white">
      <div className="shell grid gap-8 py-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <BrandLogo compact tone="light" />
          <p className="mt-4 max-w-md text-sm leading-6 text-white/66">
            ფასმეტრი დამოუკიდებელი ფასების შედარების პლატფორმაა. ფასები და მარაგი შეიძლება შეიცვალოს, ამიტომ ყიდვამდე საბოლოო ინფორმაცია ყოველთვის გადაამოწმე მაღაზიის ოფიციალურ გვერდზე.
          </p>
          <p className="mt-3 max-w-md rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] leading-5 text-white/54">
            ფასმეტრი არ არის ჩამოთვლილი მაღაზიების ოფიციალური პარტნიორი, თუ ეს პირდაპირ არ არის მითითებული. ზოგი ბმული შეიძლება იყოს პარტნიორული ან დასპონსორებული.
          </p>
        </div>

        {columns.map(([title, items]) => (
          <div key={title}>
            <p className="text-[11px] font-black uppercase text-[var(--accent)]">{title}</p>
            <ul className="mt-3 grid gap-2">
              {items.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm font-bold text-white/74 hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="shell flex flex-wrap items-center justify-between gap-2 py-4 text-[11px] font-bold text-white/45">
          <span>© {new Date().getFullYear()} ფასმეტრი. ყველა უფლება დაცულია.</span>
          <span>ფასების შედარება ქართულ მაღაზიებში</span>
        </div>
      </div>
    </footer>
  );
}
