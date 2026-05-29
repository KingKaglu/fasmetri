"use client";

import { BellRing } from "lucide-react";
import { FormEvent, useState } from "react";

export function AlertForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, email: form.get("email"), targetPrice: form.get("targetPrice") }),
    });
    setMessage(response.ok ? "შეტყობინება მომზადდა." : "შეამოწმე ელფოსტა და სამიზნე ფასი.");
  }

  return (
    <form onSubmit={submit} className="surface-flat grid gap-2.5 p-3.5">
      <h2 className="flex items-center gap-2 text-sm font-black text-[#0f172a]">
        <BellRing className="size-4 text-[#65a30d]" /> ფასის შეტყობინება
      </h2>
      <input
        name="email"
        type="email"
        required
        placeholder="ელფოსტა"
        className="h-10 rounded-md border border-[#e2e8f0] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none focus:border-[#0f172a]"
      />
      <input
        name="targetPrice"
        type="number"
        min="1"
        step="0.01"
        required
        placeholder="სამიზნე ფასი ₾"
        className="h-10 rounded-md border border-[#e2e8f0] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none focus:border-[#0f172a]"
      />
      <button className="h-10 rounded-md bg-[#0f172a] text-sm font-black text-white hover:bg-black">
        დაყენება
      </button>
      {message ? <p className="text-xs font-bold text-[#65a30d]">{message}</p> : null}
    </form>
  );
}
