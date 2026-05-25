"use client";

import { FormEvent, useState } from "react";
import { ProductView } from "@/lib/catalog-types";

export function MergeForm({ products }: { products: ProductView[] }) {
  const [message, setMessage] = useState("");
  async function merge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/products/merge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId: form.get("sourceId"), targetId: form.get("targetId") }) });
    setMessage(response.ok ? "პროდუქტები გაერთიანდა." : "გაერთიანება ვერ შესრულდა.");
  }
  return <form onSubmit={merge} className="grid gap-3 rounded-lg border bg-white p-4"><h2 className="text-lg font-black">დუბლიკატის გაერთიანება</h2><select name="sourceId" required className="h-11 rounded-md border px-3"><option value="">წასაშლელი პროდუქტი</option>{products.map((product) => <option key={`source-${product.id}`} value={product.id}>{product.name}</option>)}</select><select name="targetId" required className="h-11 rounded-md border px-3"><option value="">საბოლოო პროდუქტი</option>{products.map((product) => <option key={`target-${product.id}`} value={product.id}>{product.name}</option>)}</select><button className="h-11 rounded-md bg-[#11212a] font-bold text-white">გაერთიანება</button>{message ? <p className="text-sm text-[#53656e]">{message}</p> : null}</form>;
}
