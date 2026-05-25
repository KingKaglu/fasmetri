"use client";

import { FormEvent, useState } from "react";
import { CategoryView, ProductView, ShopView } from "@/lib/catalog-types";

function Status({ text }: { text: string }) {
  return text ? <p className="text-xs font-bold text-[#05594c]">{text}</p> : null;
}

export function ShopEditor({ shop }: { shop: ShopView }) {
  const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        baseUrl: form.get("baseUrl"),
        reliabilityLabel: form.get("reliabilityLabel"),
      }),
    });
    setStatus(response.ok ? "მაღაზიის მონაცემი განახლდა." : "შენახვა ვერ შესრულდა.");
  }

  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer font-bold">ინფორმაციის რედაქტირება</summary>
      <form onSubmit={submit} className="mt-3 grid gap-2 md:grid-cols-3">
        <input name="name" defaultValue={shop.name} className="h-10 rounded-md border px-3" />
        <input name="baseUrl" type="url" defaultValue={shop.baseUrl} className="h-10 rounded-md border px-3" />
        <input name="reliabilityLabel" defaultValue={shop.reliabilityLabel ?? ""} placeholder="სტატუსი" className="h-10 rounded-md border px-3" />
        <button className="h-10 rounded-md bg-[#11212a] px-3 font-bold text-white md:w-fit">შენახვა</button>
        <Status text={status} />
      </form>
    </details>
  );
}

export function ProductEditor({ product, categories }: { product: ProductView; categories: CategoryView[] }) {
  const [status, setStatus] = useState("");
  const suggestedCategory = categories.find((category) => category.slug === product.categorySuggestedSlug);

  async function updateProduct(body: Record<string, unknown>, success: string) {
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setStatus(response.ok ? success : "პროდუქტი ვერ შეინახა.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateProduct({
      name: form.get("name"),
      brand: form.get("brand") || null,
      model: form.get("model") || null,
      categoryId: form.get("categoryId") || null,
      categoryLocked: form.get("categoryLocked") === "on",
      matchingLocked: form.get("matchingLocked") === "on",
    }, "პროდუქტი განახლდა.");
  }

  async function discoverOffers() {
    const response = await fetch(`/api/admin/products/${product.id}/discover`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    const result = payload?.result;
    setStatus(response.ok ? `ნაპოვნია ${result?.attached ?? 0} დადასტურებული და ${result?.possible ?? 0} review კანდიდატი.` : "სხვა მაღაზიების შემოწმება ვერ შესრულდა.");
  }

  return (
    <details className="mt-3 rounded-md border p-3">
      <summary className="cursor-pointer font-bold">პროდუქტის რედაქტირება</summary>
      <form onSubmit={submit} className="mt-3 grid gap-2 md:grid-cols-2">
        <input name="name" defaultValue={product.name} className="h-10 rounded-md border px-3" />
        <select name="categoryId" defaultValue={product.category?.id} className="h-10 rounded-md border px-3">
          <option value="">კატეგორიის გარეშე</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.nameKa}</option>)}
        </select>
        <input name="brand" defaultValue={product.brand ?? ""} placeholder="ბრენდი" className="h-10 rounded-md border px-3" />
        <input name="model" defaultValue={product.model ?? ""} placeholder="მოდელი" className="h-10 rounded-md border px-3" />
        <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold">
          <input name="categoryLocked" type="checkbox" defaultChecked={product.categoryLocked || Boolean(product.manualCategoryId)} />
          კატეგორიის ჩაკეტვა
        </label>
        <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold">
          <input name="matchingLocked" type="checkbox" defaultChecked={product.matchingLocked} />
          matching-ის ჩაკეტვა
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="h-10 rounded-md bg-[#11212a] px-3 font-bold text-white">შენახვა</button>
          <button type="button" onClick={discoverOffers} className="h-10 rounded-md border px-3 font-bold text-[#05594c]">სხვა მაღაზიებში მოძებნა</button>
          {suggestedCategory ? (
            <button
              type="button"
              onClick={() => updateProduct({ categoryId: suggestedCategory.id, categoryLocked: true }, "შემოთავაზებული კატეგორია დადასტურდა.")}
              className="h-10 rounded-md border px-3 font-bold text-[#05594c]"
            >
              შემოთავაზების დამტკიცება
            </button>
          ) : null}
        </div>
        <div className="md:col-span-2">
          {product.categoryConfidence != null ? <p className="text-xs font-bold text-[#53656e]">Confidence: {product.categoryConfidence}% · შემოთავაზება: {suggestedCategory?.nameKa ?? product.categorySuggestedSlug ?? "არ არის"}</p> : null}
          {product.categoryReason ? <p className="text-xs leading-5 text-[#53656e]">{product.categoryReason}</p> : null}
          <Status text={status} />
        </div>
      </form>
    </details>
  );
}

export function CategoryEditor({ categories }: { categories: CategoryView[] }) {
  const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/categories/${form.get("id")}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nameKa: form.get("nameKa"), nameEn: form.get("nameEn") || null }),
    });
    setStatus(response.ok ? "კატეგორია განახლდა." : "კატეგორია ვერ შეინახა.");
  }

  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer text-lg font-black">კატეგორიის რედაქტირება</summary>
      <form onSubmit={submit} className="mt-3 grid gap-2">
        <select name="id" required className="h-11 rounded-md border px-3">{categories.map((category) => <option key={category.id} value={category.id}>{category.nameKa}</option>)}</select>
        <input name="nameKa" required placeholder="ქართული სახელი" className="h-11 rounded-md border px-3" />
        <input name="nameEn" placeholder="English name" className="h-11 rounded-md border px-3" />
        <button className="h-11 rounded-md bg-[#087d6b] font-bold text-white">შენახვა</button>
        <Status text={status} />
      </form>
    </details>
  );
}
