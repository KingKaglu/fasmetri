"use client";

import Link from "next/link";
import { useConsent, writeConsent } from "@/lib/consent";

// Rendered inside <BottomStack>, which owns the fixed position and the
// clearance above the mobile bottom nav (and shares it with the compare tray,
// so the two never overlap). Deliberately small: a full-width slim bar resting
// on the bottom nav on phones, a 380px toast in the bottom-right corner from
// md up — it must never cover the search field or the page's main content.
export function CookieConsent() {
  const consent = useConsent();

  // `undefined` is "not read yet" — rendering nothing then keeps the server
  // and client markup identical. A stored choice hides the banner for good.
  if (consent !== null) return null;

  return (
    <div
      className="w-full md:ml-auto md:max-w-[380px]"
      data-consent-banner=""
      role="dialog"
      aria-modal="false"
      aria-label="ანალიტიკის თანხმობა"
    >
      <div className="flex items-center gap-3 border-t border-line-strong bg-surface px-3 py-2 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:rounded-card md:border md:p-3 md:shadow-[var(--shadow-lg)]">
        <p className="min-w-0 flex-1 text-[12px] leading-4 text-ink-soft">
          ანონიმურ ანალიტიკას მხოლოდ შენი თანხმობით ვრთავთ.{" "}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">
            კონფიდენციალურობა
          </Link>
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            data-consent-decline=""
            onClick={() => writeConsent("denied")}
            className="h-8 rounded-control border border-line-strong px-3 text-[12px] font-semibold text-ink hover:bg-surface-mute"
          >
            უარი
          </button>
          <button
            type="button"
            data-consent-accept=""
            onClick={() => writeConsent("granted")}
            className="h-8 rounded-control bg-[var(--brand)] px-3 text-[12px] font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]"
          >
            თანხმობა
          </button>
        </div>
      </div>
    </div>
  );
}
