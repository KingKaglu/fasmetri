"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Search, X } from "lucide-react";
import { formatGel } from "@/lib/format";

// Recent searches (idealo-style): last submitted queries, shown when the
// input is focused while empty. Stored per browser, capped, best-effort.
const RECENT_SEARCHES_KEY = "fasmetri:recent-searches";
const RECENT_SEARCHES_MAX = 6;

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const value = query.trim();
  if (value.length < 2) return;
  try {
    const next = [value, ...readRecentSearches().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(
      0,
      RECENT_SEARCHES_MAX,
    );
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // Best-effort only.
  }
}

type Suggestion = {
  slug: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  minPrice: number | null;
  shopCount: number;
};

type BrandSuggestion = { name: string; productCount: number };
type CategorySuggestion = { slug: string; nameKa: string; productCount: number };

type SuggestResponse = {
  suggestions: Suggestion[];
  brands?: BrandSuggestion[];
  categories?: CategorySuggestion[];
};

const DEBOUNCE_MS = 150;
const MIN_QUERY_LENGTH = 2;

export function SearchBar({
  defaultValue = "",
  large = false,
  variant = "hero",
}: {
  defaultValue?: string;
  large?: boolean;
  variant?: "hero" | "header";
}) {
  const router = useRouter();
  // Per-instance ids: the header (desktop + mobile) and the hero each mount a
  // SearchBar, so a fixed id produced duplicate ids and broke the combobox's
  // aria-controls / aria-activedescendant wiring.
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [brands, setBrands] = useState<BrandSuggestion[]>([]);
  const [categories, setCategories] = useState<CategorySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, SuggestResponse>());

  const applyResponse = useCallback((data: SuggestResponse) => {
    setSuggestions(data.suggestions);
    setBrands(data.brands ?? []);
    setCategories(data.categories ?? []);
    setOpen(data.suggestions.length > 0 || (data.brands?.length ?? 0) > 0 || (data.categories?.length ?? 0) > 0);
    setActiveIndex(-1);
  }, []);

  const fetchSuggestions = useCallback(async (value: string) => {
    const key = value.toLowerCase();
    const cached = cacheRef.current.get(key);
    if (cached) {
      applyResponse(cached);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch(`/api/suggest?q=${encodeURIComponent(value)}`, { signal: controller.signal });
      if (!response.ok) return;
      const data = (await response.json()) as SuggestResponse;
      cacheRef.current.set(key, data);
      if (cacheRef.current.size > 80) {
        const first = cacheRef.current.keys().next().value;
        if (first !== undefined) cacheRef.current.delete(first);
      }
      applyResponse(data);
    } catch {
      // aborted or offline
    }
  }, [applyResponse]);

  const onChange = (value: string) => {
    setQuery(value);
    setRecentsOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setBrands([]);
      setCategories([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(trimmed), DEBOUNCE_MS);
  };

  const clearQuery = () => {
    setQuery("");
    setSuggestions([]);
    setBrands([]);
    setCategories([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const goToSearch = useCallback(
    (value: string) => {
      setOpen(false);
      setRecentsOpen(false);
      saveRecentSearch(value);
      router.push(`/search?q=${encodeURIComponent(value)}`);
    },
    [router],
  );

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      setOpen(false);
      router.push(`/products/${suggestions[activeIndex].slug}`);
      return;
    }
    const trimmed = query.trim();
    if (trimmed) goToSearch(trimmed);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open || !suggestions.length) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRecentsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const isHeader = variant === "header";

  return (
    <form
      ref={rootRef}
      onSubmit={onSubmit}
      action="/search"
      className="relative flex min-w-0 w-full overflow-visible"
    >
      {/* No overflow-hidden here: the category menu renders as an absolutely
          positioned dropdown inside this container, and clipping it hid every
          entry past the first. The pill shape comes from the container radius
          plus matching rounded-sm ends on the first/last children instead. */}
      <div
        className={`flex min-w-0 flex-1 items-center rounded-full border bg-surface shadow-sm ${
          isHeader ? "h-10 md:h-11" : large ? "h-14" : "h-12"
        } ${
          open && suggestions.length > 0
            ? "border-accent ring-2 ring-focus-ring"
            : "border-line focus-within:border-accent focus-within:ring-2 focus-within:ring-focus-ring"
        }`}
      >
        <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
          <Search className={`shrink-0 text-muted ${isHeader ? "size-3.5" : "size-4.5"}`} />
          <input
            ref={inputRef}
            name="q"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 && query.trim().length >= MIN_QUERY_LENGTH) {
                setOpen(true);
                return;
              }
              if (!query.trim()) {
                const recents = readRecentSearches();
                if (recents.length) {
                  setRecentSearches(recents);
                  setRecentsOpen(true);
                }
              }
            }}
            maxLength={140}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && activeIndex >= 0 && suggestions[activeIndex] ? optionId(activeIndex) : undefined}
            aria-label="პროდუქტის ძებნა"
            placeholder="მოძებნე პროდუქტი…"
            className={`w-full min-w-0 bg-transparent font-medium text-ink outline-none placeholder:text-muted ${
              isHeader ? "text-sm" : large ? "text-base" : "text-sm"
            }`}
          />
        </label>

        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-mute hover:text-ink-soft"
            aria-label="გასუფთავება"
          >
            <X className="size-4" />
          </button>
        )}

        <button
          type="submit"
          aria-label="ძებნა"
          className={`shrink-0 rounded-r-full font-semibold text-accent-ink ${
            isHeader
              ? "h-full bg-accent px-4 text-sm hover:bg-accent-strong"
              : large
                ? "h-full bg-accent px-4 text-sm hover:bg-accent-strong sm:px-6"
                : "h-full bg-accent px-4 text-sm hover:bg-accent-strong sm:px-5"
          }`}
        >
          {isHeader ? (
            <Search className="size-4" />
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Search className="size-4" />
              {/* Icon-only on phones so the input keeps room for its placeholder;
                  the button's aria-label still names it. */}
              <span className="hidden sm:inline">ძებნა</span>
            </span>
          )}
        </button>
      </div>

      {/* Recent searches dropdown — focused with empty input */}
      {recentsOpen && !open && recentSearches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]">
          <li className="px-3 pb-1 pt-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">ბოლო ძიებები</li>
          {recentSearches.map((term) => (
            <li key={term}>
              <button
                type="button"
                onClick={() => {
                  setQuery(term);
                  goToSearch(term);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface-soft"
              >
                <Clock3 className="size-3.5 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">{term}</span>
                <ArrowRight className="size-3 shrink-0 text-subtle" />
              </button>
            </li>
          ))}
          <li className="border-t border-line">
            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
                } catch {
                  // ignore
                }
                setRecentSearches([]);
                setRecentsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-muted hover:bg-surface-soft hover:text-ink-soft"
            >
              ისტორიის გასუფთავება
            </button>
          </li>
        </ul>
      )}

      {/* Suggestions dropdown */}
      {open && (suggestions.length > 0 || brands.length > 0 || categories.length > 0) && (
        <ul
          id={listId}
          role="listbox"
          aria-label="ძიების შედეგები"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]"
        >
          {suggestions.length > 0 && (
            <li role="presentation" className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wider text-muted">პროდუქტები</li>
          )}
          {suggestions.map((item, index) => (
            <li key={item.slug} id={optionId(index)} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setOpen(false);
                  router.push(`/products/${item.slug}`);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 ease-in-out ${
                  index === activeIndex ? "bg-accent-soft" : "hover:bg-surface-soft"
                }`}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-9 shrink-0 rounded-md border border-line object-contain bg-image-tile"
                  />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-mute text-muted">
                    <Search className="size-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {item.category}
                    {item.shopCount > 1 ? ` · ${item.shopCount} მაღაზია` : ""}
                  </span>
                </span>
                {item.minPrice != null && (
                  <span className="shrink-0 text-sm font-bold text-ink">{formatGel(item.minPrice)}</span>
                )}
              </button>
            </li>
          ))}
          {(brands.length > 0 || categories.length > 0) && (
            <li role="presentation" className="border-t border-line px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wider text-muted">
              ბრენდები და კატეგორიები
            </li>
          )}
          {(brands.length > 0 || categories.length > 0) && (
            <li role="presentation" className="flex flex-wrap gap-1.5 px-3 pb-2.5">
              {brands.map((brand) => (
                <button
                  key={`brand-${brand.name}`}
                  type="button"
                  onClick={() => goToSearch(brand.name)}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-line bg-surface-soft px-2.5 text-xs font-medium text-ink-soft hover:border-accent hover:bg-accent-soft hover:text-accent"
                >
                  {brand.name}
                  <span className="text-[12px] text-muted">{brand.productCount}</span>
                </button>
              ))}
              {categories.map((category) => (
                <button
                  key={`category-${category.slug}`}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/categories/${category.slug}`);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/20 bg-accent-soft px-2.5 text-xs font-medium text-accent hover:border-accent"
                >
                  {category.nameKa}
                  <span className="text-[12px] text-muted">{category.productCount}</span>
                </button>
              ))}
            </li>
          )}
          <li role="presentation" className="border-t border-line">
            <button
              type="button"
              onClick={() => goToSearch(query.trim())}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-accent hover:bg-accent-soft"
            >
              <span>ყველა შედეგი „{query.trim()}&quot;</span>
              <ArrowRight className="size-3.5" />
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
