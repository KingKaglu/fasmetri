"use client";

import { Check, Plus } from "lucide-react";
import { useCompare } from "@/lib/use-compare";

// Small additive control rendered in the product card's top-right corner. It is
// a button (not part of the card's <Link>s) and stops propagation so a tap
// never triggers the card's navigation. Until the provider has mounted +
// hydrated from localStorage we render the neutral "add" state, so server and
// first-client markup match (no hydration mismatch).
export function CompareToggle({ slug, name }: { slug: string; name: string }) {
  const { mounted, has, toggle, isFull } = useCompare();
  const selected = mounted && has(slug);
  const disabled = mounted && !selected && isFull;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? `${name} — შედარებიდან მოხსნა` : `${name} — შედარებაში დამატება`}
      title={
        selected
          ? "შედარებიდან მოხსნა"
          : disabled
            ? "შედარების სია სავსეა (მაქს. 4)"
            : "შედარებაში დამატება"
      }
      disabled={disabled}
      onClick={(event) => {
        // Card image/title are wrapped in <Link>; keep the toggle isolated.
        event.preventDefault();
        event.stopPropagation();
        toggle(slug);
      }}
      className={`absolute right-2 top-2 z-20 grid size-7 place-items-center rounded-full border shadow-sm transition-colors ${
        selected
          ? "border-transparent text-white"
          : "border-gray-200 bg-white/90 text-gray-500 backdrop-blur hover:border-gray-300 hover:text-gray-700"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
      style={selected ? { background: "var(--accent)" } : undefined}
    >
      {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
    </button>
  );
}
