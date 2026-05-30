// Lightweight, provider-agnostic analytics for Fasmetri.
//
// Fans a single trackEvent() out to Google Analytics 4, Meta Pixel and TikTok
// Pixel — but only to whichever ones are actually configured. Every call is
// wrapped so analytics can never break the page or an outbound shop link.
//
// IDs come from public env vars (Next.js inlines NEXT_PUBLIC_* at build time):
//   NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_TIKTOK_PIXEL_ID
// If an ID is missing, that provider is simply skipped and nothing logs.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "";

export const analyticsEnabled = Boolean(GA_ID || META_PIXEL_ID || TIKTOK_PIXEL_ID);

export type AnalyticsEvent =
  | "product_view"
  | "shop_click"
  | "search"
  | "category_view"
  | "filter_used";

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type AnyWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track?: (event: string, params?: AnalyticsParams) => void };
};

// Meta and TikTok have their own canonical event names; map ours where it helps,
// otherwise send the raw event name as a custom event.
const META_EVENTS: Partial<Record<AnalyticsEvent, string>> = {
  product_view: "ViewContent",
  search: "Search",
};
const TIKTOK_EVENTS: Partial<Record<AnalyticsEvent, string>> = {
  product_view: "ViewContent",
  search: "Search",
  shop_click: "ClickButton",
};

function cleanParams(params: AnalyticsParams): AnalyticsParams {
  const out: AnalyticsParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Send an analytics event to every configured provider. Safe to call anywhere
 * on the client; on the server or before any provider has loaded it is a no-op.
 */
export function trackEvent(event: AnalyticsEvent, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;
  const w = window as AnyWindow;
  const data = cleanParams(params);

  try {
    w.gtag?.("event", event, data);
  } catch {
    /* ignore analytics errors */
  }
  try {
    w.fbq?.("trackCustom", META_EVENTS[event] ?? event, data);
  } catch {
    /* ignore analytics errors */
  }
  try {
    w.ttq?.track?.(TIKTOK_EVENTS[event] ?? event, data);
  } catch {
    /* ignore analytics errors */
  }
}
