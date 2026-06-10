"use client";

import { BellRing } from "lucide-react";
import { FormEvent, useState } from "react";

export function AlertForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");
  const [unsubscribeHref, setUnsubscribeHref] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const targetPrice = String(form.get("targetPrice") ?? "").trim();
    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, email, targetPrice }),
    });
    if (response.ok) {
      const payload = await response.json().catch(() => null);
      setUnsubscribeHref(payload?.alert?.unsubscribeUrl ?? "");
      setMessage("შეტყობინება მომზადდა.");
    } else {
      setUnsubscribeHref("");
      setMessage("შეამოწმე ელფოსტა და სამიზნე ფასი.");
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <BellRing className="size-4 text-green-600" /> ფასის შეტყობინება
      </h2>
      <input
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        placeholder="ელფოსტა"
        className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
      />
      <input
        name="targetPrice"
        type="number"
        min="1"
        step="0.01"
        required
        inputMode="decimal"
        placeholder="სამიზნე ფასი ₾"
        className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
      />
      <button className="h-10 rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-black">
        დაყენება
      </button>
      <p className="text-[11px] leading-5 text-gray-500">
        ელფოსტა გამოიყენება მხოლოდ ფასის შეტყობინებისთვის.
        {unsubscribeHref ? (
          <>
            {" "}
            <a href={unsubscribeHref} className="text-gray-700 underline underline-offset-2">
              გაუქმების ბმული
            </a>
          </>
        ) : null}
      </p>
      {message ? <p className="text-xs font-medium text-green-700">{message}</p> : null}
    </form>
  );
}
