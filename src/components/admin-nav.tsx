"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Layers3,
  MousePointerClick,
  PackageSearch,
  Store,
} from "lucide-react";

const items = [
  { href: "/admin", label: "დაფა", icon: Gauge },
  { href: "/admin/shops", label: "მაღაზიები", icon: Store },
  { href: "/admin/products", label: "პროდუქტები", icon: PackageSearch },
  { href: "/admin/categories/review", label: "კატეგორიები", icon: Layers3 },
  { href: "/admin/clicks", label: "კლიკები", icon: MousePointerClick },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 rounded-[1.15rem] border border-[#c8d7bd] bg-white/88 p-2 shadow-[0_12px_30px_rgba(18,19,15,0.07)]">
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`grid min-h-14 min-w-0 place-items-center gap-1 rounded-xl px-1.5 text-center text-[11px] font-black transition sm:inline-flex sm:h-10 sm:min-h-0 sm:w-auto sm:items-center sm:justify-center sm:gap-2 sm:px-3 sm:text-sm ${
                active
                  ? "bg-[#151713] text-white shadow-[0_10px_24px_rgba(18,19,15,0.18)]"
                  : "text-[var(--muted-strong)] hover:bg-[#edf4e7] hover:text-[var(--brand)]"
              }`}
            >
              <Icon className={`size-4 ${active ? "text-[var(--accent)]" : ""}`} />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
