"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { trackEvent, type AnalyticsEvent, type AnalyticsParams } from "@/lib/analytics";

// Fires an analytics event once per distinct `signature` from a server-rendered
// page (product_view, category_view, search...). Renders nothing. Re-firing is
// gated on the signature so client re-renders don't duplicate the event, while a
// new product/category/search query (new signature) fires a fresh event.
export function TrackView({
  event,
  params,
  signature,
}: {
  event: AnalyticsEvent;
  params: AnalyticsParams;
  signature?: string;
}) {
  const sig = signature ?? `${event}:${JSON.stringify(params)}`;
  const last = useRef<string | null>(null);
  // Reads the latest event/params without making them effect dependencies:
  // only a new signature may fire again.
  const fire = useEffectEvent(() => trackEvent(event, params));

  useEffect(() => {
    if (last.current === sig) return;
    last.current = sig;
    fire();
  }, [sig]);

  return null;
}
