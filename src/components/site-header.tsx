"use client";

import Link from "next/link";
import { BadgePercent, ChevronDown, Grid3X3, Menu, Search, Store, X } from "lucide-react";
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

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 site-header">
      {/* Announcement bar */}
      <div className="hidden border-b border-gray-100 bg-gray-50 md:block">
        <div className="shell flex h-8 items-center justify-between">
          <span className="text-[11px] font-medium text-gray-500">
            ფასები რეგულარულად მოწმდება — ყიდვამდე საბოლოო ფასი მაღაზიაში გადაამოწმე
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/deals" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
              <BadgePercent className="size-3" />
              დღის ფასდაკლებები
            </Link>
            <Link href="/contact" className="font-medium text-gray-500 hover:text-gray-800">
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

        {/* Search — desktop */}
        <div className="hidden min-w-0 flex-1 max-w-[34rem] md:block">
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

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label="მენიუ"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto grid size-9 place-items-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 lg:hidden"
        >
          {mobileOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
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
