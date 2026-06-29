"use client";

import { useEffect } from "react";

/**
 * Registers the same-origin /sw.js service worker for installable-PWA + offline
 * app-shell support. Registration is deferred to window `load` so it never
 * contends with first paint, guarded for SSR / unsupported browsers, and fails
 * silently. Renders nothing.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // The SW cache-firsts /_next/static/** — correct for content-hashed prod
    // assets, but in dev it pins stale chunks and triggers hydration mismatches.
    // So in dev never register it, and actively tear down any SW + caches left
    // from a prod build or earlier session (self-heals an already-polluted tab).
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()), () => {});
      window.caches?.keys().then((keys) => keys.forEach((key) => caches.delete(key)), () => {});
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Fail silently — the SW is a progressive enhancement.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
