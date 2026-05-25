"use client";

import { BellRing } from "lucide-react";
import { FormEvent, useState } from "react";

export function AlertForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, email: form.get("email"), targetPrice: form.get("targetPrice") }) });
    setMessage(response.ok ? "შეტყობინება მომზადდა." : "შეამოწმე ელფოსტა და სამიზნე ფასი.");
  }

  return (
    <form onSubmit={submit} className="surface-shadow grid gap-3 rounded-lg border bg-white p-4">
      <h2 className="flex items-center gap-2 text-lg font-black"><BellRing className="size-5 text-[#0054d2]" /> ფასის შეტყობინება</h2>
      <input name="email" type="email" required placeholder="ელფოსტა" className="h-11 rounded-md border bg-[#f8fafc] px-3" />
      <input name="targetPrice" type="number" min="1" step="0.01" required placeholder="სამიზნე ფასი ₾" className="h-11 rounded-md border bg-[#f8fafc] px-3" />
      <button className="h-11 rounded-md bg-[#12203a] font-black text-white hover:bg-[#0054d2]">დაყენება</button>
      {message ? <p className="text-sm font-bold text-[#003f9f]">{message}</p> : null}
    </form>
  );
}
