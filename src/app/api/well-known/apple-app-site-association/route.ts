// Universal Links for the iOS app: this file is what lets a
// https://fasmetri.ge/products/... link open in the app instead of Safari.
// Served at /.well-known/apple-app-site-association via a rewrite in
// next.config.ts, because Next ignores dot-prefixed route folders.
//
// The prefix is the Apple Team ID, which only exists once the Apple Developer
// Program enrollment is done. Until APPLE_APP_ID_PREFIX is set this route 404s
// on purpose: an association file with a placeholder team id is worse than
// none, since iOS caches what it fetches.

const BUNDLE_ID = "ge.fasmetri.app";

export async function GET() {
  const prefix = process.env.APPLE_APP_ID_PREFIX?.trim();
  if (!prefix) return new Response("Not found", { status: 404 });

  const body = {
    applinks: {
      details: [
        {
          appIDs: [`${prefix}.${BUNDLE_ID}`],
          components: [
            { "/": "/products/*", comment: "product pages" },
            { "/": "/categories/*", comment: "category pages" },
            { "/": "/shops/*", comment: "shop pages" },
            { "/": "/deals", comment: "deals" },
            { "/": "/price-index", comment: "price index" },
            { "/": "/reviews", comment: "reviews" },
          ],
        },
      ],
    },
  };

  return new Response(JSON.stringify(body), {
    headers: {
      // Apple requires application/json and no redirect on this path.
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
}
