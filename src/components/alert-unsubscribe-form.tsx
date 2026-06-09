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
    <form onSubmit={submit} className="surface-flat mx-auto mt-6 grid max-w-md gap-3 p-4 sm:p-5">
      <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--muted)]">
        ელფოსტა
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold normal-case tracking-normal text-[var(--brand)] outline-none focus:border-[var(--brand)]"
          placeholder="name@email.ge"
        />
      </label>
      <button disabled={pending} className="h-11 rounded-xl bg-[var(--brand)] px-4 text-sm font-black text-white disabled:opacity-60">
        {pending ? "მუშავდება..." : "შეტყობინების გაუქმება"}
      </button>
      {message ? <p className="text-xs font-bold text-[var(--muted-strong)]">{message}</p> : null}
    </form>
  );
}
