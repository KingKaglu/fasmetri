"use client";

import { useEffect, useState } from "react";

/**
 * Analytics consent. Georgia's Law on Personal Data Protection (in force since
 * 1 March 2024) requires PRIOR consent for non-essential cookies, and treats
 * "by continuing you agree" as no consent at all — so nothing that sets an
 * analytics cookie may load before the visitor has actually chosen.
 *
 * The choice lives in localStorage rather than a cookie: it is per-browser,
 * never sent to us, and storing it costs nothing we would have to ask about.
 */

const STORAGE_KEY = "fasmetri:analytics-consent:v1";
const CHANGE_EVENT = "fasmetri:analytics-consent";

export type ConsentState = "granted" | "denied";

export function readConsent(): ConsentState | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    // Private windows and blocked site data both throw. No stored choice means
    // no consent, which is the safe answer.
    return null;
  }
}

export function writeConsent(state: ConsentState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Persisting failed, but the page should still honour the choice for this
    // visit — the event below drives that.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * `undefined` while the answer is still unknown (server render and first
 * paint), so callers can tell "not decided yet" from "decided: no".
 */
export function useConsent(): ConsentState | null | undefined {
  const [consent, setConsent] = useState<ConsentState | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => setConsent(readConsent());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    // Another tab deciding counts as deciding here too.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return consent;
}
