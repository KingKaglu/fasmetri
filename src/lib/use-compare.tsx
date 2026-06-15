"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Client-side product-compare selection. Holds an array of product *slugs*
// (cap 4, deduped) and persists them to localStorage so the picks survive
// navigation. Hydration safety: the selection always starts empty on the
// server AND on the first client render, then loads from localStorage inside
// an effect once `mounted` is true. Consumers that render visible UI from the
// selection (the tray, the card toggle's checked state) must gate on `mounted`
// to avoid an SSR/client text mismatch.

export const COMPARE_STORAGE_KEY = "fasmetri:compare";
export const COMPARE_MAX = 4;

type CompareContextValue = {
  mounted: boolean;
  items: string[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
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

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<string[]>([]);

  // Load persisted selection once on mount.
  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
      if (raw) setItems(sanitize(JSON.parse(raw)));
    } catch {
      // Corrupt/unavailable storage — start empty.
    }
  }, []);

  // Persist on every change (only after mount so we never clobber storage with
  // the empty initial state before the load effect has run).
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [items, mounted]);

  // Keep multiple tabs / multiple provider mounts in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== COMPARE_STORAGE_KEY) return;
      try {
        setItems(sanitize(event.newValue ? JSON.parse(event.newValue) : []));
      } catch {
        setItems([]);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((slug: string) => {
    const value = slug.trim();
    if (!value) return;
    setItems((prev) => (prev.includes(value) || prev.length >= COMPARE_MAX ? prev : [...prev, value]));
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((item) => item !== slug));
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

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CompareContextValue>(
    () => ({
      mounted,
      items,
      add,
      remove,
      toggle,
      clear,
      has: (slug: string) => items.includes(slug),
      isFull: items.length >= COMPARE_MAX,
      count: items.length,
    }),
    [mounted, items, add, remove, toggle, clear],
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
