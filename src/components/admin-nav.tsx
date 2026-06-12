"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Gauge,
  GitCompareArrows,
  Layers3,
  LogOut,
  MoreHorizontal,
  MousePointerClick,
  PackageSearch,
  RefreshCw,
  Store,
  Tags,
  X,
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

// First 4 get dedicated slots in the mobile bottom bar; the rest live behind "მეტი".
const mobilePrimary = items.slice(0, 4);
const mobileOverflow = items.slice(4);

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

async function logout() {
  await fetch("/api/admin/session", { method: "DELETE" });
  location.href = "/admin";
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      <AdminSidebar pathname={pathname} />
      <AdminBottomBar pathname={pathname} />
    </>
  );
}

function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden shrink-0 lg:block lg:w-60">
      <div className="rounded-[1.15rem] border border-[#263024] bg-[#151713] p-2 text-white shadow-[0_18px_44px_rgba(18,19,15,0.22)] lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] lg:min-h-[34rem] lg:flex-col">
        <p className="px-3 pb-2 pt-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
          fasmetri admin
        </p>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-black transition ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_8px_18px_rgba(0,0,0,0.25)]"
                    : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
                {active ? <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-white/85" /> : null}
              </Link>
            );
          })}
        </div>
        <div className="mt-1.5 border-t border-white/10 pt-1.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-black text-white/72 transition hover:bg-white/10 hover:text-white"
          >
            <Store className="size-4 shrink-0" />
            საჯარო საიტი
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-black text-white/72 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4 shrink-0" />
            გასვლა
          </button>
        </div>
      </div>
    </nav>
  );
}

function AdminBottomBar({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const overflowActive = mobileOverflow.some(({ href }) => isActive(pathname, href));

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <div className="lg:hidden">
      {moreOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-20 rounded-[1.15rem] border border-[#263024] bg-[#151713] p-2 text-white shadow-[0_-18px_44px_rgba(18,19,15,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">სხვა გვერდები</p>
              <button type="button" aria-label="დახურვა" onClick={() => setMoreOpen(false)} className="rounded-lg p-1 text-white/70 hover:bg-white/10">
                <X className="size-4" />
              </button>
            </div>
            {mobileOverflow.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-black ${
                    active ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
            <div className="mt-1 border-t border-white/10 pt-1">
              <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-black text-white/80 hover:bg-white/10">
                <Store className="size-4 shrink-0" />
                საჯარო საიტი
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-black text-white/80 hover:bg-white/10"
              >
                <LogOut className="size-4 shrink-0" />
                გასვლა
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#263024] bg-[#151713] pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 text-white shadow-[0_-12px_30px_rgba(18,19,15,0.3)]">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {mobilePrimary.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-black ${
                  active ? "text-[var(--accent)]" : "text-white/60"
                }`}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-black ${
              moreOpen || overflowActive ? "text-[var(--accent)]" : "text-white/60"
            }`}
          >
            <MoreHorizontal className="size-5" />
            <span>მეტი</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
