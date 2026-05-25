"use client";

import { Play, Power } from "lucide-react";
import { useState } from "react";

export function AdminShopActions({ id, enabled, needsConfiguration }: { id: string; enabled: boolean; needsConfiguration: boolean }) {
  const [message, setMessage] = useState("");
  async function toggle() {
    const response = await fetch(`/api/admin/shops/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) });
    setMessage(response.ok ? "მაღაზია განახლდა. გვერდი განაახლე სტატუსისთვის." : "განახლება ვერ შესრულდა.");
  }
  async function scrape() {
    const response = await fetch(`/api/admin/scrape/${id}`, { method: "POST" });
    setMessage(response.ok ? "სკრეპის გაშვება მიღებულია." : "სკრეპის გაშვება ვერ შესრულდა.");
  }
  return <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={toggle} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 font-bold"><Power className="size-4" /> {enabled ? "გამორთვა" : "ჩართვა"}</button><button type="button" disabled={needsConfiguration} onClick={scrape} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#087d6b] px-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9bb3ae]"><Play className="size-4" /> გაშვება</button>{message ? <span className="text-xs text-[#53656e]">{message}</span> : null}</div>;
}
