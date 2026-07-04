"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, MessageSquareText } from "lucide-react";

const reasons = [
  "არასწორი ფასი",
  "პროდუქტის არასწორი დამთხვევა",
  "მაღაზია აკლია",
  "ბიზნეს თანამშრომლობა",
  "ტექნიკური ხარვეზი",
  "სხვა",
] as const;

type FieldErrors = Partial<Record<"name" | "email" | "message" | "productUrl" | "storeUrl", string>>;

export function ContactMailForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = clean(form.get("name"), 80);
    const email = clean(form.get("email"), 254);
    const reason = reasons.includes(String(form.get("reason")) as (typeof reasons)[number]) ? String(form.get("reason")) : "სხვა";
    const productUrl = clean(form.get("productUrl"), 500);
    const storeUrl = clean(form.get("storeUrl"), 500);
    const message = clean(form.get("message"), 1200);

    const nextErrors: FieldErrors = {};
    if (!name) nextErrors.name = "შეიყვანე სახელი.";
    if (!email) nextErrors.email = "შეიყვანე ელფოსტა.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "ელფოსტის ფორმატი არასწორია.";
    if (!message || message.length < 10) nextErrors.message = "დაწერე შეტყობინება (მინიმუმ 10 სიმბოლო).";
    if (productUrl && !isValidHttpUrl(productUrl)) nextErrors.productUrl = "ბმული უნდა იწყებოდეს http(s)-ით.";
    if (storeUrl && !isValidHttpUrl(storeUrl)) nextErrors.storeUrl = "ბმული უნდა იწყებოდეს http(s)-ით.";

    setErrors(nextErrors);
    setSubmitted(false);
    if (Object.keys(nextErrors).length) return;

    const subject = `Fasmetri contact: ${reason}`;
    const body = [
      `სახელი: ${name}`,
      `ელფოსტა: ${email}`,
      `მიზეზი: ${reason}`,
      productUrl ? `პროდუქტის ბმული: ${productUrl}` : null,
      storeUrl ? `მაღაზიის ბმული: ${storeUrl}` : null,
      "",
      message,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
    window.location.href = `mailto:Fasmetri@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
        <span className="grid size-9 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-500">
          <MessageSquareText className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-gray-900">მოგვწერე</h2>
          <p className="text-xs text-gray-500">ფორმა გახსნის შენს ელფოსტის აპს მომზადებული წერილით.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="სახელი" error={errors.name}>
          <input name="name" required maxLength={80} className="contact-control" placeholder="შენი სახელი" aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="ელფოსტა" error={errors.email}>
          <input name="email" required type="email" maxLength={254} autoComplete="email" className="contact-control" placeholder="name@email.ge" aria-invalid={Boolean(errors.email)} />
        </Field>
      </div>
      <Field label="მიზეზი">
        <select name="reason" className="contact-control" defaultValue={reasons[0]}>
          {reasons.map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="პროდუქტის ბმული (არასავალდებულო)" error={errors.productUrl}>
          <input name="productUrl" type="url" maxLength={500} className="contact-control" placeholder="https://fasmetri.vercel.app/products/..." aria-invalid={Boolean(errors.productUrl)} />
        </Field>
        <Field label="მაღაზიის ბმული (არასავალდებულო)" error={errors.storeUrl}>
          <input name="storeUrl" type="url" maxLength={500} className="contact-control" placeholder="https://..." aria-invalid={Boolean(errors.storeUrl)} />
        </Field>
      </div>
      <Field label="შეტყობინება" error={errors.message}>
        <textarea name="message" required minLength={10} maxLength={1200} className="contact-control min-h-32 resize-y py-2" placeholder="დაწერე დეტალები..." aria-invalid={Boolean(errors.message)} />
      </Field>
      <button className="mt-1 h-10 w-full rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] sm:w-auto">
        ელფოსტაში გახსნა
      </button>
      {submitted ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-md border border-zinc-900 bg-zinc-950 px-3 py-2 text-xs font-medium leading-5 text-white">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          წერილი მომზადდა შენს ელფოსტის აპში — გადახედე და გააგზავნე. თუ აპი არ გაიხსნა, მოგვწერე პირდაპირ: Fasmetri@gmail.com
        </p>
      ) : null}
      {!submitted && Object.keys(errors).length > 0 ? (
        <p className="mt-3 text-xs font-medium text-zinc-900">შეასწორე მონიშნული ველები და სცადე თავიდან.</p>
      ) : null}
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
      {label}
      <span className="mt-1 block text-sm font-medium text-gray-900 normal-case tracking-normal">{children}</span>
      {error ? <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-zinc-900">{error}</span> : null}
    </label>
  );
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}
