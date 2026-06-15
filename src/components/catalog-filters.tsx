"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  Store,
  Tags,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CategoryView, ShopView } from "@/lib/catalog-types";
import { trackEvent } from "@/lib/analytics";

export type CatalogFilterValues = {
  q?: string;
  category?: string;
  shop?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  availability?: string;
  sort?: string;
  dealsOnly?: boolean;
  popularOnly?: boolean;
  inStockOnly?: boolean;
  techOnly?: boolean;
  largeDiscountOnly?: boolean;
};

export function CatalogFilters({
  values,
  categories,
  shops,
  action,
  resetHref,
  fixedCategory,
  dealsOnly = false,
  dealShortcuts = false,
  variant = "sidebar",
}: {
  values: CatalogFilterValues;
  categories: CategoryView[];
  shops: ShopView[];
  action: string;
  resetHref: string;
  fixedCategory?: string;
  dealsOnly?: boolean;
  dealShortcuts?: boolean;
  variant?: "sidebar" | "drawer";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inDrawer = variant === "drawer";

  // Live navigation: mutate the *current* querystring, drop pagination, and
  // push without scrolling. Replaces the old form-submit + full page reload —
  // every control change now updates results instantly.
  const navigate = (mutate: (params: URLSearchParams) => void, tracked?: { name: string; value: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page"); // any filter change returns to page 1
    if (fixedCategory) params.delete("category"); // category lives in the path here
    if (tracked) {
      const trackedCategory = fixedCategory ?? params.get("category") ?? values.category ?? undefined;
      trackEvent("filter_used", { category: trackedCategory, filter_name: tracked.name, filter_value: tracked.value });
    }
    const qs = params.toString();
    router.push(qs ? `${action}?${qs}` : action, { scroll: false });
  };

  const setParam = (name: string, value: string) =>
    navigate((p) => (value ? p.set(name, value) : p.delete(name)), value ? { name, value } : undefined);

  const toggleParam = (name: string, checked: boolean) =>
    navigate((p) => (checked ? p.set(name, "true") : p.delete(name)), checked ? { name, value: "true" } : undefined);

  const selectableCategories = categories.filter((c) =>
    c.slug !== "adult" && (!dealsOnly || c.slug === values.category || (c.dealCount ?? 0) > 0),
  );
  const selectableShops = shops.filter((s) =>
    dealsOnly ? s.slug === values.shop || (s.dealCount ?? 0) > 0 : (s.productCount ?? 0) > 0,
  );
  const activeCount = [
    values.category && !fixedCategory,
    values.shop,
    values.dealsOnly,
    values.popularOnly,
    values.inStockOnly,
    values.techOnly,
    values.largeDiscountOnly,
    values.minPrice,
    values.maxPrice,
    values.minDiscount,
    values.availability,
  ].filter(Boolean).length;

  const categoryOptions = [
    { value: "", label: "ყველა კატეგორია" },
    ...selectableCategories.map((c) => ({
      value: c.slug,
      label: withCount(c.nameKa, dealsOnly ? c.dealCount : c.productCount),
    })),
  ];
  const shopOptions = [
    { value: "", label: "ყველა მაღაზია" },
    ...selectableShops.map((s) => ({
      value: s.slug,
      label: withCount(s.name, dealsOnly ? s.dealCount : s.productCount),
    })),
  ];
  const availabilityOptions = [
    { value: "", label: "ყველა" },
    { value: "IN_STOCK", label: "მარაგშია" },
    { value: "OUT_OF_STOCK", label: "ამოიწურა" },
    { value: "UNKNOWN", label: "მოწმდება" },
  ];
  const sortOptions = [
    ...(dealsOnly ? [{ value: "deal-priority", label: "სასარგებლო აქციები" }] : [{ value: "recommended", label: "რეკომენდებული" }]),
    { value: "lowest", label: "იაფიდან ძვირამდე" },
    { value: "highest", label: "ძვირიდან იაფამდე" },
    { value: "discount", label: "დიდი ფასდაკლებით" },
    { value: "updated", label: "ბოლო განახლებული" },
    { value: "newest", label: "ახალი დამატებული" },
  ];

  return (
    <div
      className={
        inDrawer
          ? "flex h-full min-h-0 flex-col bg-white text-gray-900"
          : "overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900"
      }
    >
      {/* Header */}
      {!inDrawer && (
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">ფილტრები</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <Link href={resetHref} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600">
              <RotateCcw className="size-3" />
              გასუფთავება
            </Link>
          )}
        </div>
      )}

      {/* Filter body */}
      <div className={inDrawer ? "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" : "p-3"}>
        <div className="grid gap-3">
          {/* Category */}
          {!fixedCategory && (
            <FilterSection label="კატეგორია" icon={<Tags className="size-3.5" />}>
              <Select
                label="კატეგორია"
                value={values.category ?? ""}
                options={categoryOptions}
                onChange={(v) => setParam("category", v)}
              />
            </FilterSection>
          )}

          {/* Shop */}
          <FilterSection label="მაღაზია" icon={<Store className="size-3.5" />}>
            <Select label="მაღაზია" value={values.shop ?? ""} options={shopOptions} onChange={(v) => setParam("shop", v)} />
          </FilterSection>

          {/* Deals only toggle */}
          {!dealsOnly && (
            <SwitchRow
              label="მხოლოდ ფასდაკლებული"
              checked={values.dealsOnly}
              onChange={(c) => toggleParam("dealsOnly", c)}
            />
          )}

          {/* Hide out-of-stock toggle (deal pages expose it via the quick picks) */}
          {!dealShortcuts && (
            <SwitchRow
              label="ამოწურულის დამალვა"
              checked={values.inStockOnly}
              onChange={(c) => toggleParam("inStockOnly", c)}
            />
          )}

          {/* Quick picks */}
          {dealShortcuts && (
            <FilterSection label="სწრაფი არჩევანი">
              <div className="grid grid-cols-2 gap-1.5">
                <TogglePill label="პოპულარული" checked={values.popularOnly} onChange={(c) => toggleParam("popularOnly", c)} />
                <TogglePill label="მარაგში" checked={values.inStockOnly} onChange={(c) => toggleParam("inStockOnly", c)} />
                <TogglePill label="ტექნიკა" checked={values.techOnly} onChange={(c) => toggleParam("techOnly", c)} />
                <TogglePill label="დიდი ფასდაკლება" checked={values.largeDiscountOnly} onChange={(c) => toggleParam("largeDiscountOnly", c)} />
              </div>
            </FilterSection>
          )}

          {/* Price & status */}
          <FilterSection label="ფასი და სტატუსი">
            <div className="grid grid-cols-2 gap-2">
              <NumberFilter
                label="ფასი დან"
                placeholder="0"
                defaultValue={values.minPrice}
                onCommit={(v) => setParam("minPrice", v)}
              />
              <NumberFilter
                label="ფასი მდე"
                placeholder="9999"
                defaultValue={values.maxPrice}
                onCommit={(v) => setParam("maxPrice", v)}
              />
              <NumberFilter
                label="მინ. ფასდაკლება %"
                placeholder="%"
                max={100}
                defaultValue={values.minDiscount}
                onCommit={(v) => setParam("minDiscount", v)}
              />
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">მარაგი</label>
                <Select
                  label="მარაგი"
                  value={values.availability ?? ""}
                  options={availabilityOptions}
                  onChange={(v) => setParam("availability", v)}
                />
              </div>
            </div>
          </FilterSection>

          {/* Sort */}
          <FilterSection label="დალაგება" icon={<ArrowDownUp className="size-3.5" />}>
            <Select
              label="დალაგება"
              value={values.sort ?? (dealsOnly ? "deal-priority" : "recommended")}
              options={sortOptions}
              onChange={(v) => setParam("sort", v)}
            />
          </FilterSection>
        </div>
      </div>

      {/* Drawer footer: reset only — results apply live, no submit needed. */}
      {inDrawer && activeCount > 0 && (
        <div className="border-t border-gray-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href={resetHref}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="size-4" />
            ფილტრების გასუფთავება
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

/** Numeric filter that commits on a 500ms debounce (and on blur), so typing a
 *  multi-digit price doesn't fire a navigation per keystroke. */
function NumberFilter({
  label,
  placeholder,
  defaultValue,
  max = 1000000,
  onCommit,
}: {
  label: string;
  placeholder?: string;
  defaultValue?: number;
  max?: number;
  onCommit: (value: string) => void;
}) {
  const [val, setVal] = useState(defaultValue != null ? String(defaultValue) : "");
  const dirty = useRef(false);

  // Re-sync from the server value after navigation; never fire a commit for it.
  useEffect(() => {
    dirty.current = false;
    setVal(defaultValue != null ? String(defaultValue) : "");
  }, [defaultValue]);

  // Debounced commit, only for user edits.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      dirty.current = false;
      onCommit(val.trim());
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val]);

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</label>
      <input
        type="number"
        min="0"
        max={max}
        value={val}
        placeholder={placeholder}
        className="filter-control"
        onChange={(e) => {
          dirty.current = true;
          setVal(e.target.value);
        }}
        onBlur={() => {
          if (dirty.current) {
            dirty.current = false;
            onCommit(val.trim());
          }
        }}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Index of the keyboard-highlighted option while the listbox is open.
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Stable id base so options get deterministic ids for aria-activedescendant.
  const baseId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex] ?? options[0];
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const openMenu = (highlight: number) => {
    setActiveIndex(highlight);
    setOpen(true);
  };

  const closeMenu = (refocus = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    closeMenu();
  };

  // Close on outside click / focus leaving the widget (acts as Tab-away close).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  // Move focus into the listbox when it opens so it receives key events and the
  // screen reader announces the aria-activedescendant option.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Keep the highlighted option scrolled into view for keyboard users.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "Enter":
      case " ":
      case "ArrowDown":
        event.preventDefault();
        openMenu(selectedIndex >= 0 ? selectedIndex : 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        openMenu(selectedIndex >= 0 ? selectedIndex : options.length - 1);
        break;
    }
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex >= 0) commit(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu();
        break;
      case "Tab":
        // Let focus move naturally; just close the popup.
        closeMenu(false);
        break;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        onClick={() => (open ? closeMenu(false) : openMenu(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={onTriggerKeyDown}
        className="flex w-full min-h-10 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-900 hover:border-gray-300 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/10 outline-none"
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown className={`size-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[var(--shadow-lg)] outline-none"
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          onKeyDown={onListKeyDown}
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option, index) => {
              const active = option.value === value;
              const highlighted = index === activeIndex;
              return (
                <div
                  key={`opt-${option.value}`}
                  id={optionId(index)}
                  role="option"
                  aria-selected={active}
                  onClick={() => commit(index)}
                  onMouseMove={() => setActiveIndex(index)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                      : "text-gray-700"
                  } ${highlighted ? "bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]" : "hover:bg-gray-50"}`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active && <Check className="size-3.5 shrink-0 text-[var(--accent)]" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-5 w-9 rounded-full border border-gray-300 bg-gray-200 transition peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]" />
        <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
      </div>
    </label>
  );
}

function TogglePill({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="relative min-w-0 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="flex min-h-9 items-center justify-center rounded-md border border-gray-200 px-2 text-center text-xs font-medium text-gray-700 transition peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent-soft)] peer-checked:text-[var(--accent)] hover:border-gray-300 hover:bg-gray-50">
        <span className="truncate">{label}</span>
      </span>
    </label>
  );
}

function withCount(label: string, count?: number) {
  return typeof count === "number" ? `${label} (${count})` : label;
}
