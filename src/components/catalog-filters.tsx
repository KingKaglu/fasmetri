"use client";

import Link from "next/link";
import {
  ArrowDownUp,
  BadgePercent,
  ChevronDown,
  CircleDollarSign,
  Check,
  PackageCheck,
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
  const selectableCategories = categories.filter((category) =>
    category.slug !== "adult" && (!dealsOnly || category.slug === values.category || (category.dealCount ?? 0) > 0),
  );
  const selectableShops = shops.filter((shop) =>
    dealsOnly ? shop.slug === values.shop || (shop.dealCount ?? 0) > 0 : (shop.productCount ?? 0) > 0,
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
    ...selectableCategories.map((category) => ({
      value: category.slug,
      label: withCount(category.nameKa, dealsOnly ? category.dealCount : category.productCount),
    })),
  ];
  const shopOptions = [
    { value: "", label: "ყველა მაღაზია" },
    ...selectableShops.map((shop) => ({
      value: shop.slug,
      label: withCount(shop.name, dealsOnly ? shop.dealCount : shop.productCount),
    })),
  ];
  const availabilityOptions = [
    { value: "", label: "ყველა" },
    { value: "IN_STOCK", label: "მარაგშია" },
    { value: "OUT_OF_STOCK", label: "ამოიწურა" },
    { value: "UNKNOWN", label: "მოწმდება" },
  ];
  const sortOptions = [
    ...(dealsOnly ? [{ value: "deal-priority", label: "სასარგებლო აქციები" }] : []),
    { value: "lowest", label: "იაფიდან ძვირამდე" },
    { value: "highest", label: "ძვირიდან იაფამდე" },
    { value: "discount", label: "დიდი ფასდაკლებით" },
    { value: "updated", label: "ბოლო განახლებული" },
    { value: "newest", label: "ახალი დამატებული" },
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
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
          ? "flex h-full min-h-0 flex-col bg-[var(--surface-soft)] text-[var(--brand)]"
          : "filter-deck overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--brand)] shadow-[0_18px_44px_rgba(15,23,42,0.12)]"
      }
    >
      {!inDrawer ? (
        <div className="relative overflow-hidden bg-[#151713] px-4 py-4 text-white">
          <div className="absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_70%_35%,rgba(37,99,235,0.45),transparent_42%),linear-gradient(135deg,transparent,rgba(255,255,255,0.07))]" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">ფილტრები</p>
              <h2 className="mt-1 inline-flex items-center gap-2 text-base font-black">
                <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
                  <SlidersHorizontal className="size-4" />
                </span>
                ფილტრები
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[11px] font-black text-white">
                {activeCount ? `${activeCount} აქტიური` : "სუფთა"}
              </span>
              <Link href={resetHref} className="text-[11px] font-black text-white/52 hover:text-white">
                გასუფთავება
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className={inDrawer ? "min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" : "p-3"}>
        <div className="grid gap-2.5">
          {fixedCategory ? (
            <input type="hidden" name="category" value={fixedCategory} />
          ) : (
            <Field label="კატეგორია" icon={<Tags className="size-4" />} tone="accent">
              <Select name="category" defaultValue={values.category} options={categoryOptions} />
            </Field>
          )}

          <Field label="მაღაზია" icon={<Store className="size-4" />}>
            <Select name="shop" defaultValue={values.shop} options={shopOptions} />
          </Field>

          {!dealsOnly ? (
            <SwitchRow name="dealsOnly" label="მხოლოდ ფასდაკლებული" checked={values.dealsOnly} note="SALE" />
          ) : null}

          {dealShortcuts ? (
            <FilterPanel
              eyebrow="quick picks"
              title="სწრაფი არჩევანი"
              open={openPanel === "shortcuts"}
              onToggle={() => setOpenPanel((panel) => (panel === "shortcuts" ? null : "shortcuts"))}
            >
              <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                <TogglePill name="popularOnly" label="პოპულარული" checked={values.popularOnly} />
                <TogglePill name="inStockOnly" label="მარაგში" checked={values.inStockOnly} />
                <TogglePill name="techOnly" label="ტექნიკა" checked={values.techOnly} />
                <TogglePill name="largeDiscountOnly" label="დიდი ფასდაკლება" checked={values.largeDiscountOnly} />
              </div>
            </FilterPanel>
          ) : null}

          <FilterPanel
            eyebrow="range"
            title="ფასი და სტატუსი"
            open={openPanel === "advanced"}
            onToggle={() => setOpenPanel((panel) => (panel === "advanced" ? null : "advanced"))}
          >
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              <Field label="ფასი დან" compact icon={<CircleDollarSign className="size-3.5" />}>
                <input name="minPrice" type="number" min="0" max="1000000" defaultValue={values.minPrice} className={controlClassName} placeholder="0" />
              </Field>
              <Field label="ფასი მდე" compact icon={<CircleDollarSign className="size-3.5" />}>
                <input name="maxPrice" type="number" min="0" max="1000000" defaultValue={values.maxPrice} className={controlClassName} placeholder="9999" />
              </Field>
              <Field label="მინ. ფასდაკლება" compact icon={<BadgePercent className="size-3.5" />}>
                <input name="minDiscount" type="number" min="0" max="100" defaultValue={values.minDiscount} className={controlClassName} placeholder="%" />
              </Field>
              <Field label="მარაგი" compact icon={<PackageCheck className="size-3.5" />}>
                <Select name="availability" defaultValue={values.availability} options={availabilityOptions} />
              </Field>
            </div>
          </FilterPanel>

          <Field label="დალაგება" icon={<ArrowDownUp className="size-4" />} tone="strong">
            <Select name="sort" defaultValue={values.sort ?? (dealsOnly ? "deal-priority" : "lowest")} options={sortOptions} />
          </Field>

          {values.q ? <input type="hidden" name="q" value={values.q} /> : null}
        </div>
      </div>

      <div
        className={
          inDrawer
            ? "grid grid-cols-1 gap-2 border-t border-[var(--line)] bg-white/95 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_rgba(15,23,42,0.08)] backdrop-blur min-[360px]:grid-cols-[1fr_1.45fr]"
            : "grid gap-2 border-t border-[var(--line)] bg-white p-3"
        }
      >
        {inDrawer ? (
          <Link href={resetHref} className="grid h-12 place-items-center rounded-2xl border border-[#c4d2ba] bg-white px-3 text-sm font-black text-[var(--brand)] hover:border-[var(--brand)]">
            გასუფთავება
          </Link>
        ) : null}
        <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#151713] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(18,19,15,0.18)] hover:-translate-y-0.5 hover:bg-black">
          <Sparkles className="size-4 text-[var(--accent)]" />
          გამოყენება
        </button>
      </div>
    </form>
  );
}

const controlClassName =
  "h-11 w-full rounded-[1rem] border border-[#c8d7bd] bg-white px-3 text-sm font-black text-[#151713] shadow-[inset_0_1px_0_rgba(18,19,15,0.04)] outline-none placeholder:text-[#7b8472] focus:border-[#151713] focus:ring-2 focus:ring-[rgba(16,191,208,0.22)]";

function Field({
  label,
  children,
  compact = false,
  icon,
  tone = "default",
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "strong";
}) {
  const markerClassName =
    tone === "accent"
      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
      : tone === "strong"
        ? "bg-[#151713] text-white"
        : "bg-[#e5efda] text-[var(--brand)]";

  return (
    <div className="block rounded-[1.15rem] border border-[#cfdcc6] bg-[#fbfdf7] p-2 shadow-[0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.52)]">
      <span className={`mb-1.5 flex items-center gap-2 ${compact ? "text-[10px]" : "text-[11px]"} font-black uppercase text-[var(--muted-strong)]`}>
        {icon ? <span className={`grid size-7 place-items-center rounded-xl ${markerClassName}`}>{icon}</span> : null}
        {label}
      </span>
      <span className="block text-sm normal-case text-[var(--brand)]">{children}</span>
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
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative block">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[1rem] border border-[#c8d7bd] bg-white px-3 text-left text-sm font-black text-[#151713] shadow-[inset_0_1px_0_rgba(18,19,15,0.04)] outline-none hover:border-[#151713] focus-visible:border-[#151713] focus-visible:ring-2 focus-visible:ring-[rgba(16,191,208,0.22)]"
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <span className={`grid size-7 shrink-0 place-items-center rounded-xl bg-[#edf4e7] text-[#151713] transition ${open ? "rotate-180 bg-[var(--accent)]" : ""}`}>
          <ChevronDown className="size-4" />
        </span>
      </button>
      {open ? (
        <div className="mt-2 overflow-hidden rounded-[1rem] border border-[#151713] bg-[#151713] p-1.5 text-white shadow-[0_18px_42px_rgba(18,19,15,0.22)]" role="listbox">
          <div className="grid max-h-60 gap-1 overflow-y-auto pr-1">
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
                  className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-black transition ${
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "bg-white/6 text-white hover:bg-white/12"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active ? <Check className="size-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SwitchRow({ name, label, checked, note }: { name: string; label: string; checked?: boolean; note?: string }) {
  return (
    <label className="group flex min-h-14 items-center gap-3 rounded-[1.15rem] border border-[#c8d7bd] bg-[#151713] px-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(18,19,15,0.14)]">
      <input name={name} value="true" type="checkbox" defaultChecked={checked} className="peer sr-only" />
      <span className="relative h-7 w-12 rounded-full border border-white/14 bg-white/12 transition peer-checked:bg-[var(--accent)]">
        <span className="absolute left-1 top-1 size-5 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-[var(--accent-ink)]" />
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {note ? <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black text-[var(--accent-ink)]">{note}</span> : null}
    </label>
  );
}

function TogglePill({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="group relative min-w-0">
      <input name={name} value="true" type="checkbox" defaultChecked={checked} className="peer sr-only" />
      <span className="flex min-h-10 min-w-0 items-center justify-center rounded-2xl border border-[#c8d7bd] bg-white px-2.5 text-center text-xs font-black text-[var(--brand)] transition peer-checked:border-[#151713] peer-checked:bg-[var(--accent)] peer-checked:text-[var(--accent-ink)] group-hover:border-[#151713]">
        <span className="truncate">{label}</span>
      </span>
    </label>
  );
}

function withCount(label: string, count?: number) {
  return typeof count === "number" ? `${label} (${count})` : label;
}

function FilterPanel({
  eyebrow,
  title,
  open,
  onToggle,
  children,
}: {
  eyebrow: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-[#c8d7bd] bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left hover:bg-[#f7faf1]"
      >
        <span>
          <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">{eyebrow}</span>
          <span className="mt-0.5 block text-sm font-black text-[var(--brand)]">{title}</span>
        </span>
        <span className={`grid size-9 shrink-0 place-items-center rounded-2xl border border-[#c8d7bd] bg-[#edf4e7] text-lg font-black leading-none text-[var(--brand)] transition ${open ? "rotate-45 bg-[var(--accent)]" : ""}`}>+</span>
      </button>
      {open ? <div className="grid gap-3 border-t border-[#dbe5d3] bg-[#f7faf1] p-2.5">{children}</div> : null}
    </div>
  );
}
