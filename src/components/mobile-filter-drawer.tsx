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
        className="flex h-11 w-full items-center justify-between gap-3 border border-zinc-950 bg-white px-3 text-sm font-bold text-zinc-950 hover:bg-zinc-50"
      >
        <span className="inline-flex items-center gap-2 uppercase tracking-[0.06em] text-[12px]">
          <SlidersHorizontal className="size-4" />
          ფილტრები
        </span>
        <span className="bg-zinc-950 px-2 py-0.5 text-[11px] font-bold text-white">
          {badge ?? "გახსნა"}
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="ფილტრები">
          <button
            type="button"
            aria-label="ფილტრების დახურვა"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-gray-900/50"
          />
          <div
            id={panelId}
            className="absolute inset-x-0 bottom-0 top-12 grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-xl bg-white shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-zinc-950 px-4 py-3">
              <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-gray-900">
                <SlidersHorizontal className="size-4" />
                ფილტრები
              </h2>
              <button
                type="button"
                aria-label="დახურვა"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-hidden">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
