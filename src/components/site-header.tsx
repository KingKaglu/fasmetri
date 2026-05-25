"use client";

import Link from "next/link";
import { BadgePercent, Menu, Search, X } from "lucide-react";
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
    <header className="glass-line sticky top-0 z-40 border-b border-[#d9e4f2]">
      <div className="shell flex min-h-20 items-center gap-2 py-2.5 sm:gap-3">
        <div className="mr-auto">
          <BrandLogo compact />
        </div>

        <form action="/search" className="hidden h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#d9e4f2] bg-white px-4 shadow-sm md:flex md:max-w-[24rem]">
          <Search className="size-5 shrink-0 text-[#0054d2]" />
          <input
            name="q"
            aria-label="პროდუქტის ძიება"
            placeholder="მოძებნე iPhone, ლეპტოპი, ტელევიზორი..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#12203a] outline-none placeholder:text-[#64748b]"
          />
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => <NavLink key={href} href={href} label={label} pathname={pathname} />)}
        </nav>

        <Link href="/deals" aria-label="აქციები" title="აქციები" className="grid size-11 place-items-center rounded-2xl border border-[#ffe0ca] bg-[#fff1e8] text-[#ff6800] hover:border-[#ff6800] sm:hidden">
          <BadgePercent className="size-5" />
        </Link>
        <Link href="/search" aria-label="ძიება" title="ძიება" className="hidden size-11 place-items-center rounded-2xl border border-[#d9e4f2] bg-white text-[#0054d2] hover:border-[#0054d2] sm:grid md:hidden">
          <Search className="size-5" />
        </Link>
        <button type="button" aria-label="მენიუ" title="მენიუ" onClick={() => setOpen((value) => !value)} className="grid size-11 place-items-center rounded-2xl border border-[#d9e4f2] bg-white text-[#12203a] lg:hidden">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <form action="/search" className="shell flex min-w-0 gap-2 pb-3 md:hidden">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#d9e4f2] bg-white px-4 shadow-sm">
          <Search className="size-5 shrink-0 text-[#0054d2]" />
          <input
            name="q"
            aria-label="პროდუქტის ძიება"
            placeholder="მოძებნე iPhone, ლეპტოპი, ტელევიზორი..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#64748b]"
          />
        </label>
        <button aria-label="ძიება" title="ძიება" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#0054d2] text-white shadow-[0_12px_28px_rgba(0,84,210,.22)] hover:bg-[#003f9f]">
          <Search className="size-5" />
        </button>
      </form>

      {open ? (
        <nav className="shell grid gap-1 pb-3 lg:hidden">
          {links.map(([href, label]) => <NavLink key={href} href={href} label={label} pathname={pathname} mobile onClick={() => setOpen(false)} />)}
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
      className={`${mobile ? "px-4 py-3" : "px-3 py-2 text-sm"} rounded-2xl font-black ${
        active ? "bg-[#eef5ff] text-[#0054d2]" : "text-[#12203a] hover:bg-white hover:text-[#0054d2]"
      }`}
    >
      {label}
    </Link>
  );
}
