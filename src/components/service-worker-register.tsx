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
