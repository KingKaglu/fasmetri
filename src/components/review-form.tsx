"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { REVIEW_BODY_MAX, REVIEW_BODY_MIN, REVIEW_NAME_MAX } from "@/lib/review-rules";

const RATING_LABELS = ["ცუდი", "სუსტი", "საშუალო", "კარგი", "შესანიშნავი"];

/**
 * The whole point is that this costs nothing to use: no account, no email, no
 * captcha. The two invisible guards it carries for the API are the honeypot
 * input (hidden from people, filled by bots) and the time the form spent on
 * screen before submitting.
 */
export function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"published" | "pending" | null>(null);
  // The page is cached, so a visitor can land on HTML rendered minutes ago.
  // Start the clock when the component actually mounts in their browser, not
  // when it rendered — and set it in an effect, because Date.now() during
  // render is impure.
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const shown = hovered || rating;
  const remaining = REVIEW_BODY_MAX - body.length;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");

    if (!rating) {
      setError("აირჩიე შეფასება 1-დან 5 ვარსკვლავამდე.");
      return;
    }
    if (body.trim().length < REVIEW_BODY_MIN) {
      setError(`დაწერე მინიმუმ ${REVIEW_BODY_MIN} სიმბოლო.`);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rating,
          body: body.trim(),
          authorName: String(form.get("authorName") ?? "").trim() || undefined,
          website: String(form.get("website") ?? ""),
          elapsedMs: mountedAt.current === null ? undefined : Date.now() - mountedAt.current,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; pending?: boolean } | null;

      if (response.ok) {
        setDone(payload?.pending ? "pending" : "published");
        trackEvent("review_submitted", { rating });
      } else {
        setError(payload?.error ?? "ვერ შევინახეთ — სცადე თავიდან.");
      }
    } catch {
      setError("ქსელის შეცდომა — სცადე თავიდან.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-line bg-surface-soft p-5">
        <p className="text-base font-semibold text-ink">მადლობა შეფასებისთვის 🙏</p>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {done === "pending"
            ? "შენი კომენტარი გადამოწმების შემდეგ გამოჩნდება."
            : "შენი კომენტარი უკვე გვერდზეა — გვერდის განახლების შემდეგ დაინახავ."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-xl border border-line bg-surface p-5">
      <div>
        <p className="text-sm font-semibold text-ink">როგორ შეაფასებდი ფასმეტრს?</p>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setRating(step)}
              onMouseEnter={() => setHovered(step)}
              onFocus={() => setHovered(step)}
              onBlur={() => setHovered(0)}
              aria-label={`${step} ვარსკვლავი — ${RATING_LABELS[step - 1]}`}
              aria-pressed={rating === step}
              className="rounded-sm p-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Star
                aria-hidden
                className={`size-7 transition-colors ${
                  step <= shown ? "fill-star text-star" : "fill-subtle text-subtle"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink-soft">{shown ? RATING_LABELS[shown - 1] : ""}</span>
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="review-body" className="text-sm font-semibold text-ink">
          კომენტარი
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={5}
          required
          value={body}
          maxLength={REVIEW_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          placeholder="რა მოგეწონა და რა უნდა გავაუმჯობესოთ? ბმულების დამატება არ შეიძლება."
          className="w-full rounded-md border border-line-strong px-3 py-2 text-sm leading-6 outline-none focus:border-accent"
        />
        <p className="text-right text-xs text-muted">{remaining}</p>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="review-name" className="text-sm font-semibold text-ink">
          სახელი <span className="font-normal text-muted">— სურვილისამებრ</span>
        </label>
        <input
          id="review-name"
          name="authorName"
          type="text"
          maxLength={REVIEW_NAME_MAX}
          autoComplete="nickname"
          placeholder="ანონიმური"
          className="h-10 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-accent"
        />
      </div>

      {/* Honeypot. Hidden from people, irresistible to bots — do not remove. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="review-website">Website</label>
        <input id="review-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-md bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-60"
        >
          {busy ? "იგზავნება…" : "გამოქვეყნება"}
        </button>
        <p className="text-xs leading-5 text-muted">
          რეგისტრაცია არ სჭირდება. არ ვინახავთ არც ელფოსტას, არც სახელს, თუ თავად არ მიუთითებ.
        </p>
      </div>
    </form>
  );
}
