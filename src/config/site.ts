const DEFAULT_PRODUCTION_URL = "https://fasmetri.vercel.app";
const DEFAULT_DEVELOPMENT_URL = "http://localhost:3000";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function vercelUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}

export function siteUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      vercelUrl() ??
      (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_URL : DEFAULT_DEVELOPMENT_URL),
  );
}

