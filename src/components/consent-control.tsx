"use client";

import { useConsent, writeConsent } from "@/lib/consent";

// Consent has to be as easy to withdraw as it was to give, so the choice made
// in the banner stays changeable here for the life of the browser.
export function ConsentControl() {
  const consent = useConsent();
  if (consent === undefined) return null;

  const label =
    consent === "granted"
      ? "ამჟამად: ანალიტიკა ჩართულია."
      : consent === "denied"
        ? "ამჟამად: ანალიტიკა გამორთულია."
        : "ამჟამად: არჩევანი არ გაგიკეთებია — ანალიტიკა გამორთულია.";

  return (
    <div className="mt-2 flex flex-col gap-2 border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-600">{label}</p>
      <button
        type="button"
        data-consent-toggle=""
        onClick={() => writeConsent(consent === "granted" ? "denied" : "granted")}
        className="h-9 shrink-0 border border-gray-300 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
      >
        {consent === "granted" ? "ანალიტიკის გამორთვა" : "ანალიტიკის ჩართვა"}
      </button>
    </div>
  );
}
