"use client";

import { FormEvent, useState } from "react";
import { ProductView } from "@/lib/catalog-types";

const selectClassName =
  "h-11 w-full rounded-2xl border border-[#c8d7bd] bg-white px-3 text-sm font-bold text-[var(--brand)] outline-none focus:border-[#151713] focus:ring-2 focus:ring-[rgba(16,191,208,0.18)]";

export function MergeForm({ products }: { products: ProductView[] }) {
  const [message, setMessage] = useState("");
  async function merge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/products/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceId: form.get("sourceId"), targetId: form.get("targetId") }),
    });
    setMessage(response.ok ? "პროდუქტები გაერთიანდა." : "გაერთიანება ვერ შესრულდა.");
  }

  return (
    <form onSubmit={merge} className="grid gap-3 rounded-[1.15rem] border border-[#c8d7bd] bg-white/92 p-4 shadow-[0_12px_30px_rgba(18,19,15,0.07)]">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">maintenance</p>
        <h2 className="mt-1 text-lg font-black text-[var(--brand)]">დუბლიკატის გაერთიანება</h2>
      </div>
      <select name="sourceId" required className={selectClassName}>
        <option value="">წასაშლელი პროდუქტი</option>
        {products.map((product) => (
          <option key={`source-${product.id}`} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <select name="targetId" required className={selectClassName}>
        <option value="">საბოლოო პროდუქტი</option>
        {products.map((product) => (
          <option key={`target-${product.id}`} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <button className="h-11 rounded-2xl bg-[#151713] text-sm font-black text-white hover:bg-black">გაერთიანება</button>
      {message ? <p className="rounded-xl border border-[#dbe5d3] bg-[#f8fbf4] px-3 py-2 text-xs font-bold text-[var(--muted-strong)]">{message}</p> : null}
    </form>
  );
}
