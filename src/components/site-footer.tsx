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
      ["/reviews", "შეფასებები"],
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

const socialLinks: Array<[string, string]> = [
  ["https://www.facebook.com/fasmetri", "Facebook"],
  ["https://www.instagram.com/fasmetri.ge/", "Instagram"],
  ["https://www.tiktok.com/@fasmetrigeorgia", "TikTok"],
];

export async function SiteFooter() {
  // Most recent offer update across the public catalog (cached summary).
  const latestUpdate = await getCatalogStats()
    .then((stats) => stats.latestUpdate)
    .catch(() => null);

  return (
    <footer className="mt-16 bg-[var(--ink-surface)]">
      <div className="shell grid gap-10 py-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
        {/* Brand column — colophon */}
        <div>
          <BrandLogo compact tone="light" />
          <p className="mt-4 max-w-xs text-[15px] leading-7 text-slate-300">
            ფასმეტრი (Fasmetri) — ქართული ონლაინ მაღაზიების დამოუკიდებელი ფასების შედარების პლატფორმა.
          </p>
          {/* Outbound profile links. They give the Latin brand name a second
              place to appear on the page and pair with the Organization
              sameAs in the layout, which is how the name resolves to us. */}
          <ul className="mt-4 flex flex-wrap gap-4">
            {socialLinks.map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  rel="me noopener noreferrer"
                  target="_blank"
                  className="inline-block py-1 text-sm text-slate-300 transition-colors hover:text-white"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[11px] leading-5 text-slate-400">
            ფასმეტრი არ არის ჩამოთვლილი მაღაზიების ოფიციალური პარტნიორი. ყიდვამდე საბოლოო ფასი მაღაზიის გვერდზე გადაამოწმე.
          </p>
        </div>

        {/* Link columns */}
        {columns.map(([title, items]) => (
          <div key={title}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">{title}</p>
            <ul className="grid gap-2">
              {items.map(([href, label]) => (
                <li key={href}>
                  {/* inline-block + py-1 lifts the tap target from ~16px of
                      text height to a comfortable 24px+ on phones. */}
                  <Link href={href} className="inline-block py-1 text-sm text-slate-300 transition-colors hover:text-white">
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
