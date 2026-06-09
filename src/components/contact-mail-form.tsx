"use client";

import { FormEvent, useState } from "react";
import { MessageSquareText } from "lucide-react";

const reasons = ["მაღაზიის დამატება", "ფასის შესწორება", "თანამშრომლობა", "სხვა"];

export function ContactMailForm() {
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = clean(form.get("name"), 80);
    const email = clean(form.get("email"), 254);
    const reason = reasons.includes(String(form.get("reason"))) ? String(form.get("reason")) : "სხვა";
    const message = clean(form.get("message"), 1200);

    if (!name || !email || !message) {
      setError("შეავსე სახელი, ელფოსტა და შეტყობინება.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("შეიყვანე სწორი ელფოსტა.");
      return;
    }

    setError("");
    const subject = `Fasmetri contact: ${reason}`;
    const body = [
      `სახელი: ${name}`,
      `ელფოსტა: ${email}`,
      `მიზეზი: ${reason}`,
      "",
      message,
    ].join("\n");
    window.location.href = `mailto:hello@fasmetri.ge?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={submit} className="surface-flat p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-[#e2e8f0] pb-3">
        <span className="grid size-9 place-items-center rounded-md bg-[#0f172a] text-[#84cc16]">
          <MessageSquareText className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-black text-[#0f172a]">მოგვწერე</h2>
          <p className="text-xs text-[#64748b]">ფორმა გახსნის შენს ელფოსტის აპს მომზადებული წერილით.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="სახელი">
          <input name="name" required maxLength={80} className="contact-control" placeholder="შენი სახელი" />
        </Field>
        <Field label="ელფოსტა">
          <input name="email" required type="email" maxLength={254} autoComplete="email" className="contact-control" placeholder="name@email.ge" />
        </Field>
      </div>
      <Field label="მიზეზი">
        <select name="reason" className="contact-control" defaultValue={reasons[0]}>
          {reasons.map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </Field>
      <Field label="შეტყობინება">
        <textarea name="message" required maxLength={1200} className="contact-control min-h-32 resize-y py-2" placeholder="დაწერე დეტალები..." />
      </Field>
      <button className="mt-1 h-11 w-full rounded-md bg-[#0f172a] px-4 text-sm font-bold text-white hover:bg-black sm:w-auto">
        ელფოსტაში გახსნა
      </button>
      {error ? <p className="mt-3 text-xs font-bold text-[#dc2626]">{error}</p> : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block text-[11px] font-black uppercase tracking-wider text-[#64748b]">
      {label}
      <span className="mt-1 block text-sm font-medium text-[#0f172a] normal-case tracking-normal">{children}</span>
    </label>
  );
}

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}
