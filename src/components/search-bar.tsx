"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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

export function SearchBar({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLFormElement>(null);
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
      // aborted or offline — keep whatever is shown
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
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <form
      ref={rootRef}
      onSubmit={onSubmit}
      action="/search"
      className="relative flex w-full overflow-visible rounded-2xl border border-white/70 bg-white shadow-[0_18px_45px_rgba(18,19,15,0.16)] ring-1 ring-black/5"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 px-3 min-[380px]:gap-3 min-[380px]:px-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--brand)]">
          <Search className="size-4" />
        </span>
        <input
          name="q"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && query.trim().length >= MIN_QUERY_LENGTH && setOpen(true)}
          maxLength={140}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          placeholder="მოძებნე iPhone 15, MacBook Air..."
          className={`${large ? "h-14 text-base" : "h-12 text-sm"} w-full bg-transparent font-bold text-[var(--brand)] outline-none placeholder:text-[var(--muted)]`}
        />
      </label>
      <button
        type="submit"
        className={`${large ? "h-14 px-4 text-sm min-[380px]:px-7" : "h-12 px-3 text-sm min-[380px]:px-5"} shrink-0 rounded-r-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)] hover:bg-[#d7ff73]`}
      >
        ძებნა
      </button>

      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white py-1 shadow-[0_24px_60px_rgba(18,19,15,0.22)]"
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
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${index === activeIndex ? "bg-[var(--accent-soft)]" : ""}`}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg border border-black/5 object-contain" />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--muted)]">
                    <Search className="size-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[var(--brand)]">{item.name}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">
                    {item.category}
                    {item.shopCount > 1 ? ` · ${item.shopCount} მაღაზია` : ""}
                  </span>
                </span>
                {item.minPrice != null && (
                  <span className="shrink-0 text-sm font-black text-[var(--brand)]">{formatGel(item.minPrice)}</span>
                )}
              </button>
            </li>
          ))}
          <li className="border-t border-black/5">
            <button
              type="button"
              onClick={() => goToSearch(query.trim())}
              className="block w-full px-3 py-2 text-left text-xs font-bold text-[var(--muted)] hover:text-[var(--brand)]"
            >
              ყველა შედეგი „{query.trim()}”-ისთვის →
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
