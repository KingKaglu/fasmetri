import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { siteUrl } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში", template: "%s — ფასმეტრი" },
  description: "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
  openGraph: {
    title: "ფასმეტრი",
    description: "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
    locale: "ka_GE",
    type: "website",
    images: ["/brand/fasmetri-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <MobileBottomNav />
        <AnalyticsScripts />
      </body>
    </html>
  );
}
