"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export function AdminLogin() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.ok) location.reload();
    else {
      setError("áƒžáƒáƒ áƒáƒšáƒ˜ áƒáƒ áƒáƒ¡áƒ¬áƒáƒ áƒ˜áƒ áƒáƒœ ADMIN_PASSWORD áƒáƒ  áƒáƒ áƒ˜áƒ¡ áƒ›áƒ˜áƒ—áƒ˜áƒ—áƒ”áƒ‘áƒ£áƒšáƒ˜.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="relative w-full max-w-md overflow-hidden rounded-[1.45rem] border border-[#e4e4e7] bg-white p-5 shadow-[0_24px_70px_rgba(10,10,10,0.16)]"
    >
      <div className="absolute inset-x-0 top-0 h-28 bg-[#0a0a0a]" />
      <div className="relative">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_12px_26px_rgba(127,194,29,0.25)]">
          <ShieldCheck className="size-5" />
        </span>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">admin access</p>
        <h1 className="mt-1 text-3xl font-black text-white">áƒáƒ“áƒ›áƒ˜áƒœ áƒ¨áƒ”áƒ¡áƒ•áƒšáƒ</h1>
      </div>

      <div className="relative mt-8 grid gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-black uppercase text-[var(--muted)]">áƒžáƒáƒ áƒáƒšáƒ˜</span>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              name="password"
              type="password"
              required
              placeholder="áƒ¨áƒ”áƒ˜áƒ§áƒ•áƒáƒœáƒ” áƒžáƒáƒ áƒáƒšáƒ˜"
              className="h-12 w-full rounded-2xl border border-[#e4e4e7] bg-[#fafafa] pl-10 pr-3 text-sm font-black text-[var(--brand)] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[rgba(16,191,208,0.2)]"
            />
          </span>
        </label>
        <button
          disabled={loading}
          className="h-12 rounded-2xl bg-[#0a0a0a] text-sm font-black text-white shadow-[0_14px_28px_rgba(10,10,10,0.18)] hover:bg-black disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "áƒ›áƒáƒ¬áƒ›áƒ“áƒ”áƒ‘áƒ..." : "áƒ¨áƒ”áƒ¡áƒ•áƒšáƒ"}
        </button>
        {error ? <p className="rounded-xl border border-[#d4d4d8] bg-[#f4f4f5] px-3 py-2 text-sm font-bold text-[var(--danger)]">{error}</p> : null}
      </div>
    </form>
  );
}
