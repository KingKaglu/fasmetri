import Link from "next/link";
import { Clock3 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { getCatalogStats } from "@/lib/catalog";
import { formatRelativeTime } from "@/lib/format";

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
  [
    "სამართლებრივი",
    [
      ["/legal", "სამართლებრივი ინფორმაცია"],
      ["/privacy", "კონფიდენციალურობა"],
      ["/terms", "წესები და პირობები"],
    ],
  ],
];

export async function SiteFooter() {
  // Most recent offer update across the public catalog (cached summary).
  const latestUpdate = await getCatalogStats()
    .then((stats) => stats.latestUpdate)
    .catch(() => null);

  return (
    <footer className="mt-16 border-t border-white/10 bg-[var(--ink-surface)]">
      <div className="shell grid gap-10 py-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
        {/* Brand column */}
        <div>
          <BrandLogo compact tone="light" />
          <p className="mt-4 text-sm leading-6 text-zinc-300 max-w-xs">
            ფასმეტრი — ქართული ონლაინ მაღაზიების დამოუკიდებელი ფასების შედარების პლატფორმა.
          </p>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-[11px] leading-5 text-zinc-400">
            ფასმეტრი არ არის ჩამოთვლილი მაღაზიების ოფიციალური პარტნიორი. ყიდვამდე საბოლოო ფასი მაღაზიის გვერდზე გადაამოწმე.
          </p>
        </div>

        {/* Link columns */}
        {columns.map(([title, items]) => (
          <div key={title}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
            <ul className="grid gap-2">
              {items.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-300 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="shell flex flex-wrap items-center justify-between gap-2 py-4 text-[11px] text-zinc-400">
          <span>© {new Date().getFullYear()} ფასმეტრი. ყველა უფლება დაცულია.</span>
          {latestUpdate ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" />
              ბოლო განახლება: {formatRelativeTime(latestUpdate)}
            </span>
          ) : (
            <span>შედარე ფასები ქართულ მაღაზიებში</span>
          )}
        </div>
      </div>
    </footer>
  );
}
