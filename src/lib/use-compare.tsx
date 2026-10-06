"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { createLocalStore, useLocalStore, useMounted } from "@/lib/local-store";

// Client-side product-compare selection. Holds an array of product *slugs*
// (cap 4, deduped) and persists them to localStorage so the picks survive
// navigation. Hydration safety: the selection is empty on the server AND on
// the hydration render (useSyncExternalStore's server snapshot), then switches
// to the stored value. Consumers that render visible UI from the selection
// (the tray, the card toggle's checked state) still gate on `mounted`.

export const COMPARE_STORAGE_KEY = "fasmetri:compare";
export const COMPARE_MAX = 4;

type CompareContextValue = {
  mounted: boolean;
  items: string[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
  removeMany: (slugs: string[]) => void;
  toggle: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  isFull: boolean;
  count: number;
};

const CompareContext = createContext<CompareContextValue | null>(null);

function sanitize(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const slug = value.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= COMPARE_MAX) break;
  }
  return out;
}

const EMPTY: string[] = [];
// One store per tab: every provider mount shares it, and other tabs are
// followed through the `storage` event.
const compareStore = createLocalStore<string[]>(COMPARE_STORAGE_KEY, sanitize, EMPTY);
const setItems = compareStore.update;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  const items = useLocalStore(compareStore);

  const add = useCallback((slug: string) => {
    const value = slug.trim();
    if (!value) return;
    setItems((prev) => (prev.includes(value) || prev.length >= COMPARE_MAX ? prev : [...prev, value]));
  }, []);

  // Returns `prev` untouched when the slug is not in the list. Filtering
  // unconditionally would hand React a fresh array every call, so a no-op
  // removal would still re-render — and an effect that prunes stale slugs would
  // loop forever.
  const remove = useCallback((slug: string) => {
    setItems((prev) => (prev.includes(slug) ? prev.filter((item) => item !== slug) : prev));
  }, []);

  // Drops several slugs in one state update, so pruning N stale entries costs
  // one render instead of N.
  const removeMany = useCallback((slugs: string[]) => {
    const drop = new Set(slugs);
    setItems((prev) => (prev.some((item) => drop.has(item)) ? prev.filter((item) => !drop.has(item)) : prev));
  }, []);

  const toggle = useCallback((slug: string) => {
    const value = slug.trim();
    if (!value) return;
    setItems((prev) => {
      if (prev.includes(value)) return prev.filter((item) => item !== value);
      if (prev.length >= COMPARE_MAX) return prev;
      return [...prev, value];
    });
  }, []);

  const clear = useCallback(() => setItems((prev) => (prev.length ? [] : prev)), []);

  const value = useMemo<CompareContextValue>(
    () => ({
      mounted,
      items,
      add,
      remove,
      removeMany,
      toggle,
      clear,
      has: (slug: string) => items.includes(slug),
      isFull: items.length >= COMPARE_MAX,
      count: items.length,
    }),
    [mounted, items, add, remove, removeMany, toggle, clear],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return ctx;
}
