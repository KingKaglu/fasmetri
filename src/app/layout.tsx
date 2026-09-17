import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import { CookieConsent } from "@/components/cookie-consent";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { CompareProvider } from "@/lib/use-compare";
import { FavoritesProvider } from "@/lib/use-favorites";
import { CompareTray } from "@/components/compare-tray";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { siteUrl } from "@/config/site";
import { listPublicCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში", template: "%s — ფასმეტრი" },
  description: "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
  openGraph: {
    title: "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში",
    description: "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
    siteName: "ფასმეტრი",
    locale: "ka_GE",
    type: "website",
    // The social image is supplied by the file-based src/app/opengraph-image.tsx
    // (dynamic 1200x630). Leaving `images` unset lets every route inherit it and
    // override it with their own opengraph-image when present.
  },
  twitter: {
    card: "summary_large_image",
    title: "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში",
    description: "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
  },
  // Search-console ownership proof. Held in env so a token can be added without
  // a code change or redeploy of this file; when unset the tag is simply not
  // emitted, which is what we want rather than an empty content="" meta.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ფასმეტრი", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The header's category strip is driven by the live catalog so empty
  // categories are never advertised. This reads the same cached summary the
  // footer already awaits here, so it adds no extra database round trip.
  const headerCategories = await listPublicCategories()
    .then((categories) => categories.map(({ slug, nameKa }) => ({ slug, nameKa })))
    .catch(() => []);
  const base = siteUrl();
  const siteJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ფასმეტრი",
      alternateName: "Fasmetri",
      url: base,
      inLanguage: "ka-GE",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${base}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ფასმეტრი",
      alternateName: "Fasmetri",
      url: base,
      logo: `${base}/brand/fasmetri-logo.png`,
    },
  ];

  return (
    <html lang="ka" className="h-full antialiased">
      <head>
        {/*
          Every product image (incl. the LCP hero + first listing cards) is served
          through the wsrv.nl image proxy. Warming the DNS + TLS connection here
          removes that handshake from the LCP image's critical path. crossOrigin is
          required because next/image fetches the optimized image anonymously.
        */}
        <link rel="preconnect" href="https://wsrv.nl" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://wsrv.nl" />
        {/* Brand typeface — Noto Sans Georgian (referenced by globals.css body font-family) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700;800&family=Noto+Serif+Georgian:wght@500;600;700;800&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col pb-[8.5rem] md:pb-0">
        <JsonLd data={siteJsonLd} />
        <CompareProvider>
          <FavoritesProvider>
            <SiteHeader categories={headerCategories} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <MobileBottomNav />
            <CompareTray />
          </FavoritesProvider>
        </CompareProvider>
        <AnalyticsScripts />
        <CookieConsent />
        {/*
          Vercel Web Analytics, alongside GA4 rather than instead of it. It is
          served first-party from /_vercel/insights on our own domain, so the
          ad blockers that strip Google Analytics — Brave blocks it by default,
          and gtag/js is simply ERR_ABORTED there — cannot remove it. GA still
          carries the custom funnel events; this carries the honest traffic count.
        */}
        <VercelAnalytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
