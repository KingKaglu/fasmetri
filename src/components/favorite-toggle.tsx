"use client";

import { Heart } from "lucide-react";
import { FavoriteSnapshot, useFavorites } from "@/lib/use-favorites";

// Heart toggle for saving a product to favorites. Card variant sits next to
// the compare toggle in the image corner; inline variant is a labeled button
// for the product page. Both are isolated from surrounding <Link>s and render
// the neutral state until the provider has hydrated (no hydration mismatch).
export function FavoriteToggle({
  snapshot,
  variant = "card",
}: {
  snapshot: Omit<FavoriteSnapshot, "savedAt">;
  variant?: "card" | "inline";
}) {
  const { mounted, has, toggle } = useFavorites();
  const selected = mounted && has(snapshot.slug);

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(snapshot);
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
          selected
            ? "border-danger-line bg-danger-soft text-danger"
            : "border-line bg-surface text-ink-soft hover:border-danger-line hover:bg-danger-soft hover:text-danger"
        }`}
      >
        <Heart className={`size-4 ${selected ? "fill-current" : ""}`} />
        {selected ? "ფავორიტებშია" : "ფავორიტებში"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? `${snapshot.name} — ფავორიტებიდან მოხსნა` : `${snapshot.name} — ფავორიტებში დამატება`}
      title={selected ? "ფავორიტებიდან მოხსნა" : "ფავორიტებში დამატება"}
      onClick={onClick}
      className={`absolute right-11 top-2 z-20 grid size-7 place-items-center rounded-full border shadow-sm transition-colors ${
        selected
          ? "border-transparent bg-deal-strong text-white"
          : "border-line bg-overlay text-muted backdrop-blur hover:border-line-strong hover:text-ink-soft"
      }`}
    >
      <Heart className={`size-4 ${selected ? "fill-current" : ""}`} />
    </button>
  );
}
