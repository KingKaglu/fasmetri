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
    <div className="mb-5 lg:hidden">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="flex h-[3.25rem] w-full items-center justify-between gap-3 rounded-2xl border border-[#d9e4f2] bg-white px-4 font-black shadow-sm hover:border-[#b8cdf0]"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-[#0054d2]" />
          ფილტრები
        </span>
        <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-xs text-[#0054d2]">{badge ?? "გახსნა"}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="ფილტრები">
          <button type="button" aria-label="ფილტრების დახურვა" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#12203a]/45 backdrop-blur-sm" />
          <div id={panelId} className="absolute inset-x-0 bottom-0 grid max-h-[min(92dvh,46rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-[1.75rem] border bg-white shadow-[0_-24px_80px_rgba(18,32,58,.28)]">
            <div className="border-b bg-[#f8fafc] px-4 pb-3 pt-2">
              <span aria-hidden className="mx-auto mb-3 block h-1 w-12 rounded-full bg-[#c8d7d8]" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">ფილტრები</p>
                  <p className="mt-1 text-sm text-[#64748b]">შეცვალე მაღაზია, ფასი და დალაგება.</p>
                </div>
                <button type="button" aria-label="დახურვა" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-2xl border bg-white text-[#12203a]">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 overflow-hidden bg-[#f8fafc]">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
