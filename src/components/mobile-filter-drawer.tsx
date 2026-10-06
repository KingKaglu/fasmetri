"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileFilterDrawer({
  children,
  badge,
  resultCount,
}: {
  children: React.ReactNode;
  badge?: string;
  // Live result count for the sticky "show results" button. Filters navigate
  // as they change, so the page re-renders and passes the new count in.
  resultCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog, then keep Tab / Shift+Tab inside it.
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      // Return focus to the control that opened the drawer.
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 text-sm font-bold text-ink shadow-sm hover:border-accent hover:text-accent"
      >
        <span className="inline-flex items-center gap-2 text-[13px]">
          <SlidersHorizontal className="size-4" />
          ფილტრები
        </span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">
          {badge ?? "გახსნა"}
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button
            type="button"
            tabIndex={-1}
            aria-label="ფილტრების დახურვა"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-scrim"
          />
          <div
            ref={panelRef}
            id={panelId}
            className="absolute inset-x-0 bottom-0 top-12 grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-xl bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 id={titleId} className="flex items-center gap-2 text-[14px] font-bold text-ink">
                <SlidersHorizontal className="size-4" />
                ფილტრები
              </h2>
              <button
                type="button"
                aria-label="დახურვა"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-surface text-muted hover:bg-surface-soft"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-hidden">{children}</div>
            {/* Sticky footer: filters apply live, this just closes the sheet. */}
            <div
              className="border-t border-line bg-surface px-4 pt-3"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-accent flex h-11 w-full items-center justify-center text-sm"
              >
                შედეგების ნახვა{resultCount != null ? ` (${formatNumber(resultCount)})` : ""}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
