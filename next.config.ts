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
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
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
    return [{ source: "/(.*)", headers: securityHeaders }];
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
    remotePatterns: [
      { protocol: "https", hostname: "s3.zoommer.ge" },
      { protocol: "https", hostname: "zoommer.ge" },
      { protocol: "https", hostname: "alta.ge" },
      { protocol: "https", hostname: "ee.ge" },
      { protocol: "https", hostname: "veli.store" },
      { protocol: "https", hostname: "pcshop.ge" },
      { protocol: "https", hostname: "extra.ge" },
    ],
  },
};

export default nextConfig;
