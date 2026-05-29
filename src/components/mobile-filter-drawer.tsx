"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

export function MobileFilterDrawer({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-md border border-[#0f172a] bg-white px-4 text-sm font-bold text-[#0f172a]"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-[#65a30d]" />
          ფილტრები
        </span>
        <span className="rounded-sm bg-[#ecfccb] px-2 py-0.5 text-[11px] font-black text-[#1a2e05]">
          {badge ?? "გახსნა"}
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="ფილტრები">
          <button
            type="button"
            aria-label="ფილტრების დახურვა"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#0f172a]/55 backdrop-blur-sm"
          />
          <div
            id={panelId}
            className="absolute inset-x-0 bottom-0 grid max-h-[min(92dvh,46rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-md border-t border-[#e2e8f0] bg-white"
          >
            <div className="border-b border-[#e2e8f0] bg-[#0f172a] px-4 pb-3 pt-3 text-white">
              <span aria-hidden className="mx-auto mb-3 block h-1 w-12 rounded-full bg-white/30" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black">ფილტრები</p>
                  <p className="mt-0.5 text-xs text-slate-300">შეცვალე მაღაზია, ფასი და დალაგება.</p>
                </div>
                <button
                  type="button"
                  aria-label="დახურვა"
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-md border border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 overflow-hidden bg-[#f8fafc]">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
