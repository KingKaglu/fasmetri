"use client";

import Link from "next/link";
import { Flame, Heart, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { SearchBar } from "@/components/search-bar";
import { ThemeToggleButton, ThemeToggleGroup } from "@/components/theme-toggle";
import { useFavorites } from "@/lib/use-favorites";

// Every destination has exactly one place in the header: /deals is the accent
// CTA (not also a nav link, an announcement link and a category-row pill),
// /shops is a nav link (not also a second accent button), and the separate
// "კატალოგი" (/search) button is gone — the search field already leads there.
// Categories have one entry too: this link (and the mobile menu). The pill row
// of every category under the navbar and the category dropdown inside the
// search field both duplicated it, and the row overflowed at every width.
const navLinks = [
  { href: "/categories", label: "კატეგორიები" },
  { href: "/games", label: "თამაშები" },
  { href: "/shops", label: "მაღაზიები" },
  { href: "/price-index", label: "ფასების ინდექსი" },
  { href: "/about", label: "როგორ მუშაობს" },
];

// Pages that render their own search field. On phones the header's search row
// is hidden there, so a page never shows more than one search input.
function pageHasOwnSearch(pathname: string) {
  return pathname === "/" || pathname === "/search" || /^\/categories\/[^/]+/.test(pathname);
}

// Scroll distance (px) that counts as a deliberate direction change, and the
// band at the top of the page where the search row is always shown.
const SCROLL_INTENT_PX = 8;
const ALWAYS_SHOW_ABOVE_PX = 64;
// The header is sticky, i.e. in flow: folding the row shortens the page and
// the browser's scroll anchoring moves scrollY by the row's height, which
// reads exactly like the user scrolling the other way and would unfold it
// again (and so on). Scroll events this soon after a toggle (the 220ms fold
// plus a margin) are treated as our own and only re-baseline the position.
const SETTLE_MS = 320;

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const searchRowRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const hasSearchRow = !pageHasOwnSearch(pathname);

  // Phones: the search row folds away on scroll-down and returns on scroll-up
  // or near the top. Starts expanded, which is also what the server renders,
  // so nothing shifts on load. A new page starts expanded again.
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const [collapsedFor, setCollapsedFor] = useState(pathname);
  if (collapsedFor !== pathname) {
    setCollapsedFor(pathname);
    setSearchCollapsed(false);
  }

  useEffect(() => {
    if (!hasSearchRow) return;
    let lastY = window.scrollY;
    let frame = 0;
    let collapsed = false;
    let settleUntil = 0;
    const set = (next: boolean) => {
      if (next === collapsed) return;
      collapsed = next;
      settleUntil = performance.now() + SETTLE_MS;
      setSearchCollapsed(next);
    };
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      if (performance.now() < settleUntil) {
        lastY = y;
      } else if (y < ALWAYS_SHOW_ABOVE_PX) {
        set(false);
        lastY = y;
      } else if (delta > SCROLL_INTENT_PX) {
        // Never fold the field away while someone is typing in it (opening the
        // on-screen keyboard scrolls the page), or while the menu is open.
        const typing = searchRowRef.current?.contains(document.activeElement) ?? false;
        if (!typing && !headerRef.current?.querySelector("nav[data-mobile-menu]")) set(true);
        lastY = y;
      } else if (delta < -SCROLL_INTENT_PX) {
        set(false);
        lastY = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [hasSearchRow, pathname]);

  // Escape closes the mobile menu and hands focus back to its toggle.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Publish the real header height as --header-h so sticky sidebars can sit
  // just below it (globals.css carries a static fallback for first paint).
  // The header changes height with the breakpoint, the open mobile menu and
  // the per-page search row, so it is observed rather than computed.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--header-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 site-header">
      {/* Announcement bar — dark ink top strip (newspaper folio line) */}
      <div className="hidden bg-[var(--ink-surface)] md:block">
        <div className="shell flex h-[2.375rem] items-center justify-between">
          <span className="truncate text-[12px] font-medium text-on-ink-muted">
            ფასმეტრი აერთიანებს ქართულ მაღაზიებს — ყიდვამდე საბოლოო ფასი მაღაზიაში გადაამოწმე
          </span>
          <Link href="/contact" className="shrink-0 text-[12px] font-semibold text-on-ink-muted hover:text-white">
            კონტაქტი
          </Link>
        </div>
      </div>

      {/* Main navbar */}
      <div className="shell flex h-14 items-center gap-4 md:h-[3.75rem]">
        {/* Logo (BrandLogo renders its own link — nesting another <a> breaks hydration) */}
        <div className="shrink-0">
          <BrandLogo compact />
        </div>

        {/* Search — desktop (mega) */}
        <div className="hidden min-w-0 flex-1 max-w-[42rem] md:block">
          <SearchBar variant="header" />
        </div>

        {/* Desktop nav */}
        <nav aria-label="საიტის ნავიგაცია" className="ml-auto hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} pathname={pathname} />
          ))}
        </nav>

        {/* Favorites + the one accent action */}
        <div className="hidden items-center gap-2 md:flex lg:ml-2">
          <ThemeToggleButton />
          <FavoritesLink />
          <Link
            href="/deals"
            aria-current={pathname.startsWith("/deals") ? "page" : undefined}
            className="btn-accent inline-flex h-9 items-center gap-1.5 px-3 text-[12px]"
          >
            <Flame className="size-3.5" />
            აქციები
          </Link>
        </div>

        {/* Mobile menu */}
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="მენიუ"
          aria-expanded={mobileOpen}
          aria-controls={menuId}
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto grid size-9 place-items-center rounded-md border border-line bg-surface text-ink-soft hover:bg-surface-soft md:ml-0 lg:hidden"
        >
          {mobileOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
      </div>

      {/* Search — mobile. Hidden where the page has its own search field
          (home hero, /search, category search) so only one is ever visible.
          Folds away while scrolling down (see .header-search-row); `inert`
          keeps the folded field out of the tab order. */}
      {hasSearchRow && (
        <div
          ref={searchRowRef}
          className="header-search-row grid md:hidden"
          data-collapsed={searchCollapsed ? "" : undefined}
          inert={searchCollapsed}
        >
          <div className="header-search-clip">
            <div className="shell pb-2">
              <SearchBar variant="header" />
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <nav id={menuId} data-mobile-menu aria-label="მენიუ" className="shell grid gap-0.5 border-t border-line pb-3 pt-2 lg:hidden">
          <NavLink href="/deals" label="აქციები" pathname={pathname} mobile onClick={() => setMobileOpen(false)} />
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} pathname={pathname} mobile onClick={() => setMobileOpen(false)} />
          ))}
          <NavLink href="/contact" label="კონტაქტი" pathname={pathname} mobile onClick={() => setMobileOpen(false)} />
          <div className="mt-1 border-t border-line pt-1">
            <ThemeToggleGroup />
          </div>
        </nav>
      )}
    </header>
  );
}

// Favorites entry with a live count badge (client-only count, hydration-safe:
// badge renders only after the provider has mounted).
function FavoritesLink() {
  const { mounted, count } = useFavorites();
  return (
    <Link
      href="/favorites"
      aria-label="ფავორიტები"
      title="ფავორიტები"
      className="relative grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:border-danger-line hover:bg-danger-soft hover:text-danger"
    >
      <Heart className="size-4" />
      {mounted && count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid min-w-[1.1rem] place-items-center rounded-full bg-deal-strong px-1 py-0.5 text-[11px] font-bold leading-none tabular-nums text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
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
          ? `block rounded-md px-3 py-2.5 text-sm font-semibold ${active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-surface-soft"}`
          : `rounded-md px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-surface-soft hover:text-ink"}`
      }
    >
      {label}
    </Link>
  );
}
