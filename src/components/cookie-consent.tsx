"use client";

import Link from "next/link";
import { useConsent, writeConsent } from "@/lib/consent";

// Rendered inside the layout's `.bottom-stack`, which owns the fixed position
// and the clearance above the mobile bottom nav. Sharing that stack with the
// compare tray is what keeps the two from rendering on top of each other.
export function CookieConsent() {
  const consent = useConsent();

  // `undefined` is "not read yet" — rendering nothing then keeps the server
  // and client markup identical. A stored choice hides the banner for good.
  if (consent !== null) return null;

  return (
    <div
      className="mx-auto w-full max-w-3xl"
      data-consent-banner=""
      role="dialog"
      aria-modal="false"
      aria-label="ანალიტიკის თანხმობა"
    >
      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--line-strong)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm leading-6 text-[var(--muted-strong)]">
          ვიყენებთ ანონიმურ ანალიტიკას, რომ გავიგოთ რომელი შედარებები გჭირდებათ.
          შენი თანხმობის გარეშე არაფერს ვრთავთ.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--brand)]">
            კონფიდენციალურობა
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            data-consent-decline=""
            onClick={() => writeConsent("denied")}
            className="h-10 rounded-[var(--radius-control)] border border-[var(--line-strong)] px-4 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--surface-mute)]"
          >
            უარი
          </button>
          <button
            type="button"
            data-consent-accept=""
            onClick={() => writeConsent("granted")}
            className="h-10 rounded-[var(--radius-control)] bg-[var(--brand)] px-4 text-sm font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]"
          >
            თანხმობა
          </button>
        </div>
      </div>
    </div>
  );
}
