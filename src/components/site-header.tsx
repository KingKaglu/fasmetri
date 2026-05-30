"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  ["/", "მთავარი"],
  ["/deals", "აქციები"],
  ["/categories", "კატეგორიები"],
  ["/shops", "მაღაზიები"],
  ["/about", "ჩვენ შესახებ"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 site-header">
      {/* Top thin navy strip — promo line */}
      <div className="hidden bg-[#0f172a] text-white md:block">
        <div className="shell flex h-8 items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-300">ფასები რეგულარულად მოწმდება — ყიდვამდე გადაამოწმე მაღაზიის საიტზე</span>
          <div className="flex items-center gap-5 text-slate-300">
            <Link href="/about" className="hover:text-white">ჩვენ შესახებ</Link>
            <Link href="/contact" className="hover:text-white">კონტაქტი</Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="shell flex h-16 items-center gap-3 md:h-[4.5rem]">
        <div className="mr-2">
          <BrandLogo compact />
        </div>

        {/* Desktop search */}
        <form
          action="/search"
          className="hidden h-11 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-[#0f172a] bg-white md:flex md:max-w-[36rem]"
        >
          <label className="flex min-w-0 flex-1 items-center gap-2 px-3.5">
            <Search className="size-4 shrink-0 text-[#64748b]" />
            <input
              name="q"
              aria-label="პროდუქტის ძიება"
              placeholder="მოძებნე iPhone 17, MacBook, ლეპტოპი..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
            />
          </label>
          <button className="h-full shrink-0 bg-[#84cc16] px-5 text-sm font-black text-[#1a2e05] hover:bg-[#65a30d] hover:text-white">
            ძებნა
          </button>
        </form>

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => <NavLink key={href} href={href} label={label} pathname={pathname} />)}
        </nav>

        {/* Mobile menu */}
        <button
          type="button"
          aria-label="მენიუ"
          title="მენიუ"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto grid size-10 place-items-center rounded-md border border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#0f172a] lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav className="shell grid gap-1 border-t border-[#e2e8f0] py-3 lg:hidden">
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
        mobile
          ? "px-3 py-2.5 text-sm"
          : "px-3 py-2 text-[13px]"
      } rounded-md font-bold ${
        active
          ? "bg-[#0f172a] text-white"
          : "text-[#0f172a] hover:bg-[#f1f5f9]"
      }`}
    >
      {label}
    </Link>
  );
}
