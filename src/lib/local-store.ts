"use client";

import { useSyncExternalStore } from "react";

// A localStorage-backed value exposed through useSyncExternalStore, for the
// guest-state providers (compare, favorites) and the recents strip.
//
// Why not useState + "load in an effect": that pattern renders once empty,
// then calls setState synchronously inside the effect, which the React
// Compiler lint rejects (react-hooks/set-state-in-effect) and which costs a
// cascading render. With useSyncExternalStore the server snapshot is `empty`,
// hydration renders the same `empty`, and React itself switches to the client
// snapshot right after — the same visible behaviour, without the effect.
//
// The in-memory value is the source of truth for this tab; localStorage is
// best-effort persistence (private mode / quota failures are ignored, exactly
// as before). Other tabs are followed through the `storage` event.

export type LocalStore<T> = {
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  subscribe: (listener: () => void) => () => void;
  update: (updater: (previous: T) => T) => void;
};

export function createLocalStore<T>(key: string, parse: (value: unknown) => T, empty: T): LocalStore<T> {
  let value = empty;
  let loaded = false;
  const listeners = new Set<() => void>();

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) value = parse(JSON.parse(raw));
    } catch {
      // Corrupt/unavailable storage — start empty.
    }
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== key) return;
    try {
      value = event.newValue ? parse(JSON.parse(event.newValue)) : empty;
    } catch {
      value = empty;
    }
    emit();
  }

  return {
    getSnapshot() {
      load();
      return value;
    },
    getServerSnapshot() {
      return empty;
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    update(updater) {
      load();
      const next = updater(value);
      if (Object.is(next, value)) return;
      value = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore quota / private-mode failures.
      }
      emit();
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

const noopSubscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards. The
 * useSyncExternalStore replacement for `const [mounted, setMounted] =
 * useState(false); useEffect(() => setMounted(true), [])`.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Same idea for a browser capability check that must not run during SSR. */
export function useClientValue<T>(getClientValue: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, getClientValue, () => serverValue);
}
