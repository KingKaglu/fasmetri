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
      <div className="border-t border-[var(--line)] bg-white/95 px-3 py-2 backdrop-blur">
        <form action="/search" className="flex h-11 items-center overflow-hidden rounded-2xl border border-[var(--brand)] bg-white">
          <label className="flex min-w-0 flex-1 items-center gap-2 px-2 min-[380px]:px-3">
            <Search className="size-4 shrink-0 text-[var(--muted)]" />
            <input
              name="q"
              aria-label="პროდუქტის ძებნა"
              placeholder="მოძებნე პროდუქტი..."
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--brand)] outline-none placeholder:text-[var(--muted)]"
            />
          </label>
          <button className="h-full shrink-0 bg-[var(--accent)] px-3 text-sm font-black text-[var(--accent-ink)] min-[380px]:px-5">
            ძებნა
          </button>
        </form>
      </div>

      <nav
        className="border-t border-[var(--line)] bg-white/95 px-2 pt-1.5 backdrop-blur"
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
                className={`grid min-h-12 place-items-center rounded-xl px-1 text-[10px] font-black ${
                  active ? "bg-[var(--accent-soft)] text-[var(--brand)]" : "text-[var(--muted)] hover:text-[var(--brand)]"
                }`}
              >
                <Icon className={`mb-0.5 size-5 ${active ? "text-[var(--brand)]" : "text-[var(--muted)]"}`} strokeWidth={active ? 2.7 : 2.2} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
