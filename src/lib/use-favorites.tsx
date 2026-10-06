"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { createLocalStore, useLocalStore, useMounted } from "@/lib/local-store";

// Client-side favorites ("ფავორიტები"). Unlike compare (slugs only), favorites
// persist a small product *snapshot* so the /favorites page renders instantly
// from localStorage without server fetches — the guest-wishlist pattern used
// by price-comparison sites. Same hydration-safety contract as use-compare:
// empty on the server + hydration render (useSyncExternalStore server
// snapshot), then the stored value; consumers gate visible state on `mounted`.

export const FAVORITES_STORAGE_KEY = "fasmetri:favorites";
export const FAVORITES_MAX = 60;

export type FavoriteSnapshot = {
  slug: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  shopName?: string | null;
  shopCount?: number;
  categorySlug?: string | null;
  savedAt: number;
};

type FavoritesContextValue = {
  mounted: boolean;
  items: FavoriteSnapshot[];
  add: (snapshot: Omit<FavoriteSnapshot, "savedAt">) => void;
  remove: (slug: string) => void;
  toggle: (snapshot: Omit<FavoriteSnapshot, "savedAt">) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  count: number;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function sanitize(values: unknown): FavoriteSnapshot[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: FavoriteSnapshot[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    const slug = typeof record.slug === "string" ? record.slug.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const price = typeof record.price === "number" && Number.isFinite(record.price) ? record.price : null;
    if (!slug || !name || price == null || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      name,
      price,
      oldPrice: typeof record.oldPrice === "number" ? record.oldPrice : null,
      imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : null,
      shopName: typeof record.shopName === "string" ? record.shopName : null,
      shopCount: typeof record.shopCount === "number" ? record.shopCount : undefined,
      categorySlug: typeof record.categorySlug === "string" ? record.categorySlug : null,
      savedAt: typeof record.savedAt === "number" ? record.savedAt : Date.now(),
    });
    if (out.length >= FAVORITES_MAX) break;
  }
  return out;
}

const EMPTY: FavoriteSnapshot[] = [];
const favoritesStore = createLocalStore<FavoriteSnapshot[]>(FAVORITES_STORAGE_KEY, sanitize, EMPTY);
const setItems = favoritesStore.update;

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  const items = useLocalStore(favoritesStore);

  const add = useCallback((snapshot: Omit<FavoriteSnapshot, "savedAt">) => {
    const slug = snapshot.slug.trim();
    if (!slug) return;
    setItems((prev) => {
      if (prev.some((item) => item.slug === slug)) return prev;
      const next = [{ ...snapshot, slug, savedAt: Date.now() }, ...prev];
      return next.slice(0, FAVORITES_MAX);
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((item) => item.slug !== slug));
  }, []);

  const toggle = useCallback((snapshot: Omit<FavoriteSnapshot, "savedAt">) => {
    const slug = snapshot.slug.trim();
    if (!slug) return;
    setItems((prev) => {
      if (prev.some((item) => item.slug === slug)) return prev.filter((item) => item.slug !== slug);
      return [{ ...snapshot, slug, savedAt: Date.now() }, ...prev].slice(0, FAVORITES_MAX);
    });
  }, []);

  const clear = useCallback(() => setItems(() => []), []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      mounted,
      items,
      add,
      remove,
      toggle,
      clear,
      has: (slug: string) => items.some((item) => item.slug === slug),
      count: items.length,
    }),
    [mounted, items, add, remove, toggle, clear],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}
