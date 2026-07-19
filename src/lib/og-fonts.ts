// Shared Google-Fonts loader for Open Graph images rendered with next/og.
//
// Georgian glyphs (ფასმეტრი) do NOT render with ImageResponse's default font —
// they come out as tofu boxes. We embed Noto fonts fetched from Google Fonts.
// The CSS2 endpoint serves a parseable .ttf when no browser UA is sent (a
// browser UA would yield woff2, which satori cannot read). We fetch the whole
// font (not a text subset) so every Georgian glyph is covered.

export type OgFontFamily = "Noto Sans Georgian" | "Noto Serif Georgian";

export async function loadGeorgianFont(
  family: OgFontFamily,
  weight: 400 | 700,
): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`,
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
