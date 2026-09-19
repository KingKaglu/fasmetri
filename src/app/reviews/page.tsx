import type { Metadata } from "next";
import { MessageSquareQuote } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { ReviewStars } from "@/components/review-stars";
import { formatRelativeTime } from "@/lib/format";
import { publicReviewSummary, type PublicReview } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "შეფასებები",
  description:
    "დატოვე შეფასება ფასმეტრზე — რეგისტრაციის გარეშე. წაიკითხე რას წერენ სხვა მომხმარებლები ქართული მაღაზიების ფასების შედარებაზე.",
  alternates: { canonical: "/reviews" },
};

// The list is cached under the "reviews" tag and busted by revalidateReviews()
// on every write, so a fresh review shows up immediately without making the
// page dynamic.
export const revalidate = 300;

export default async function ReviewsPage() {
  const { reviews, total, average, distribution } = await publicReviewSummary();

  return (
    <section className="shell py-8 sm:py-12">
      <div className="max-w-2xl">
        <p className="eyebrow">შენი აზრი</p>
        <h1 className="font-display mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">შეფასებები</h1>
        <p className="mt-3 text-base leading-7 text-gray-600">
          დაწერე რას ფიქრობ ფასმეტრზე — რა გამოგადგა და რა აკლია. რეგისტრაცია არ სჭირდება:
          აირჩიე ვარსკვლავები, დაწერე კომენტარი და გამოაქვეყნე.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:items-start">
        {/* Reviews */}
        <div className="order-2 lg:order-1">
          {total > 0 ? <RatingSummary total={total} average={average} distribution={distribution} /> : null}

          {reviews.length ? (
            <ul className="mt-6 grid gap-4">
              {reviews.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <MessageSquareQuote className="mx-auto size-6 text-gray-400" />
              <p className="mt-3 text-base font-semibold text-gray-900">ჯერ არავის დაუწერია</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-gray-600">
                იყავი პირველი — შენი კომენტარი დაეხმარება სხვებს და გვეტყვის რა გავაუმჯობესოთ.
              </p>
            </div>
          )}
        </div>

        {/* Form — first on mobile, where the point of the page is to write one. */}
        <div className="order-1 lg:sticky lg:top-24 lg:order-2">
          <ReviewForm />
          <p className="mt-3 text-xs leading-5 text-gray-500">
            კომენტარები საჯაროა. სპამის, შეურაცხყოფის ან სარეკლამო ბმულების შემცველი ჩანაწერი იშლება.
          </p>
        </div>
      </div>
    </section>
  );
}

function RatingSummary({
  total,
  average,
  distribution,
}: {
  total: number;
  average: number;
  distribution: number[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <p className="font-display text-4xl font-bold leading-none text-gray-900 tabular-nums">
          {average.toFixed(1)}
        </p>
        <div className="mt-2">
          <ReviewStars rating={average} label={`საშუალო შეფასება ${average.toFixed(1)} 5-დან`} />
        </div>
        <p className="mt-1 text-xs text-gray-500">{total} შეფასება</p>
      </div>

      <ul className="min-w-[12rem] flex-1 grid gap-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star - 1] ?? 0;
          const percent = total ? Math.round((count / total) * 100) : 0;
          return (
            <li key={star} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-3 tabular-nums">{star}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span className="block h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
              </span>
              <span className="w-8 text-right tabular-nums text-gray-500">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const name = review.authorName?.trim() || "ანონიმური";
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ReviewStars rating={review.rating} size="sm" label={`${review.rating} 5-დან`} />
          <span className="text-sm font-semibold text-gray-900">{name}</span>
        </div>
        <time dateTime={review.createdAt.toISOString()} className="text-xs text-gray-500">
          {formatRelativeTime(review.createdAt)}
        </time>
      </div>

      {/* whitespace-pre-line keeps the visitor's own line breaks without
          letting any of their text be interpreted as markup. */}
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{review.body}</p>

      {review.reply ? (
        <div className="mt-4 rounded-lg border-l-2 border-[var(--accent)] bg-gray-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">ფასმეტრის პასუხი</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">{review.reply}</p>
        </div>
      ) : null}
    </article>
  );
}
