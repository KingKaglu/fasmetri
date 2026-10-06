import { Star } from "lucide-react";

const SIZES = { sm: "size-3.5", md: "size-4", lg: "size-5" } as const;

/**
 * Read-only rating display. Server-safe so both the public list and the admin
 * table can render it; the interactive picker lives in review-form.tsx.
 */
export function ReviewStars({
  rating,
  size = "md",
  label,
}: {
  rating: number;
  size?: keyof typeof SIZES;
  label?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${rating}/5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          aria-hidden
          className={`${SIZES[size]} ${step <= filled ? "fill-star text-star" : "fill-subtle text-subtle"}`}
        />
      ))}
    </span>
  );
}
