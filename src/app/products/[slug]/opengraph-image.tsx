import { ImageResponse } from "next/og";
import { getPublicProduct } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { loadGeorgianFont } from "@/lib/og-fonts";

// Per-product social preview: broadsheet-style card with the product name,
// lowest live price, and shop coverage — so a shared link answers "how much,
// where" before the click. Replaces the raw shop photo previously used as
// og:image (wrong aspect ratio, no price, no brand).
export const runtime = "nodejs";
export const alt = "ფასმეტრი — ფასების შედარება";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type OgFont = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];

// Satori has no line-clamp; scale the headline down as the name grows so two
// lines always fit above the price block.
function nameFontSize(name: string) {
  if (name.length <= 30) return 64;
  if (name.length <= 55) return 52;
  if (name.length <= 80) return 44;
  return 36;
}

export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [product, sansRegular, sansBold, serifBold] = await Promise.all([
    getPublicProduct((await params).slug).catch(() => null),
    loadGeorgianFont("Noto Sans Georgian", 400),
    loadGeorgianFont("Noto Sans Georgian", 700),
    loadGeorgianFont("Noto Serif Georgian", 700),
  ]);

  const fonts: NonNullable<OgFont> = [];
  if (sansRegular) fonts.push({ name: "Noto Sans Georgian", data: sansRegular, weight: 400, style: "normal" });
  if (sansBold) fonts.push({ name: "Noto Sans Georgian", data: sansBold, weight: 700, style: "normal" });
  if (serifBold) fonts.push({ name: "Noto Serif Georgian", data: serifBold, weight: 700, style: "normal" });

  const sans = fonts.length ? "Noto Sans Georgian" : "sans-serif";
  const serif = serifBold ? "Noto Serif Georgian" : sans;

  const offers = product?.offers ?? [];
  const prices = offers.map((offer) => offer.currentPrice).filter((price) => price > 0);
  const lowPrice = prices.length ? Math.min(...prices) : null;
  const shopNames = [...new Set(offers.map((offer) => offer.shop.name))];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          color: "#111111",
          padding: "56px 72px",
          fontFamily: sans,
        }}
      >
        {/* Masthead: serif wordmark over double newspaper rules */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ fontSize: 44, fontWeight: 700, fontFamily: serif, letterSpacing: "-1px" }}>
            ფასმეტრი
          </div>
          <div style={{ fontSize: 24, color: "#555555" }}>fasmetri.ge</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
          <div style={{ height: 3, background: "#111111" }} />
          <div style={{ height: 1, background: "#111111" }} />
        </div>

        {/* Product name */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", gap: 20 }}>
          {product?.brand ? (
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", color: "#555555" }}>
              {product.brand}
            </div>
          ) : null}
          <div
            style={{
              fontSize: product ? nameFontSize(product.name) : 64,
              fontWeight: 700,
              fontFamily: serif,
              lineHeight: 1.15,
              letterSpacing: "-1px",
              maxWidth: 1020,
            }}
          >
            {product?.name ?? "ფასების შედარება ქართულ მაღაზიებში"}
          </div>

          {/* Price block */}
          {lowPrice !== null ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 8 }}>
              <div style={{ fontSize: 28, color: "#555555" }}>საუკეთესო ფასი</div>
              <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: "-2px" }}>{formatGel(lowPrice)}</div>
            </div>
          ) : null}
        </div>

        {/* Footer rule + shop coverage */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ height: 1, background: "#111111" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 26, color: "#333333" }}>
              {shopNames.length
                ? `${shopNames.length} მაღაზია · ${shopNames.slice(0, 4).join(" · ")}`
                : "შეადარე ფასები ქართულ ონლაინ მაღაზიებში"}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>₾</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
