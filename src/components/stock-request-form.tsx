"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shown on a zero-result search. The visitor has looked for something the
 * catalog does not have — instead of a dead end, take the email and turn the
 * miss into a request we can answer later.
 */
export function StockRequestForm({ query }: { query: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const email = String(new FormData(formElement).get("email") ?? "").trim();

    setError("");
    if (!EMAIL_PATTERN.test(email)) {
      setError("შეიყვანე სწორი ელფოსტის მისამართი.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/stock-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, query }),
      });
      if (response.ok) {
        setDone(true);
        trackEvent("alert_created", { search_term: query, kind: "stock_request" });
        formElement.reset();
      } else {
        setError("ვერ შევინახეთ — სცადე თავიდან.");
      }
    } catch {
      setError("ქსელის შეცდომა — სცადე თავიდან.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <p className="mx-auto mt-5 max-w-md rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        დაფიქსირდა 👍 შევატყობინებთ, როგორც კი „{query}“ გამოჩნდება.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-5 grid max-w-md gap-2 text-left">
      <label htmlFor="stock-request-email" className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-900">
        <BellRing className="size-4 text-[var(--accent)]" /> გჭირდება „{query}“? შეგატყობინებთ
      </label>
      <div className="flex gap-2">
        <input
          id="stock-request-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="შენი ელფოსტა"
          className="h-9 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-9 shrink-0 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {busy ? "იგზავნება…" : "შემატყობინე"}
        </button>
      </div>
      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
