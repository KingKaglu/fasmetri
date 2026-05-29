"use client";

import Link from "next/link";
import { BadgePercent, Grid3X3, Home, Search, Store } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "მთავარი", icon: Home },
  { href: "/categories", label: "კატეგორიები", icon: Grid3X3 },
  { href: "/deals", label: "აქციები", icon: BadgePercent },
  { href: "/shops", label: "მაღაზიები", icon: Store },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      {/* Sticky search bar above the tab bar */}
      <div className="border-t border-[#e2e8f0] bg-white px-3 py-2">
        <form action="/search" className="flex h-11 items-center overflow-hidden rounded-md border border-[#0f172a]">
          <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
            <Search className="size-4 shrink-0 text-[#64748b]" />
            <input
              name="q"
              aria-label="პროდუქტის ძიება"
              placeholder="მოძებნე პროდუქტი..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
            />
          </label>
          <button className="h-full shrink-0 bg-[#84cc16] px-5 text-sm font-black text-[#1a2e05]">
            ძებნა
          </button>
        </form>
      </div>

      {/* Tab bar */}
      <nav
        className="border-t border-[#e2e8f0] bg-white px-2 pt-1.5"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`grid min-h-12 place-items-center rounded-md px-1 text-[10px] font-bold ${
                  active ? "text-[#0f172a]" : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                <Icon
                  className={`mb-0.5 size-5 ${active ? "text-[#0f172a]" : "text-[#94a3b8]"}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
