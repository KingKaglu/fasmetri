/*
 * Fasmetri service worker — conservative, dependency-free.
 *
 * GOAL: installable PWA (offline app-shell) + faster repeat loads WITHOUT ever
 * serving stale prices. Price/alert/dynamic data is never cached: API, admin,
 * and the /out/ redirect always go straight to the network.
 *
 * Caching strategy:
 *   - /_next/static/** and static images/fonts  -> cache-first (content-hashed / stable)
 *   - navigations (HTML pages)                   -> network-first (fresh prices, offline fallback)
 *   - everything else (/api/, /admin/, /out/, …) -> network only, never cached
 *
 * Bump CACHE when this file changes so the old cache is purged on activate.
 */

const CACHE = "fasmetri-v4";

// Content-hashed static asset prefixes + stable static file extensions.
const STATIC_PREFIXES = ["/_next/static/"];
const STATIC_EXTENSIONS = [
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".woff2",
  ".ico",
];

// Routes whose responses must NEVER be cached (dynamic / price / auth data).
const NEVER_CACHE_PREFIXES = ["/api/", "/admin/", "/out/"];

self.addEventListener("install", (event) => {
  // Activate this SW as soon as it finishes installing.
  self.skipWaiting();
  // Best-effort pre-cache of the app shell root. Wrapped so a failure here
  // (offline install, fetch error) can never make install reject.
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await cache.add("/");
      } catch (err) {
        // Ignore — install must always succeed.
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
        );
      } catch (err) {
        // Ignore cleanup failures.
      }
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }
  return STATIC_EXTENSIONS.some((ext) => url.pathname.toLowerCase().endsWith(ext));
}

function isNeverCache(url) {
  return NEVER_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ხაზგარეშე — ფასმეტრი</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;
    min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#15172b;color:#fff;text-align:center;padding:24px;}
  .box{max-width:420px}
  h1{font-size:20px;margin:0 0 8px}
  p{opacity:.8;margin:0;line-height:1.5}
</style>
</head>
<body>
  <div class="box">
    <h1>ხაზგარეშე ხართ</h1>
    <p>ინტერნეტთან კავშირი არ არის. შეამოწმეთ კავშირი და სცადეთ თავიდან.</p>
  </div>
</body>
</html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Cache-first: serve from cache, fall back to network and populate cache.
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
  } catch (err) {
    // Cache read failed — fall through to network.
  }
  const response = await fetch(request);
  try {
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
  } catch (err) {
    // Caching is best-effort; never let it break the response.
  }
  return response;
}

// Network-first: try network (and refresh cache), fall back to cache, then
// to a minimal inline offline page. Used for HTML navigations only.
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    try {
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
    } catch (err) {
      // Best-effort cache write.
    }
    return response;
  } catch (err) {
    try {
      const cached = await caches.match(request);
      if (cached) return cached;
    } catch (innerErr) {
      // Ignore cache read failure.
    }
    return offlineResponse();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET; let the browser deal with everything else.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  // Ignore cross-origin requests entirely.
  if (url.origin !== self.location.origin) return;

  // Never cache dynamic/price/auth routes — straight to the network.
  if (isNeverCache(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default: network only, no caching. Fall back to plain fetch so any
  // unexpected error path still yields a real network response.
  // (No respondWith → browser performs its normal fetch.)
});

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
