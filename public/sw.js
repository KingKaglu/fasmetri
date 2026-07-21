/*
 * Fasmetri service worker — v6, network passthrough.
 *
 * WHY THIS EXISTS NOW: earlier versions cache-first'd /_next/static and
 * network-first'd HTML. In practice that left some phones (seen on Galaxy S24)
 * pinned to STALE HTML/CSS after a deploy — the page rendered an old product
 * name and the pre-fix layout even after the user cleared the browser cache,
 * because a service worker and its Cache Storage survive a cache clear.
 *
 * v6 removes ALL fetch interception: every request goes straight to the
 * network, so a deploy is reflected immediately and the SW can never serve a
 * stale asset. On activate it deletes every old cache and reloads open tabs so
 * already-poisoned clients recover on the spot. Web Push (price alerts) is kept.
 *
 * Trade-off: no offline app-shell / precache. Freshness of prices + layout is
 * the priority; the site is online-first anyway.
 */

const CACHE = "fasmetri-v6";

self.addEventListener("install", () => {
  // Take over immediately instead of waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge every cache left by any previous SW version (v4/v5 app-shell,
      // static assets, precached "/"). This is what drops the stale HTML/CSS.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (err) {
        // Ignore cleanup failures.
      }
      await self.clients.claim();
      // Reload any open tab so it re-fetches fresh, un-intercepted content
      // right away instead of waiting for the next manual navigation.
      try {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          if ("navigate" in client) client.navigate(client.url).catch(() => {});
        }
      } catch (err) {
        // Ignore — reload is best-effort.
      }
    })()
  );
});

// NO fetch handler on purpose: the browser performs its normal network fetch
// for every request, so nothing is ever served from a stale cache.

// --- Web Push (price alerts) ---
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = {};
  }
  const title = payload.title || "ფასმეტრი";
  const body = payload.body || "ფასი განახლდა";
  const url = payload.url || "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === target || client.url === target) {
            return client.focus();
          }
        } catch (err) {
          // ignore malformed client URLs
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
