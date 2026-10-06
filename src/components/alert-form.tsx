"use client";

import { BellRing, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type PushState = "idle" | "working" | "enabled" | "pending" | "denied" | "error";

// Mirrors VerificationStatus in src/server/alerts/verification.ts.
type Verification =
  | { status: "verified" }
  | { status: "pending"; emailSent: boolean; retryAfterSeconds?: number; claim?: string; attached?: boolean };
type ResendState = "idle" | "working" | "sent" | "throttled" | "error";

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
  emailDelivery = true,
}: {
  productId: string;
  // Passed from the server (page is ISR) so it works regardless of NEXT_PUBLIC
  // client-bundle inlining; null when push isn't configured.
  vapidPublicKey: string | null;
  // False when no mail transport is configured. The alert is still stored and
  // still fires later, but promising an email we cannot send is worse than
  // saying plainly that it is waiting.
  emailDelivery?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [unsubscribeHref, setUnsubscribeHref] = useState("");
  const [emailUsed, setEmailUsed] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushState, setPushState] = useState<PushState>("idle");
  const [verification, setVerification] = useState<Verification | null>(null);
  const [resendState, setResendState] = useState<ResendState>("idle");

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
        setVerification(payload?.verification ?? null);
        setResendState("idle");
        setEmailUsed(email);
        setPushState("idle");
        setSuccess(true);
        // Fired only after the API confirms the alert — a price alert is the
        // strongest intent signal the site collects, so it is the conversion
        // ad campaigns optimise toward.
        trackEvent("alert_created", { productId, targetPrice: price });
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
        body: JSON.stringify({
          subscription: sub.toJSON(),
          email: emailUsed || undefined,
          claim: verification?.status === "pending" ? verification.claim : undefined,
        }),
      });
      const payload = res.ok ? await res.json().catch(() => null) : null;
      // Pending = the address owner still has to confirm this browser by mail.
      setPushState(!res.ok ? "error" : payload?.verification?.status === "pending" ? "pending" : "enabled");
    } catch {
      setPushState("error");
    }
  }

  async function resend() {
    if (!emailUsed) return;
    setResendState("working");
    try {
      const res = await fetch("/api/alerts/verify/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailUsed }),
      });
      setResendState(res.ok ? "sent" : res.status === 429 ? "throttled" : "error");
    } catch {
      setResendState("error");
    }
  }

  const awaitingConfirmation = success && verification?.status === "pending" ? verification : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-2.5 rounded-lg border border-line bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <BellRing className="size-4 text-accent" /> ფასის შეტყობინება
      </h2>
      <input
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        placeholder="ელფოსტა"
        aria-label="ელფოსტა"
        className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-line-strong"
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
        className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-line-strong"
      />
      <button
        disabled={busy}
        className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-accent text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        დაყენება
      </button>
      <p className="text-[12px] leading-5 text-muted">
        ელფოსტა გამოიყენება მხოლოდ ფასის შეტყობინებისთვის.
        {unsubscribeHref ? (
          <>
            {" "}
            <a href={unsubscribeHref} className="text-ink-soft underline underline-offset-2">
              გაუქმების ბმული
            </a>
          </>
        ) : null}
      </p>
      {awaitingConfirmation ? (
        <div role="status" className="grid gap-1.5 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs font-medium text-ink">
          <p className="flex items-start gap-1.5">
            <MailCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
            {awaitingConfirmation.emailSent
              ? `შეტყობინება შენახულია. დადასტურების ბმული გავუგზავნეთ ${emailUsed}-ს — დაადასტურე და მერე ჩაირთვება.`
              : awaitingConfirmation.retryAfterSeconds
                ? "შეტყობინება შენახულია. დადასტურების წერილი ცოტა ხნის წინ უკვე გამოგიგზავნეთ — შეამოწმე ფოსტა (Spam-იც)."
                : "შეტყობინება შენახულია, მაგრამ დადასტურების წერილი ახლა ვერ გავგზავნეთ — სცადე ცოტა ხანში."}
          </p>
          {resendState === "sent" ? (
            <p className="text-muted">წერილი თავიდან გაიგზავნა.</p>
          ) : resendState === "throttled" ? (
            <p className="text-muted">ცოტა ხანში სცადე — წერილი ახლახან გაიგზავნა.</p>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resendState === "working"}
              className="justify-self-start text-accent underline underline-offset-2 disabled:opacity-60"
            >
              {resendState === "error" ? "ვერ გაიგზავნა — სცადე თავიდან" : "წერილი არ მოვიდა? თავიდან გაგზავნა"}
            </button>
          )}
        </div>
      ) : success ? (
        <p role="status" className="flex items-start gap-1.5 rounded-xl border border-savings/30 bg-savings-soft px-3 py-2 text-xs font-medium text-savings-strong">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          {emailDelivery
            ? "შეტყობინება დაყენებულია — ფასის დაკლებისას ელფოსტაზე მოგწერთ."
            : "შეტყობინება შენახულია — ელფოსტის გაგზავნა ჯერ არ არის ჩართული, ამიტომ ჩართვისთანავე მიიღებ. ახლავე შეტყობინებისთვის ჩართე ბრაუზერის push."}
        </p>
      ) : null}
      {success && pushSupported && pushState !== "enabled" && pushState !== "pending" ? (
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
      {pushState === "pending" ? (
        <p role="status" className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs font-medium text-ink">
          ბრაუზერის შეტყობინებები ჩაირთვება, როგორც კი ელფოსტიდან დაადასტურებ.
        </p>
      ) : null}
      {pushState === "enabled" ? (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          ბრაუზერის შეტყობინებები ჩართულია.
        </p>
      ) : null}
      {pushState === "denied" ? (
        <p className="text-[12px] leading-5 text-muted">შეტყობინებები დაბლოკილია ბრაუზერში — ჩართე პარამეტრებიდან.</p>
      ) : null}
      {pushState === "error" ? (
        <p className="text-[12px] leading-5 text-muted">შეტყობინების ჩართვა ვერ მოხერხდა — სცადე თავიდან.</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
