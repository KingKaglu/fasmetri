"use client";

import Link from "next/link";
import { BadgePercent, Grid3X3, Heart, Home, Search, Store } from "lucide-react";
import { usePathname } from "next/navigation";
import { useFavorites } from "@/lib/use-favorites";

const items = [
  { href: "/", label: "მთავარი", icon: Home },
  { href: "/categories", label: "კატეგორიები", icon: Grid3X3 },
  { href: "/deals", label: "აქციები", icon: BadgePercent },
  { href: "/favorites", label: "ფავორიტები", icon: Heart },
  { href: "/shops", label: "მაღაზიები", icon: Store },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { mounted, count: favoriteCount } = useFavorites();
  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      {/* Quick search bar */}
      <div className="border-t border-gray-200 bg-white px-3 py-2 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <form action="/search" className="flex h-11 items-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 focus-within:border-[var(--accent)] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
          <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
            <Search className="size-3.5 shrink-0 text-gray-400" />
            <input
              name="q"
              aria-label="პროდუქტის ძებნა"
              placeholder="მოძებნე..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
            />
          </label>
          <button className="h-full shrink-0 bg-[var(--accent)] px-5 text-xs font-semibold text-white">
            ძებნა
          </button>
        </form>
      </div>

      {/* Nav tabs */}
      <nav
        className="border-t border-gray-100 bg-white px-2 pt-1"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            const showBadge = href === "/favorites" && mounted && favoriteCount > 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-1 text-[10px] font-semibold transition-colors ${
                  active ? "text-[var(--accent)]" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="relative">
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 grid min-w-[0.95rem] place-items-center rounded-full bg-red-500 px-0.5 py-px text-[8px] font-bold leading-none tabular-nums text-white">
                      {favoriteCount > 99 ? "99+" : favoriteCount}
                    </span>
                  )}
                </span>
                <span className="truncate leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
