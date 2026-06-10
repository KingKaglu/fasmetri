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
    <form onSubmit={submit} className="mx-auto mt-6 grid max-w-md gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        ელფოსტა
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm normal-case tracking-normal text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
          placeholder="name@email.ge"
        />
      </label>
      <button disabled={pending} className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-60">
        {pending ? "მუშავდება..." : "შეტყობინების გაუქმება"}
      </button>
      {message ? <p className="text-xs font-medium text-gray-600">{message}</p> : null}
    </form>
  );
}
