// Remote config for the native app (ge.fasmetri.app).
//
// The point of this route is that a broken release does not have to wait on
// App Store review: raise APP_MIN_SUPPORTED_VERSION and every older build shows
// an update wall on next launch. Flags let a half-finished screen be hidden the
// same way. Everything here is read from env, so changing it is a Vercel
// setting, not a code change.

const DEFAULT_MIN_VERSION = "1.0.0";

function flag(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export async function GET() {
  return Response.json(
    {
      minSupportedVersion: process.env.APP_MIN_SUPPORTED_VERSION?.trim() || DEFAULT_MIN_VERSION,
      // Shown above the catalog when set — maintenance notes, sync outages.
      message: process.env.APP_NOTICE?.trim() || null,
      flags: {
        reviews: flag("APP_FLAG_REVIEWS", true),
        priceIndex: flag("APP_FLAG_PRICE_INDEX", true),
        alerts: flag("APP_FLAG_ALERTS", true),
        push: flag("APP_FLAG_PUSH", true),
        stockRequests: flag("APP_FLAG_STOCK_REQUESTS", true),
      },
    },
    // Short window: this is the kill switch, so it must not be pinned for long.
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
