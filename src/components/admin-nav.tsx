"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  GitCompareArrows,
  Layers3,
  LogOut,
  MousePointerClick,
  PackageSearch,
  RefreshCw,
  Store,
  Tags,
} from "lucide-react";

const items = [
  { href: "/admin", label: "დაფა", icon: Gauge },
  { href: "/admin/review", label: "Match Review", icon: GitCompareArrows },
  { href: "/admin/products", label: "პროდუქტები", icon: PackageSearch },
  { href: "/admin/offers", label: "შეთავაზებები", icon: Tags },
  { href: "/admin/sync", label: "სინქრონიზაცია", icon: RefreshCw },
  { href: "/admin/shops", label: "მაღაზიები", icon: Store },
  { href: "/admin/categories/review", label: "კატეგორიები", icon: Layers3 },
  { href: "/admin/clicks", label: "კლიკები", icon: MousePointerClick },
];

export function AdminNav() {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    location.href = "/admin";
  }

  return (
    <nav className="shrink-0 lg:w-60">
      <div className="rounded-[1.15rem] border border-[#263024] bg-[#151713] p-2 text-white shadow-[0_18px_44px_rgba(18,19,15,0.22)] lg:sticky lg:top-24 lg:flex lg:min-h-[34rem] lg:flex-col">
        <p className="hidden px-3 pb-2 pt-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)] lg:block">
          fasmetri admin
        </p>
        <div className="flex gap-1.5 overflow-x-auto lg:flex-1 lg:flex-col lg:overflow-visible">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-black transition lg:w-full ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-1.5 hidden border-t border-white/10 pt-1.5 lg:block">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-black text-white/72 transition hover:bg-white/10 hover:text-white"
          >
            <Store className="size-4 shrink-0" />
            საჯარო საიტი
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-black text-white/72 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4 shrink-0" />
            გასვლა
          </button>
        </div>
      </div>
    </nav>
  );
}
