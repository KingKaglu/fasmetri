import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
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
