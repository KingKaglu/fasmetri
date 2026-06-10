"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { formatGel } from "@/lib/format";

type Suggestion = {
  slug: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  minPrice: number | null;
  shopCount: number;
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
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, Suggestion[]>());

  const fetchSuggestions = useCallback(async (value: string) => {
    const key = value.toLowerCase();
    const cached = cacheRef.current.get(key);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch(`/api/suggest?q=${encodeURIComponent(value)}`, { signal: controller.signal });
      if (!response.ok) return;
      const data = (await response.json()) as { suggestions: Suggestion[] };
      cacheRef.current.set(key, data.suggestions);
      if (cacheRef.current.size > 80) {
        const first = cacheRef.current.keys().next().value;
        if (first !== undefined) cacheRef.current.delete(first);
      }
      setSuggestions(data.suggestions);
      setOpen(data.suggestions.length > 0);
      setActiveIndex(-1);
    } catch {
      // aborted or offline
    }
  }, []);

  const onChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(trimmed), DEBOUNCE_MS);
  };

  const clearQuery = () => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const goToSearch = useCallback(
    (value: string) => {
      setOpen(false);
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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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
      <div
        className={`flex min-w-0 flex-1 items-center overflow-hidden border bg-white ${
          isHeader
            ? "h-10 rounded-md border-gray-200 shadow-sm"
            : large
              ? "h-14 rounded-lg border-gray-300 shadow-md"
              : "h-12 rounded-lg border-gray-300 shadow-md"
        } ${open && suggestions.length > 0 ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/10" : "hover:border-gray-300 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/10"}`}
      >
        <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
          <Search className={`shrink-0 text-gray-400 ${isHeader ? "size-3.5" : "size-4.5"}`} />
          <input
            ref={inputRef}
            name="q"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => suggestions.length > 0 && query.trim().length >= MIN_QUERY_LENGTH && setOpen(true)}
            maxLength={140}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls="search-suggestions"
            aria-label="პროდუქტის ძებნა"
            placeholder={isHeader ? "მოძებნე..." : "მოძებნე iPhone 15, MacBook Air, Galaxy S25..."}
            className={`w-full min-w-0 bg-transparent font-medium text-gray-900 outline-none placeholder:text-gray-400 ${
              isHeader ? "text-sm" : large ? "text-base" : "text-sm"
            }`}
          />
        </label>

        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="shrink-0 px-2 text-gray-400 hover:text-gray-600"
            aria-label="გასუფთავება"
          >
            <X className="size-3.5" />
          </button>
        )}

        <button
          type="submit"
          className={`shrink-0 font-semibold text-white ${
            isHeader
              ? "h-full rounded-r-md bg-[var(--accent)] px-4 text-sm hover:bg-[var(--accent-strong)]"
              : large
                ? "h-full rounded-r-lg bg-[var(--accent)] px-6 text-sm hover:bg-[var(--accent-strong)]"
                : "h-full rounded-r-lg bg-[var(--accent)] px-5 text-sm hover:bg-[var(--accent-strong)]"
          }`}
        >
          {isHeader ? <Search className="size-4" /> : "ძებნა"}
        </button>
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[var(--shadow-lg)]"
        >
          {suggestions.map((item, index) => (
            <li key={item.slug} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setOpen(false);
                  router.push(`/products/${item.slug}`);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  index === activeIndex ? "bg-[var(--accent-soft)]" : "hover:bg-gray-50"
                }`}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-9 shrink-0 rounded-md border border-gray-100 object-contain bg-gray-50"
                  />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-gray-100 text-gray-400">
                    <Search className="size-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{item.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {item.category}
                    {item.shopCount > 1 ? ` · ${item.shopCount} მაღაზია` : ""}
                  </span>
                </span>
                {item.minPrice != null && (
                  <span className="shrink-0 text-sm font-bold text-gray-900">{formatGel(item.minPrice)}</span>
                )}
              </button>
            </li>
          ))}
          <li className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => goToSearch(query.trim())}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-[var(--accent)] hover:bg-blue-50"
            >
              <span>ყველა შედეგი „{query.trim()}"</span>
              <ArrowRight className="size-3.5" />
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
