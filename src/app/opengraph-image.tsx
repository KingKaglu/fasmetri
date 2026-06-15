import { ImageResponse } from "next/og";

// Site-wide social preview (Open Graph / Twitter) image.
// Inherited by every route that does not define its own opengraph-image.
export const runtime = "nodejs";
export const alt = "ფასმეტრი — ფასების შედარება ქართულ მაღაზიებში";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Georgian glyphs (ფასმეტრი) do NOT render with ImageResponse's default font —
// they come out as tofu boxes. We embed Noto Sans Georgian, fetched from Google
// Fonts. The CSS2 endpoint serves a parseable .ttf when no browser UA is sent
// (a browser UA would yield woff2, which satori cannot read). We fetch the whole
// font (not a text subset) so every Georgian glyph is covered.
async function loadGeorgianFont(weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@${weight}`,
      { cache: "force-cache" },
    );
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const url = css.match(/src:\s*url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
    if (!url) return null;
    const fontRes = await fetch(url, { cache: "force-cache" });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

type OgFont = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];

export default async function OpengraphImage() {
  const [regular, bold] = await Promise.all([loadGeorgianFont(400), loadGeorgianFont(700)]);

  const fonts: NonNullable<OgFont> = [];
  if (regular) fonts.push({ name: "Noto Sans Georgian", data: regular, weight: 400, style: "normal" });
  if (bold) fonts.push({ name: "Noto Sans Georgian", data: bold, weight: 700, style: "normal" });

  // Brand palette from globals.css: --brand #111827, --brand-soft #1f2937, --accent #2563eb.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b1220 0%, #111827 55%, #1f2937 100%)",
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
              background: "#2563eb",
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
          <div style={{ fontSize: 40, fontWeight: 400, color: "#cbd5e1", maxWidth: 920 }}>
            შეადარე ფასები ქართულ მაღაზიებში — იპოვე საუკეთესო შეთავაზება
          </div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 120, height: 6, borderRadius: 999, background: "#2563eb" }} />
          <div style={{ fontSize: 26, color: "#94a3b8", fontWeight: 400 }}>
            მობილურები · ლეპტოპები · ფასების ისტორია
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
