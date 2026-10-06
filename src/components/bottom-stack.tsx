"use client";

import { useEffect, useRef } from "react";

// The fixed stack above the mobile bottom nav that holds the compare tray and
// the cookie banner. It publishes its own height as --bottom-stack-h so the
// body can reserve that much space (globals.css): while the banner or the tray
// is open, the end of the page can still be scrolled clear of them instead of
// sitting permanently underneath.
export function BottomStack({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--bottom-stack-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--bottom-stack-h");
    };
  }, []);

  return (
    <div ref={ref} className="bottom-stack">
      {children}
    </div>
  );
}
