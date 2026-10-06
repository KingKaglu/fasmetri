"use client";

import { FormEvent, useState } from "react";

export function AlertUnsubscribeForm({ alertId }: { alertId: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/alerts/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alertId, email }),
    });
    setPending(false);
    setMessage(response.ok ? "ფასის შეტყობინება გაუქმდა." : "აქტიური შეტყობინება ამ ელფოსტით ვერ მოიძებნა.");
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 grid max-w-md gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5">
      <label className="grid gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">
        ელფოსტა
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm normal-case tracking-normal text-ink outline-none placeholder:text-muted focus:border-line-strong"
          placeholder="name@email.ge"
        />
      </label>
      <button disabled={pending} className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-60">
        {pending ? "მუშავდება..." : "შეტყობინების გაუქმება"}
      </button>
      {message ? <p className="text-xs font-medium text-ink-soft">{message}</p> : null}
    </form>
  );
}
