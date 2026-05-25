"use client";

import { useState } from "react";

export function MatchCandidateActions({ id }: { id: string }) {
  const [status, setStatus] = useState("");

  async function review(action: "confirm" | "reject" | "lock") {
    const response = await fetch(`/api/admin/matching/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setStatus(response.ok ? action === "confirm" ? "შეთავაზება მიება პროდუქტს." : action === "lock" ? "გადაწყვეტილება უარყოფილი და დაბლოკილია." : "კანდიდატი უარყოფილია." : "review ვერ შესრულდა.");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => review("confirm")} className="h-10 rounded-md bg-[#087d6b] px-3 font-bold text-white">იგივე პროდუქტია</button>
      <button type="button" onClick={() => review("reject")} className="h-10 rounded-md border px-3 font-bold text-[#9b1c1c]">უარყოფა</button>
      <button type="button" onClick={() => review("lock")} className="h-10 rounded-md border px-3 font-bold text-[#64748b]">უარყოფა და ჩაკეტვა</button>
      {status ? <span className="text-xs font-bold text-[#64748b]">{status}</span> : null}
    </div>
  );
}
