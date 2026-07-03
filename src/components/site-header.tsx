"use client";

import Link from "next/link";
import { BadgePercent, Flame, Gamepad2, Grid3X3, Laptop, Menu, Search, Smartphone, Store, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { SearchBar } from "@/components/search-bar";

const navLinks = [
  { href: "/categories", label: "კატეგორიები" },
  { href: "/deals", label: "აქციები" },
  { href: "/shops", label: "მაღაზიები" },
  { href: "/about", label: "როგორ მუშაობს" },
];

// Retail category nav (handoff CategoryNav) — the two public catalog
// categories plus the consoles category, with a deals shortcut on the right.
const categoryNav = [
  { href: "/categories/mobiles", label: "სმარტფონები", icon: Smartphone },
  { href: "/categories/laptops", label: "ლეპტოპები", icon: Laptop },
  { href: "/categories/gaming", label: "კონსოლები", icon: Gamepad2 },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 site-header">
      {/* Announcement bar — dark ink top strip (newspaper folio line) */}
      <div className="hidden bg-[var(--ink-surface)] md:block">
        <div className="shell flex h-[2.375rem] items-center justify-between">
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.72]">
            ფასმეტრი აერთიანებს ქართულ მაღაზიებს — ყიდვამდე საბოლოო ფასი მაღაზიაში გადაამოწმე
          </span>
          <div className="flex shrink-0 items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.1em]">
            <Link href="/deals" className="inline-flex items-center gap-1 text-white hover:text-white/70">
              <BadgePercent className="size-3" />
              დღის ფასდაკლებები
            </Link>
            <span aria-hidden className="h-3 w-px bg-white/25" />
            <Link href="/contact" className="text-white/[0.72] hover:text-white">
              კონტაქტი
            </Link>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className="shell flex h-[3.75rem] items-center gap-4">
        {/* Logo (BrandLogo renders its own link — nesting another <a> breaks hydration) */}
        <div className="shrink-0">
          <BrandLogo compact />
        </div>

        {/* Search — desktop (mega) */}
        <div className="hidden min-w-0 flex-1 max-w-[42rem] md:block">
          <SearchBar variant="header" />
        </div>

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} pathname={pathname} />
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="hidden items-center gap-2 md:flex lg:ml-2">
          <Link
            href="/search"
            className="hidden h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-[12px] font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 xl:inline-flex"
          >
            <Grid3X3 className="size-3.5 text-gray-400" />
            კატალოგი
          </Link>
          <Link
            href="/shops"
            className="hidden h-9 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-white hover:bg-[var(--accent-strong)] xl:inline-flex"
          >
            <Store className="size-3.5" />
            მაღაზიები
          </Link>
        </div>

        {/* Mobile menu */}
        <button
          type="button"
          aria-label="მენიუ"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto grid size-9 place-items-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 lg:hidden"
        >
          {mobileOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
      </div>

      {/* Category nav row — newspaper section index with rule dividers */}
      <div className="hidden border-t border-[var(--line)] bg-white md:block">
        <div className="shell flex h-12 items-stretch">
          {categoryNav.map(({ href, label, icon: Icon }, index) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-4 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  index > 0 ? "border-l border-l-[var(--line)]" : ""
                } ${
                  active
                    ? "border-b-zinc-950 text-zinc-950"
                    : "border-b-transparent text-[var(--muted-strong)] hover:border-b-zinc-300 hover:text-zinc-950"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            );
          })}
          <Link
            href="/deals"
            className="ml-auto inline-flex items-center gap-1.5 border-b-2 border-b-transparent border-l border-l-[var(--line)] px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--muted-strong)] hover:border-b-zinc-300 hover:text-zinc-950"
          >
            <Flame className="size-3.5" />
            აქციები
          </Link>
        </div>
      </div>

      {/* Search — mobile */}
      <div className="shell pb-3 md:hidden">
        <SearchBar variant="header" />
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="shell grid gap-0.5 border-t border-gray-100 pb-3 pt-2 lg:hidden">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} pathname={pathname} mobile onClick={() => setMobileOpen(false)} />
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
            <Link href="/search" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700">
              <Search className="size-3.5" /> კატალოგი
            </Link>
            <Link href="/shops" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] py-2.5 text-xs font-semibold text-white">
              <Store className="size-3.5" /> მაღაზიები
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  label,
  pathname,
  mobile = false,
  onClick,
}: {
  href: string;
  label: string;
  pathname: string;
  mobile?: boolean;
  onClick?: () => void;
}) {
  const active = href === "/" ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        mobile
          ? `block rounded-md px-3 py-2.5 text-sm font-semibold ${active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-gray-700 hover:bg-gray-50"}`
          : `rounded-md px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`
      }
    >
      {label}
    </Link>
  );
}
