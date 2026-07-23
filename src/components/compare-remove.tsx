"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useCompare } from "@/lib/use-compare";

// Per-column remove button on the compare page. Removing a product must update
// BOTH sources of truth: the persisted tray selection (localStorage, via the
// provider) and the page's own ?items= URL — otherwise the grid would keep
// showing the removed product until the next navigation.
export function CompareRemove({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { remove } = useCompare();

  function handleRemove() {
    remove(slug);
    // Recompute the URL from the live query string (not a server snapshot) so
    // repeated removals compose correctly.
    const remaining = (searchParams.get("items") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item !== slug && decodeSafe(item) !== slug);
    router.replace(remaining.length ? `/compare?items=${remaining.join(",")}` : "/compare");
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      aria-label={`${name} — შედარებიდან მოხსნა`}
      title="შედარებიდან მოხსნა"
      className="absolute right-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-full border border-gray-200 bg-white/90 text-gray-400 shadow-sm backdrop-blur transition-colors hover:border-gray-300 hover:text-gray-700"
    >
      <X className="size-3.5" />
    </button>
  );
}

function decodeSafe(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value;
  }
}
