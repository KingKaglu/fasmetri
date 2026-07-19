import { ImageResponse } from "next/og";
import { loadGeorgianFont } from "@/lib/og-fonts";

// Site-wide social preview (Open Graph / Twitter) image.
// Inherited by every route that does not define its own opengraph-image.
export const runtime = "nodejs";
export const alt = "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type OgFont = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];

export default async function OpengraphImage() {
  const [regular, bold] = await Promise.all([
    loadGeorgianFont("Noto Sans Georgian", 400),
    loadGeorgianFont("Noto Sans Georgian", 700),
  ]);

  const fonts: NonNullable<OgFont> = [];
  if (regular) fonts.push({ name: "Noto Sans Georgian", data: regular, weight: 400, style: "normal" });
  if (bold) fonts.push({ name: "Noto Sans Georgian", data: bold, weight: 700, style: "normal" });

  // Brand palette from globals.css: --brand #15172b, --brand-soft #232544, --accent #4f46e5.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #000000 0%, #0a0a0a 55%, #27272a 100%)",
          color: "#ffffff",
          padding: "72px 80px",
          fontFamily: fonts.length ? "Noto Sans Georgian" : "sans-serif",
        }}
      >
        {/* Top row: accent mark + Latin wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#ffffff",
              color: "#0a0a0a",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            ₾
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.5px" }}>Fasmetri.ge</div>
        </div>

        {/* Center: Georgian brand + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1, letterSpacing: "-2px" }}>
            ფასმეტრი
          </div>
          <div style={{ fontSize: 40, fontWeight: 400, color: "#d4d4d8", maxWidth: 920 }}>
            შეადარე ფასები ქართულ მაღაზიებში — იპოვე საუკეთესო შეთავაზება
          </div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 120, height: 6, borderRadius: 999, background: "#ffffff" }} />
          <div style={{ fontSize: 26, color: "#a1a1aa", fontWeight: 400 }}>
            მობილურები · ლეპტოპები · ფასების ისტორია
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
