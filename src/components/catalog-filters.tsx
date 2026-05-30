"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
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
  const selectableCategories = categories.filter((category) =>
    category.slug !== "adult" && (!dealsOnly || category.slug === values.category || (category.dealCount ?? 0) > 0),
  );
  const selectableShops = shops.filter((shop) =>
    (dealsOnly ? shop.slug === values.shop || (shop.dealCount ?? 0) > 0 : (shop.productCount ?? 0) > 0),
  );
  const hasAdvancedFilter = Boolean(values.minPrice || values.maxPrice || values.minDiscount || values.availability);
  const hasShortcutFilter = Boolean(values.popularOnly || values.inStockOnly || values.techOnly || values.largeDiscountOnly);
  const [openPanel, setOpenPanel] = useState<"shortcuts" | "advanced" | null>(
    hasShortcutFilter ? "shortcuts" : hasAdvancedFilter ? "advanced" : null,
  );
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const target = new URL(form.action, window.location.origin);
    const query = new URLSearchParams();

    for (const [name, value] of new FormData(form).entries()) {
      if (!name || typeof value !== "string") continue;
      if (fixedCategory && name === "category") continue;
      const cleaned = value.trim();
      if (!cleaned) continue;
      query.append(name, cleaned);
    }

    target.search = query.toString();

    // Report which filters were actually applied (one event per filter).
    const trackedCategory = fixedCategory ?? query.get("category") ?? values.category ?? undefined;
    for (const [name, value] of query.entries()) {
      if (name === "q" || name === "page" || name === "category") continue;
      trackEvent("filter_used", { category: trackedCategory, filter_name: name, filter_value: value });
    }

    window.location.assign(`${target.pathname}${target.search}`);
  };

  const fields = (
    <>
      {fixedCategory ? <input type="hidden" name="category" value={fixedCategory} /> : (
        <Filter label="კატეგორია">
          <select name="category" defaultValue={values.category} className="filter-control">
            <option value="">ყველა</option>
            {selectableCategories.map((category) => <option key={category.id} value={category.slug}>{withCount(category.nameKa, dealsOnly ? category.dealCount : category.productCount)}</option>)}
          </select>
        </Filter>
      )}
      <Filter label="მაღაზია">
        <select name="shop" defaultValue={values.shop} className="filter-control">
          <option value="">ყველა</option>
          {selectableShops.map((shop) => <option key={shop.id} value={shop.slug}>{withCount(shop.name, dealsOnly ? shop.dealCount : shop.productCount)}</option>)}
        </select>
      </Filter>
      {!dealsOnly ? (
        <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-xs font-bold text-[#0f172a]">
          <input name="dealsOnly" value="true" type="checkbox" defaultChecked={values.dealsOnly} className="size-4 accent-[#65a30d]" />
          მხოლოდ ფასდაკლებული
        </label>
      ) : null}
      {dealShortcuts ? (
        <FilterPanel title="სწრაფი ფილტრები" open={openPanel === "shortcuts"} onToggle={() => setOpenPanel((panel) => (panel === "shortcuts" ? null : "shortcuts"))}>
          <div className="grid grid-cols-2 gap-2">
            <FilterToggle name="popularOnly" label="პოპულარული" checked={values.popularOnly} />
            <FilterToggle name="inStockOnly" label="მარაგში" checked={values.inStockOnly} />
            <FilterToggle name="techOnly" label="ტექნიკა" checked={values.techOnly} />
            <FilterToggle name="largeDiscountOnly" label="დიდი ფასდაკლება" checked={values.largeDiscountOnly} />
          </div>
        </FilterPanel>
      ) : null}
      <FilterPanel title="დამატებითი ფილტრები" open={openPanel === "advanced"} onToggle={() => setOpenPanel((panel) => (panel === "advanced" ? null : "advanced"))}>
        <div className="grid grid-cols-2 gap-2">
          <Filter label="ფასი დან"><input name="minPrice" type="number" min="0" defaultValue={values.minPrice} className="filter-control" /></Filter>
          <Filter label="ფასი მდე"><input name="maxPrice" type="number" min="0" defaultValue={values.maxPrice} className="filter-control" /></Filter>
          <Filter label="მინ. ფასდაკლება"><input name="minDiscount" type="number" min="0" max="100" defaultValue={values.minDiscount} className="filter-control" /></Filter>
          <Filter label="ხელმისაწვდომობა">
            <select name="availability" defaultValue={values.availability} className="filter-control">
              <option value="">ყველა</option>
              <option value="IN_STOCK">მარაგშია</option>
              <option value="OUT_OF_STOCK">არ არის მარაგში</option>
              <option value="UNKNOWN">მოწმდება</option>
            </select>
          </Filter>
        </div>
      </FilterPanel>
      <Filter label="დალაგება">
        <select name="sort" defaultValue={values.sort ?? (dealsOnly ? "discount" : "lowest")} className="filter-control">
          {dealsOnly ? <option value="deal-priority">სასარგებლო აქციები</option> : null}
          <option value="lowest">იაფიდან ძვირამდე</option>
          <option value="highest">ძვირიდან იაფამდე</option>
          <option value="discount">ყველაზე დიდი ფასდაკლება</option>
          <option value="updated">ბოლო განახლებული</option>
          <option value="newest">ახალი დამატებული</option>
        </select>
      </Filter>
      {values.q ? <input type="hidden" name="q" value={values.q} /> : null}
    </>
  );

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className={
        inDrawer
          ? "flex h-full min-h-0 flex-col"
          : "grid h-fit gap-2.5 rounded-md border border-[#e2e8f0] bg-white p-3"
      }
    >
      {!inDrawer ? (
        <div className="mb-1 flex items-center justify-between gap-2 border-b border-[#e2e8f0] pb-2">
          <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#0f172a]">
            <SlidersHorizontal className="size-4 text-[#65a30d]" />
            ფილტრები
          </h2>
          <Link href={resetHref} className="text-[11px] font-bold text-[#64748b] hover:text-[#0f172a]">გასუფთავება</Link>
        </div>
      ) : null}
      <div className={inDrawer ? "grid min-h-0 flex-1 content-start gap-3 overflow-y-auto bg-[#f8fafc] px-3 py-3 overscroll-contain" : "contents"}>
        {fields}
      </div>
      <div
        className={
          inDrawer
            ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2 border-t border-[#e2e8f0] bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
            : ""
        }
      >
        {inDrawer ? (
          <Link href={resetHref} className="grid h-11 place-items-center rounded-md border border-[#e2e8f0] bg-white px-3 text-sm font-bold text-[#0f172a] hover:border-[#0f172a]">
            გასუფთავება
          </Link>
        ) : null}
        <button className="h-11 w-full rounded-md bg-[#0f172a] text-sm font-black text-white hover:bg-black">
          გამოყენება
        </button>
      </div>
    </form>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-black uppercase tracking-wider text-[#64748b]">
      {label}
      <span className="mt-1 block text-sm font-semibold text-[#0f172a] normal-case tracking-normal">{children}</span>
    </label>
  );
}

function FilterToggle({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex min-h-8 min-w-0 items-center gap-2 text-xs font-bold text-[#0f172a]">
      <input name={name} value="true" type="checkbox" defaultChecked={checked} className="size-4 accent-[#65a30d]" />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function withCount(label: string, count?: number) {
  return typeof count === "number" ? `${label} (${count})` : label;
}

function FilterPanel({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-md border border-[#e2e8f0] bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-10 w-full items-center justify-between gap-2 px-3 text-left text-[13px] font-bold text-[#0f172a]"
      >
        <span>{title}</span>
        <span className={`text-lg leading-none text-[#65a30d] transition ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open ? (
        <div className="grid gap-2 border-t border-[#e2e8f0] bg-[#f8fafc] p-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
