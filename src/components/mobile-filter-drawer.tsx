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
        className="relative flex min-h-14 w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
      >
        <span className="absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_70%_35%,rgba(37,99,235,0.56),transparent_42%)]" />
        <span className="relative inline-flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
            <SlidersHorizontal className="size-4" />
          </span>
          <span>
              <span className="block text-left text-[10px] uppercase tracking-[0.16em] text-white/42">ფილტრები</span>
            <span className="block text-left leading-none">ფილტრები</span>
          </span>
        </span>
        <span className="relative rounded-full border border-white/12 bg-white px-2.5 py-1 text-[11px] font-black text-[#151713]">
          {badge ?? "გახსნა"}
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="ფილტრები">
          <button
            type="button"
            aria-label="ფილტრების დახურვა"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#0b0d09]/70 backdrop-blur-md"
          />
          <div
            id={panelId}
            className="absolute inset-x-1 bottom-1 top-4 grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/16 bg-[var(--surface-soft)] shadow-[0_30px_80px_rgba(0,0,0,0.38)] min-[360px]:inset-x-2 min-[360px]:bottom-2 min-[360px]:top-8"
          >
            <div className="relative overflow-hidden bg-[#151713] px-4 pb-4 pt-3 text-white">
              <div className="absolute inset-y-0 right-0 w-36 bg-[radial-gradient(circle_at_70%_35%,rgba(37,99,235,0.5),transparent_42%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">ფილტრები</p>
                  <h2 className="mt-1 text-xl font-black leading-none">ფილტრები</h2>
                  <p className="mt-2 max-w-56 text-xs font-bold leading-5 text-white/62">
                    სწრაფად შეცვალე მაღაზია, ფასი, მარაგი და დალაგება.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="დახურვა"
                  onClick={() => setOpen(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/16 bg-white/9 text-white hover:bg-white/14"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 overflow-hidden">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
