import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' mailto:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com",
      "connect-src 'self' https: ws: wss:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // The public listing pages read filter search params, so Next renders
      // them dynamically and sends `private, no-store`: every visit and every
      // crawl woke a function and re-rendered the grid. Nothing on them is
      // personalised — no session, nothing read from a cookie — and the data
      // behind them is already memoised for 5-10 minutes, so a short shared
      // cache window costs nothing and takes the repeat hits off the origin.
      // A sync's revalidate call still refreshes the underlying data.
      ...["/categories/:slug", "/shops/:slug", "/deals", "/search", "/games"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }],
      })),
    ];
  },
  async redirects() {
    // The site now lives on fasmetri.ge. The old fasmetri.vercel.app hostname
    // still resolves and would otherwise serve the whole site a second time,
    // splitting search ranking between two identical hosts. Matched on the
    // exact production hostname so preview deployments, which get their own
    // *.vercel.app names, are untouched.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "fasmetri.vercel.app" }],
        destination: "https://fasmetri.ge/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Clean public routes for the MVP. Query strings (filters/sort/pagination)
    // are preserved automatically, so /mobiles?shop=zoommer keeps working.
    return [
      { source: "/mobiles", destination: "/categories/mobiles" },
      { source: "/laptops", destination: "/categories/laptops" },
      { source: "/product/:slug", destination: "/products/:slug" },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [68, 70, 76],
    minimumCacheTTL: 86400,
    remotePatterns: [
      // Active stores: allow the apex plus any image-CDN subdomain (EE serves
      // from static.ee.ge, Zoommer from s3.zoommer.ge). Without the subdomain
      // wildcard next/image rejects the host with a 400 and the image breaks.
      { protocol: "https", hostname: "zoommer.ge" },
      { protocol: "https", hostname: "**.zoommer.ge" },
      { protocol: "https", hostname: "ee.ge" },
      { protocol: "https", hostname: "**.ee.ge" },
      { protocol: "https", hostname: "pcshop.ge" },
      { protocol: "https", hostname: "**.pcshop.ge" },
      { protocol: "https", hostname: "kontakt.ge" },
      { protocol: "https", hostname: "**.kontakt.ge" },
      // Retained for future stores / legacy offers.
      { protocol: "https", hostname: "alta.ge" },
      { protocol: "https", hostname: "**.alta.ge" },
      { protocol: "https", hostname: "veli.store" },
      { protocol: "https", hostname: "**.veli.store" },
      { protocol: "https", hostname: "extra.ge" },
      { protocol: "https", hostname: "**.extra.ge" },
    ],
  },
};

export default nextConfig;
