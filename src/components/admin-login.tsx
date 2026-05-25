"use client";

import { FormEvent, useState } from "react";

export function AdminLogin() {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (response.ok) location.reload();
    else setError("პაროლი არასწორია ან ADMIN_PASSWORD არ არის მითითებული.");
  }
  return <form onSubmit={submit} className="mx-auto grid max-w-md gap-3 rounded-lg border bg-white p-6"><h1 className="text-2xl font-black">ადმინ შესვლა</h1><input name="password" type="password" required placeholder="პაროლი" className="h-11 rounded-md border px-3" /><button className="h-11 rounded-md bg-[#11212a] font-bold text-white">შესვლა</button>{error ? <p className="text-sm text-[#ff6800]">{error}</p> : null}</form>;
}
