"use client";

import Link from "next/link";
import {
  ArrowDownUp,
  BadgePercent,
  Check,
  ChevronDown,
  CircleDollarSign,
  PackageCheck,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tags,
} from "lucide-react";
import { FormEvent, useState } from "react";
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
  const inDrawer = variant === "drawer";
  const selectableCategories = categories.filter((c) =>
    c.slug !== "adult" && (!dealsOnly || c.slug === values.category || (c.dealCount ?? 0) > 0),
  );
  const selectableShops = shops.filter((s) =>
    dealsOnly ? s.slug === values.shop || (s.dealCount ?? 0) > 0 : (s.productCount ?? 0) > 0,
  );
  const hasAdvancedFilter = Boolean(values.minPrice || values.maxPrice || values.minDiscount || values.availability);
  const hasShortcutFilter = Boolean(values.popularOnly || values.inStockOnly || values.techOnly || values.largeDiscountOnly);
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

  const [openPanel, setOpenPanel] = useState<"shortcuts" | "advanced" | null>(
    hasShortcutFilter ? "shortcuts" : hasAdvancedFilter ? "advanced" : dealShortcuts ? "shortcuts" : "advanced",
  );

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const target = new URL(form.action, window.location.origin);
    const query = new URLSearchParams();

    for (const [name, value] of new FormData(form).entries()) {
      if (!name || typeof value !== "string") continue;
      if (fixedCategory && name === "category") continue;
      const cleaned = value.trim().replace(/\s+/g, " ").slice(0, name === "q" ? 140 : 80);
      if (!cleaned) continue;
      query.append(name, cleaned);
    }

    target.search = query.toString();
    const trackedCategory = fixedCategory ?? query.get("category") ?? values.category ?? undefined;
    for (const [name, value] of query.entries()) {
      if (name === "q" || name === "page" || name === "category") continue;
      trackEvent("filter_used", { category: trackedCategory, filter_name: name, filter_value: value });
    }
    window.location.assign(`${target.pathname}${target.search}`);
  };

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
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
          <Link href={resetHref} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600">
            <RotateCcw className="size-3" />
            გასუფთავება
          </Link>
        </div>
      )}

      {/* Filter body */}
      <div className={inDrawer ? "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" : "p-3"}>
        <div className="grid gap-3">
          {/* Category */}
          {fixedCategory ? (
            <input type="hidden" name="category" value={fixedCategory} />
          ) : (
            <FilterSection label="კატეგორია" icon={<Tags className="size-3.5" />}>
              <Select name="category" defaultValue={values.category} options={categoryOptions} />
            </FilterSection>
          )}

          {/* Shop */}
          <FilterSection label="მაღაზია" icon={<Store className="size-3.5" />}>
            <Select name="shop" defaultValue={values.shop} options={shopOptions} />
          </FilterSection>

          {/* Deals only toggle */}
          {!dealsOnly && (
            <SwitchRow name="dealsOnly" label="მხოლოდ ფასდაკლებული" checked={values.dealsOnly} />
          )}

          {/* Hide out-of-stock toggle (deal pages expose it via the quick picks) */}
          {!dealShortcuts && (
            <SwitchRow name="inStockOnly" label="ამოწურულის დამალვა" checked={values.inStockOnly} />
          )}

          {/* Quick picks */}
          {dealShortcuts && (
            <CollapsibleSection
              label="სწრაფი არჩევანი"
              open={openPanel === "shortcuts"}
              onToggle={() => setOpenPanel((p) => (p === "shortcuts" ? null : "shortcuts"))}
            >
              <div className="grid grid-cols-2 gap-1.5">
                <TogglePill name="popularOnly" label="პოპულარული" checked={values.popularOnly} />
                <TogglePill name="inStockOnly" label="მარაგში" checked={values.inStockOnly} />
                <TogglePill name="techOnly" label="ტექნიკა" checked={values.techOnly} />
                <TogglePill name="largeDiscountOnly" label="დიდი ფასდაკლება" checked={values.largeDiscountOnly} />
              </div>
            </CollapsibleSection>
          )}

          {/* Price & status */}
          <CollapsibleSection
            label="ფასი და სტატუსი"
            open={openPanel === "advanced"}
            onToggle={() => setOpenPanel((p) => (p === "advanced" ? null : "advanced"))}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">ფასი დან</label>
                <input
                  name="minPrice"
                  type="number"
                  min="0"
                  max="1000000"
                  defaultValue={values.minPrice}
                  className="filter-control"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">ფასი მდე</label>
                <input
                  name="maxPrice"
                  type="number"
                  min="0"
                  max="1000000"
                  defaultValue={values.maxPrice}
                  className="filter-control"
                  placeholder="9999"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">მინ. ფასდაკლება %</label>
                <input
                  name="minDiscount"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={values.minDiscount}
                  className="filter-control"
                  placeholder="%"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">მარაგი</label>
                <Select name="availability" defaultValue={values.availability} options={availabilityOptions} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Sort */}
          <FilterSection label="დალაგება" icon={<ArrowDownUp className="size-3.5" />}>
            <Select
              name="sort"
              defaultValue={values.sort ?? (dealsOnly ? "deal-priority" : "recommended")}
              options={sortOptions}
            />
          </FilterSection>

          {values.q ? <input type="hidden" name="q" value={values.q} /> : null}
        </div>
      </div>

      {/* Apply button */}
      <div
        className={
          inDrawer
            ? "grid grid-cols-2 gap-2 border-t border-gray-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : "border-t border-gray-100 p-3"
        }
      >
        {inDrawer && (
          <Link href={resetHref} className="flex h-11 items-center justify-center rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            გასუფთავება
          </Link>
        )}
        <button
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-black ${inDrawer ? "" : ""}`}
        >
          <Sparkles className="size-4 text-blue-400" />
          გამოყენება
        </button>
      </div>
    </form>
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

function CollapsibleSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-gray-200 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50"
      >
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <ChevronDown className={`size-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 p-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Select({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-10 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-900 hover:border-gray-300 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/10 outline-none"
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown className={`size-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[var(--shadow-lg)]"
          role="listbox"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={`${name}-${option.value}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setValue(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active && <Check className="size-3.5 shrink-0 text-[var(--accent)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SwitchRow({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="relative shrink-0">
        <input name={name} value="true" type="checkbox" defaultChecked={checked} className="peer sr-only" />
        <div className="h-5 w-9 rounded-full border border-gray-300 bg-gray-200 transition peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]" />
        <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
      </div>
    </label>
  );
}

function TogglePill({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="relative min-w-0 cursor-pointer">
      <input name={name} value="true" type="checkbox" defaultChecked={checked} className="peer sr-only" />
      <span className="flex min-h-9 items-center justify-center rounded-md border border-gray-200 px-2 text-center text-xs font-medium text-gray-700 transition peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent-soft)] peer-checked:text-[var(--accent)] hover:border-gray-300 hover:bg-gray-50">
        <span className="truncate">{label}</span>
      </span>
    </label>
  );
}

function withCount(label: string, count?: number) {
  return typeof count === "number" ? `${label} (${count})` : label;
}
