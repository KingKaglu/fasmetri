import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
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
