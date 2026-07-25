"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { COMPARE_MAX, useCompare } from "@/lib/use-compare";

// Small additive control rendered in the product card's top-right corner. It is
// a button (not part of the card's <Link>s) and stops propagation so a tap
// never triggers the card's navigation. Until the provider has mounted +
// hydrated from localStorage we render the neutral "add" state, so server and
// first-client markup match (no hydration mismatch).
export function CompareToggle({ slug, name }: { slug: string; name: string }) {
  const { mounted, has, toggle, isFull } = useCompare();
  const selected = mounted && has(slug);
  const full = mounted && !selected && isFull;
  const [showFullHint, setShowFullHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  // When the list is full this used to be a `disabled` button whose only
  // explanation was a `title` tooltip — invisible on touch, where most shopping
  // happens. It read as a dead button. Keep it focusable and clickable, mark it
  // aria-disabled, and answer a tap with a visible reason.
  function handleClick(event: React.MouseEvent) {
    // Card image/title are wrapped in <Link>; keep the toggle isolated.
    event.preventDefault();
    event.stopPropagation();
    if (full) {
      setShowFullHint(true);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setShowFullHint(false), 2600);
      return;
    }
    toggle(slug);
  }

  return (
    <div className="absolute right-2 top-2 z-20">
      <button
        type="button"
        aria-pressed={selected}
        aria-disabled={full}
        aria-label={selected ? `${name} — შედარებიდან მოხსნა` : `${name} — შედარებაში დამატება`}
        title={
          selected
            ? "შედარებიდან მოხსნა"
            : full
              ? `შედარების სია სავსეა (მაქს. ${COMPARE_MAX})`
              : "შედარებაში დამატება"
        }
        onClick={handleClick}
        className={`grid size-7 place-items-center rounded-full border shadow-sm transition-colors ${
          selected
            ? "border-transparent text-white"
            : "border-gray-200 bg-white/90 text-gray-500 backdrop-blur hover:border-gray-300 hover:text-gray-700"
        } ${full ? "opacity-40" : ""}`}
        style={selected ? { background: "var(--accent)" } : undefined}
      >
        {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
      </button>

      {showFullHint && (
        <span
          role="status"
          className="absolute right-0 top-8 z-30 w-max max-w-[11rem] rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-medium leading-4 text-white shadow-lg"
        >
          შედარების სია სავსეა — ჯერ მოხსენი პროდუქტი
        </span>
      )}
    </div>
  );
}
