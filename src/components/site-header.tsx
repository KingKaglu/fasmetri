"use client";

import Link from "next/link";
import { BadgePercent, Grid3X3, Menu, Search, Store, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  ["/deals", "აქციები"],
  ["/categories", "კატეგორიები"],
  ["/shops", "მაღაზიები"],
  ["/about", "როგორ მუშაობს"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 site-header">
      <div className="hidden border-b border-white/10 bg-[var(--brand)] text-white md:block">
        <div className="shell flex h-8 items-center justify-between text-[11px] font-bold">
          <span className="text-white/72">ფასები რეგულარულად მოწმდება, ყიდვამდე საბოლოო ფასი მაღაზიის საიტზე გადაამოწმე</span>
          <div className="flex items-center gap-5 text-white/72">
            <Link href="/deals" className="inline-flex items-center gap-1 hover:text-white">
              <BadgePercent className="size-3.5" /> დღის ფასდაკლებები
            </Link>
            <Link href="/contact" className="hover:text-white">კონტაქტი</Link>
          </div>
        </div>
      </div>

      <div className="shell flex h-16 items-center gap-3 md:h-[4.5rem]">
        <BrandLogo compact />

        <form
          action="/search"
          className="ml-3 hidden h-11 min-w-0 flex-1 items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-[0_10px_24px_rgba(18,19,15,0.06)] md:flex md:max-w-[38rem]"
        >
          <label className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5">
            <Search className="size-4 shrink-0 text-[var(--muted)]" />
            <input
              name="q"
              aria-label="პროდუქტის ძებნა"
              maxLength={140}
              placeholder="მოძებნე iPhone, MacBook, Galaxy..."
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--brand)] outline-none placeholder:text-[var(--muted)]"
            />
          </label>
          <button className="h-full shrink-0 bg-[var(--brand)] px-5 text-sm font-black text-white hover:bg-black">
            ძებნა
          </button>
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => <NavLink key={href} href={href} label={label} pathname={pathname} />)}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex lg:ml-2">
          <Link
            href="/search"
            className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 px-3 text-xs font-black text-[var(--brand)] hover:border-[var(--brand)] xl:inline-flex"
          >
            <Grid3X3 className="size-4" /> კატალოგი
          </Link>
          <Link
            href="/shops"
            className="hidden h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-3 text-xs font-black text-[var(--accent-ink)] hover:bg-[#d7ff73] xl:inline-flex"
          >
            <Store className="size-4" /> მაღაზიები
          </Link>
        </div>

        <button
          type="button"
          aria-label="მენიუ"
          title="მენიუ"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto grid size-10 place-items-center rounded-xl border border-[var(--line)] bg-white/85 text-[var(--brand)] hover:border-[var(--brand)] lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <form action="/search" className="shell pb-3 md:hidden">
        <label className="flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[var(--line)] bg-white px-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          <Search className="size-4 shrink-0 text-[var(--muted)]" />
          <input
            name="q"
            aria-label="პროდუქტის ძებნა"
            maxLength={140}
            placeholder="მოძებნე iPhone, MacBook..."
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--brand)] outline-none placeholder:text-[var(--muted)]"
          />
          <button className="h-8 shrink-0 rounded-lg bg-[var(--brand)] px-3 text-xs font-black text-white">
            ძებნა
          </button>
        </label>
      </form>

      {open ? (
        <nav className="shell grid gap-1 border-t border-[var(--line)] py-3 lg:hidden">
          {links.map(([href, label]) => (
            <NavLink key={href} href={href} label={label} pathname={pathname} mobile onClick={() => setOpen(false)} />
          ))}
        </nav>
      ) : null}
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
      className={`${
        mobile ? "px-3 py-2.5 text-sm" : "px-3 py-2 text-[13px]"
      } rounded-xl font-black ${
        active
          ? "bg-[var(--brand)] text-white shadow-[0_10px_22px_rgba(18,19,15,0.12)]"
          : "text-[var(--brand)] hover:bg-white"
      }`}
    >
      {label}
    </Link>
  );
}
