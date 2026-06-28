"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Gamepad2, Laptop, LayoutGrid, Menu, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CategoryItem = { href: string; label: string; icon: LucideIcon };

// Public catalog categories — mirrors the header CategoryNav + search suggestions.
const CATEGORY_ITEMS: CategoryItem[] = [
  { href: "/categories/mobiles", label: "სმარტფონები", icon: Smartphone },
  { href: "/categories/laptops", label: "ლეპტოპები", icon: Laptop },
  { href: "/categories/gaming", label: "კონსოლები", icon: Gamepad2 },
];

// Dropdown trigger that opens a category menu directly beneath the button —
// it does NOT navigate. Closes on outside-click, Escape, and after selection;
// supports arrow-key navigation between items.
export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (open) itemsRef.current[0]?.focus();
  }, [open]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const last = CATEGORY_ITEMS.length - 1;
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
        className={`flex h-full items-center gap-1.5 border-r border-[var(--line-strong)] px-3 text-[12.5px] font-bold text-[var(--brand)] transition-colors duration-200 ease-in-out hover:bg-[var(--surface-soft)] ${
          open ? "bg-[var(--surface-soft)]" : "bg-[var(--c-050)]"
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
          className="absolute left-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1.5 shadow-[var(--shadow-lg)]"
        >
          {CATEGORY_ITEMS.map((item, index) => {
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
                className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-[var(--brand)] outline-none transition-colors duration-200 ease-in-out hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)]"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--c-050)] text-[var(--muted-strong)]">
                  <Icon className="size-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/categories"
            role="menuitem"
            ref={(el) => {
              itemsRef.current[CATEGORY_ITEMS.length] = el;
            }}
            onClick={() => close(false)}
            className="mt-1 flex items-center gap-3 border-t border-[var(--line)] px-3 py-2.5 text-[12.5px] font-bold text-[var(--muted-strong)] outline-none transition-colors duration-200 ease-in-out hover:bg-[var(--surface-soft)] focus-visible:bg-[var(--surface-soft)]"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--c-050)] text-[var(--muted-strong)]">
              <LayoutGrid className="size-4" />
            </span>
            ყველა კატეგორია
          </Link>
        </div>
      )}
    </div>
  );
}
