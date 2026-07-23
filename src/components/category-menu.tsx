"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Flame, Gamepad2, Headphones, Laptop, LayoutGrid, Menu, Smartphone, Tv, Watch } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CategoryItem = { href: string; label: string; icon: LucideIcon };
type LiveCategory = { slug: string; nameKa: string; productCount?: number; dealCount?: number };

// Static fallback — mirrors the header CategoryNav; replaced by live catalog
// data (with product counts) as soon as /api/categories responds.
const CATEGORY_ITEMS: CategoryItem[] = [
  { href: "/categories/mobiles", label: "სმარტფონები", icon: Smartphone },
  { href: "/categories/laptops", label: "ლეპტოპები", icon: Laptop },
  { href: "/categories/gaming", label: "კონსოლები", icon: Gamepad2 },
  { href: "/categories/televisions", label: "ტელევიზორები", icon: Tv },
  { href: "/categories/audio", label: "აუდიო", icon: Headphones },
  { href: "/categories/wearables", label: "სმარტ საათები", icon: Watch },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  mobiles: Smartphone,
  laptops: Laptop,
  gaming: Gamepad2,
  televisions: Tv,
  audio: Headphones,
  wearables: Watch,
};

// Module-level cache so the menu fetches the catalog once per page load,
// no matter how many times it is opened (or how many SearchBars mount).
let categoriesCache: LiveCategory[] | null = null;
let categoriesPromise: Promise<LiveCategory[]> | null = null;

function loadCategories() {
  if (categoriesCache) return Promise.resolve(categoriesCache);
  categoriesPromise ??= fetch("/api/categories")
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
    .then((data: { categories?: LiveCategory[] }) => {
      categoriesCache = Array.isArray(data.categories) ? data.categories : [];
      return categoriesCache;
    })
    .catch(() => {
      categoriesPromise = null;
      return [] as LiveCategory[];
    });
  return categoriesPromise;
}

// Dropdown trigger that opens a category index beneath the button — it does
// NOT navigate. Closes on outside-click, Escape, and after selection;
// supports arrow-key navigation between items.
export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<LiveCategory[]>(categoriesCache ?? []);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadCategories().then((categories) => {
      if (!cancelled && categories.length) setLive(categories);
    });
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (open) itemsRef.current[0]?.focus();
  }, [open]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  // Live catalog categories when loaded, static links otherwise.
  const entries = live.length
    ? live.map((category) => ({
        href: `/categories/${category.slug}`,
        label: category.nameKa,
        icon: CATEGORY_ICONS[category.slug] ?? LayoutGrid,
        productCount: category.productCount,
        dealCount: category.dealCount,
      }))
    : CATEGORY_ITEMS.map((item) => ({ ...item, productCount: undefined, dealCount: undefined }));

  // entries + deals row + all-categories row
  const itemCount = entries.length + 2;

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const last = itemCount - 1;
    const current = itemsRef.current.findIndex((el) => el === document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      itemsRef.current[current >= last ? 0 : current + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemsRef.current[current <= 0 ? last : current - 1]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itemsRef.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemsRef.current[last]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative flex h-full shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="კატეგორიები"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex h-full items-center gap-1.5 border-r border-zinc-900 px-3 text-[11.5px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 ease-in-out ${
          open ? "bg-zinc-950 text-white" : "bg-zinc-950 text-white hover:bg-zinc-800"
        }`}
      >
        <Menu className="size-3.5" />
        <span className="hidden sm:inline">კატეგორიები</span>
        <ChevronDown className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="კატეგორიები"
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden border border-zinc-950 bg-[var(--surface)] shadow-[6px_6px_0_rgba(10,10,10,0.9)]"
        >
          <p className="border-b border-[var(--line)] px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            კატალოგის ინდექსი
          </p>
          {entries.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                ref={(el) => {
                  itemsRef.current[index] = el;
                }}
                onClick={() => close(false)}
                className="flex items-baseline gap-2.5 border-b border-[var(--line)] px-3 py-2.5 text-[13px] font-semibold text-[var(--brand)] outline-none transition-colors duration-200 ease-in-out hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)]"
              >
                <Icon className="size-3.5 shrink-0 self-center text-[var(--muted-strong)]" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {typeof item.productCount === "number" && item.productCount > 0 && (
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--muted)]">
                    {item.productCount.toLocaleString()}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/deals"
            role="menuitem"
            ref={(el) => {
              itemsRef.current[entries.length] = el;
            }}
            onClick={() => close(false)}
            className="flex items-center gap-2.5 border-b border-[var(--line)] px-3 py-2.5 text-[13px] font-semibold text-[var(--brand)] outline-none transition-colors duration-200 ease-in-out hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)]"
          >
            <Flame className="size-3.5 shrink-0 text-[var(--muted-strong)]" />
            აქციები
          </Link>
          <Link
            href="/categories"
            role="menuitem"
            ref={(el) => {
              itemsRef.current[entries.length + 1] = el;
            }}
            onClick={() => close(false)}
            className="flex items-center justify-between gap-2.5 bg-zinc-950 px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white outline-none transition-colors duration-200 ease-in-out hover:bg-zinc-800 focus-visible:bg-zinc-800"
          >
            ყველა კატეგორია
            <LayoutGrid className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
