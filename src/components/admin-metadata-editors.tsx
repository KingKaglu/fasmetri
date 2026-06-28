"use client";

import { FormEvent, useState } from "react";
import { CategoryView, ProductView, ShopView } from "@/lib/catalog-types";

const inputClassName =
  "h-11 w-full rounded-2xl border border-[#e4e4e7] bg-white px-3 text-sm font-bold text-[var(--brand)] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[rgba(16,191,208,0.18)]";
const buttonClassName =
  "inline-flex h-11 items-center justify-center rounded-2xl bg-[#0a0a0a] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(10,10,10,0.14)] hover:bg-black";
const outlineButtonClassName =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-[#e4e4e7] bg-white px-4 text-sm font-black text-[var(--brand)] hover:border-[#0a0a0a]";

function Status({ text }: { text: string }) {
  return text ? <p className="rounded-xl border border-[#ededee] bg-[#fafafa] px-3 py-2 text-xs font-bold text-[var(--muted-strong)]">{text}</p> : null;
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
    <details className="group rounded-[1rem] border border-[#ededee] bg-[#fafafa] p-3">
      <summary className="cursor-pointer list-none text-sm font-black text-[var(--brand)] marker:hidden">
        ინფორმაციის რედაქტირება
      </summary>
      <form onSubmit={submit} className="mt-3 grid gap-2 md:grid-cols-3">
        <input name="name" defaultValue={shop.name} className={inputClassName} />
        <input name="baseUrl" type="url" defaultValue={shop.baseUrl} className={inputClassName} />
        <input name="reliabilityLabel" defaultValue={shop.reliabilityLabel ?? ""} placeholder="სტატუსი" className={inputClassName} />
        <button className={`${buttonClassName} md:w-fit`}>შენახვა</button>
        <div className="md:col-span-2">
          <Status text={status} />
        </div>
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
    await updateProduct(
      {
        name: form.get("name"),
        brand: form.get("brand") || null,
        model: form.get("model") || null,
        categoryId: form.get("categoryId") || null,
        categoryLocked: form.get("categoryLocked") === "on",
        matchingLocked: form.get("matchingLocked") === "on",
      },
      "პროდუქტი განახლდა.",
    );
  }

  async function discoverOffers() {
    const response = await fetch(`/api/admin/products/${product.id}/discover`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    const result = payload?.result;
    setStatus(
      response.ok
        ? `ნაპოვნია ${result?.attached ?? 0} დადასტურებული და ${result?.possible ?? 0} review კანდიდატი.`
        : "სხვა მაღაზიების შემოწმება ვერ შესრულდა.",
    );
  }

  return (
    <details className="mt-3 rounded-[1rem] border border-[#ededee] bg-[#fafafa] p-3">
      <summary className="cursor-pointer list-none text-sm font-black text-[var(--brand)] marker:hidden">
        პროდუქტის რედაქტირება
      </summary>
      <form onSubmit={submit} className="mt-3 grid gap-2 md:grid-cols-2">
        <input name="name" defaultValue={product.name} className={inputClassName} />
        <select name="categoryId" defaultValue={product.category?.id} className={inputClassName}>
          <option value="">კატეგორიის გარეშე</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameKa}
            </option>
          ))}
        </select>
        <input name="brand" defaultValue={product.brand ?? ""} placeholder="ბრენდი" className={inputClassName} />
        <input name="model" defaultValue={product.model ?? ""} placeholder="მოდელი" className={inputClassName} />
        <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-sm font-black text-[var(--brand)]">
          <input name="categoryLocked" type="checkbox" defaultChecked={product.categoryLocked || Boolean(product.manualCategoryId)} className="accent-[var(--accent-strong)]" />
          კატეგორიის ჩაკეტვა
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#e4e4e7] bg-white px-3 text-sm font-black text-[var(--brand)]">
          <input name="matchingLocked" type="checkbox" defaultChecked={product.matchingLocked} className="accent-[var(--accent-strong)]" />
          matching-ის ჩაკეტვა
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className={buttonClassName}>შენახვა</button>
          <button type="button" onClick={discoverOffers} className={outlineButtonClassName}>
            სხვა მაღაზიებში მოძებნა
          </button>
          {suggestedCategory ? (
            <button
              type="button"
              onClick={() => updateProduct({ categoryId: suggestedCategory.id, categoryLocked: true }, "შემოთავაზებული კატეგორია დადასტურდა.")}
              className={outlineButtonClassName}
            >
              შემოთავაზების დამტკიცება
            </button>
          ) : null}
        </div>
        <div className="grid gap-2 md:col-span-2">
          {product.categoryConfidence != null ? (
            <p className="text-xs font-bold text-[var(--muted)]">
              Confidence: {product.categoryConfidence}% - შემოთავაზება: {suggestedCategory?.nameKa ?? product.categorySuggestedSlug ?? "არ არის"}
            </p>
          ) : null}
          {product.categoryReason ? <p className="text-xs leading-5 text-[var(--muted)]">{product.categoryReason}</p> : null}
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
    <details className="rounded-[1.15rem] border border-[#e4e4e7] bg-white/92 p-4 shadow-[0_12px_30px_rgba(10,10,10,0.07)]">
      <summary className="cursor-pointer list-none text-lg font-black text-[var(--brand)] marker:hidden">
        კატეგორიის რედაქტირება
      </summary>
      <form onSubmit={submit} className="mt-3 grid gap-2">
        <select name="id" required className={inputClassName}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameKa}
            </option>
          ))}
        </select>
        <input name="nameKa" required placeholder="ქართული სახელი" className={inputClassName} />
        <input name="nameEn" placeholder="English name" className={inputClassName} />
        <button className={buttonClassName}>შენახვა</button>
        <Status text={status} />
      </form>
    </details>
  );
}
