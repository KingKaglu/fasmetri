"use client";

import Link from "next/link";
import { useConsent, writeConsent } from "@/lib/consent";

// Sits above the mobile bottom nav using the same clearance constant as the
// compare tray, so the two never stack on top of the navigation.
export function CookieConsent() {
  const consent = useConsent();

  // `undefined` is "not read yet" — rendering nothing then keeps the server
  // and client markup identical. A stored choice hides the banner for good.
  if (consent !== null) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[8.5rem] sm:px-4 sm:pb-4"
      data-consent-banner=""
      role="dialog"
      aria-modal="false"
      aria-label="ანალიტიკის თანხმობა"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 border border-[var(--rule,#e2e8f0)] bg-[var(--surface,#ffffff)] p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm leading-6 text-[var(--ink-soft,#475569)]">
          ვიყენებთ ანონიმურ ანალიტიკას, რომ გავიგოთ რომელი შედარებები გჭირდებათ.
          შენი თანხმობის გარეშე არაფერს ვრთავთ.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--ink,#0a0a0a)]">
            კონფიდენციალურობა
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            data-consent-decline=""
            onClick={() => writeConsent("denied")}
            className="h-10 border border-[var(--rule,#e2e8f0)] px-4 text-sm font-semibold text-[var(--ink,#0a0a0a)] hover:bg-[var(--surface-mute,#f1f5f9)]"
          >
            უარი
          </button>
          <button
            type="button"
            data-consent-accept=""
            onClick={() => writeConsent("granted")}
            className="h-10 bg-[var(--ink-surface,#0f172a)] px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            თანხმობა
          </button>
        </div>
      </div>
    </div>
  );
}
