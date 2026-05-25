"use client";

import Link from "next/link";
import { BadgePercent, Grid3X3, Home, Search, Store } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "მთავარი", icon: Home },
  { href: "/search", label: "ძებნა", icon: Search },
  { href: "/deals", label: "აქციები", icon: BadgePercent },
  { href: "/categories", label: "კატეგორიები", icon: Grid3X3 },
  { href: "/shops", label: "მაღაზიები", icon: Store },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_34px_rgba(18,32,58,.1)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`grid min-h-14 place-items-center rounded-2xl px-1 text-[11px] font-black ${
                active ? "bg-[#eef5ff] text-[#0054d2]" : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#12203a]"
              }`}
            >
              <Icon className={`mb-1 size-5 ${active ? "text-[#0054d2]" : ""}`} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
