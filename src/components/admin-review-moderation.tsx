"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, MessageSquareReply, Trash2 } from "lucide-react";

const BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e4e4e7] bg-white px-3 text-xs font-black text-[var(--brand)] hover:border-[#0a0a0a] disabled:cursor-wait disabled:opacity-60";

/**
 * Hide / show / reply / delete for one visitor review. Hiding is reversible and
 * is the action to reach for first; delete is deliberately behind a confirm.
 */
export function AdminReviewModeration({
  id,
  hidden,
  reply,
}: {
  id: string;
  hidden: boolean;
  reply: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(reply ?? "");

  async function send(init: RequestInit) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/site-reviews/${id}`, init);
      if (response.ok) {
        setReplyOpen(false);
        router.refresh();
      } else {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "ოპერაცია ვერ შესრულდა.");
      }
    } catch {
      setError("ქსელის შეცდომა.");
    }
    setBusy(false);
  }

  const patch = (payload: unknown) =>
    send({ method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} className={BUTTON} onClick={() => patch({ action: hidden ? "show" : "hide" })}>
          {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {hidden ? "გამოჩენა" : "დამალვა"}
        </button>

        <button type="button" disabled={busy} className={BUTTON} onClick={() => setReplyOpen((open) => !open)}>
          <MessageSquareReply className="size-3.5" />
          {reply ? "პასუხის შეცვლა" : "პასუხი"}
        </button>

        <button
          type="button"
          disabled={busy}
          className={`${BUTTON} text-[#d9412f] hover:border-[#d9412f]`}
          onClick={() => {
            if (window.confirm("წავშალოთ ეს კომენტარი სამუდამოდ? დამალვა შექცევადია, წაშლა — არა.")) {
              void send({ method: "DELETE" });
            }
          }}
        >
          <Trash2 className="size-3.5" />
          წაშლა
        </button>
      </div>

      {replyOpen ? (
        <div className="grid gap-2">
          <textarea
            rows={3}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder="საჯარო პასუხი — გამოჩნდება კომენტარის ქვეშ."
            className="w-full rounded-xl border border-[#e4e4e7] px-3 py-2 text-sm outline-none focus:border-[#0a0a0a]"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className={BUTTON} onClick={() => patch({ action: "reply", reply: replyText.trim() })}>
              შენახვა
            </button>
            {reply ? (
              <button type="button" disabled={busy} className={BUTTON} onClick={() => { setReplyText(""); void patch({ action: "reply", reply: "" }); }}>
                პასუხის წაშლა
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs font-bold text-[#d9412f]">{error}</p> : null}
    </div>
  );
}
