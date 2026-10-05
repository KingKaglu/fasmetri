"use client";

import Link from "next/link";
import { BadgePercent, Grid3X3, Heart, Home, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useFavorites } from "@/lib/use-favorites";

// Search is a tab, not a second input: every page already shows exactly one
// search field (header, hero, or the page's own), so a quick-search form here
// only duplicated it and doubled the fixed chrome. Shops moved to the header
// menu and the footer to keep five tabs. Labels are kept to <=8 Georgian
// characters: at the 12px minimum, longer words ("კატეგორიები", "ფავორიტები")
// truncate in a 390px-wide five-column bar.
const items = [
  { href: "/", label: "მთავარი", icon: Home },
  { href: "/categories", label: "კატალოგი", icon: Grid3X3 },
  { href: "/search", label: "ძებნა", icon: Search },
  { href: "/deals", label: "აქციები", icon: BadgePercent },
  { href: "/favorites", label: "რჩეულები", icon: Heart },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { mounted, count: favoriteCount } = useFavorites();
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="მთავარი ნავიგაცია"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line-strong)] bg-[var(--surface)] px-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Height is the --mobile-nav-h token, which the body padding and the
          bottom stack also read — keep them in sync by never hardcoding it. */}
      <div className="mx-auto grid h-[calc(var(--mobile-nav-h)-1px)] max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);
          const showBadge = href === "/favorites" && mounted && favoriteCount > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[12px] font-semibold transition-colors ${
                active ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--muted-strong)]"
              }`}
            >
              <span className="relative">
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.5 : 2}
                />
                {showBadge && (
                  <span className="absolute -right-2.5 -top-1.5 grid min-w-[1.1rem] place-items-center rounded-full bg-[var(--danger)] px-1 py-0.5 text-[11px] font-bold leading-none tabular-nums text-white">
                    {favoriteCount > 99 ? "99+" : favoriteCount}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
