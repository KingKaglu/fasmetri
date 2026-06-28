"use client";

import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type PushState = "idle" | "working" | "enabled" | "denied" | "error";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function AlertForm({
  productId,
  vapidPublicKey,
}: {
  productId: string;
  // Passed from the server (page is ISR) so it works regardless of NEXT_PUBLIC
  // client-bundle inlining; null when push isn't configured.
  vapidPublicKey: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [unsubscribeHref, setUnsubscribeHref] = useState("");
  const [emailUsed, setEmailUsed] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushState, setPushState] = useState<PushState>("idle");

  // Push is a progressive enhancement: only offered when VAPID is configured and
  // the browser supports Service Worker + Push. Checked after mount (no SSR mismatch).
  useEffect(() => {
    setPushSupported(
      Boolean(vapidPublicKey) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    );
  }, [vapidPublicKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim();
    const targetPrice = String(form.get("targetPrice") ?? "").trim();

    setError("");
    setSuccess(false);
    if (!EMAIL_PATTERN.test(email)) {
      setError("შეიყვანე სწორი ელფოსტის მისამართი.");
      return;
    }
    const price = Number(targetPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("სამიზნე ფასი დადებითი რიცხვი უნდა იყოს.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, email, targetPrice }),
      });
      if (response.ok) {
        const payload = await response.json().catch(() => null);
        setUnsubscribeHref(payload?.alert?.unsubscribeUrl ?? "");
        setEmailUsed(email);
        setPushState("idle");
        setSuccess(true);
        formElement.reset();
      } else {
        setUnsubscribeHref("");
        setError("შეტყობინების დაყენება ვერ მოხერხდა — შეამოწმე ელფოსტა და სამიზნე ფასი.");
      }
    } catch {
      setError("ქსელის შეცდომა — სცადე თავიდან.");
    }
    setBusy(false);
  }

  async function enablePush() {
    if (!vapidPublicKey) return;
    setPushState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), email: emailUsed || undefined }),
      });
      setPushState(res.ok ? "enabled" : "error");
    } catch {
      setPushState("error");
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-2.5 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <BellRing className="size-4 text-zinc-900" /> ფასის შეტყობინება
      </h2>
      <input
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        placeholder="ელფოსტა"
        aria-label="ელფოსტა"
        className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
      />
      <input
        name="targetPrice"
        type="number"
        min="1"
        step="0.01"
        required
        inputMode="decimal"
        placeholder="სამიზნე ფასი ₾"
        aria-label="სამიზნე ფასი ლარში"
        className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
      />
      <button
        disabled={busy}
        className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        დაყენება
      </button>
      <p className="text-[11px] leading-5 text-gray-500">
        ელფოსტა გამოიყენება მხოლოდ ფასის შეტყობინებისთვის.
        {unsubscribeHref ? (
          <>
            {" "}
            <a href={unsubscribeHref} className="text-gray-700 underline underline-offset-2">
              გაუქმების ბმული
            </a>
          </>
        ) : null}
      </p>
      {success ? (
        <p role="status" className="flex items-start gap-1.5 rounded-md border border-zinc-900 bg-zinc-950 px-3 py-2 text-xs font-medium text-white">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          შეტყობინება დაყენებულია — ფასის დაკლებისას ელფოსტაზე მოგწერთ.
        </p>
      ) : null}
      {success && pushSupported && pushState !== "enabled" ? (
        <button
          type="button"
          onClick={enablePush}
          disabled={pushState === "working"}
          className="flex h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold disabled:cursor-wait disabled:opacity-60"
          style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-soft)" }}
        >
          {pushState === "working" ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
          ჩართე ბრაუზერის შეტყობინებები
        </button>
      ) : null}
      {pushState === "enabled" ? (
        <p role="status" className="rounded-md border border-zinc-900 bg-zinc-950 px-3 py-2 text-xs font-medium text-white">
          ბრაუზერის შეტყობინებები ჩართულია.
        </p>
      ) : null}
      {pushState === "denied" ? (
        <p className="text-[11px] leading-5 text-gray-500">შეტყობინებები დაბლოკილია ბრაუზერში — ჩართე პარამეტრებიდან.</p>
      ) : null}
      {pushState === "error" ? (
        <p className="text-[11px] leading-5 text-gray-500">შეტყობინების ჩართვა ვერ მოხერხდა — სცადე თავიდან.</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900">
          {error}
        </p>
      ) : null}
    </form>
  );
}
