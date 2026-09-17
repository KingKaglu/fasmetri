import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ფასმეტრი — ფასების შედარება",
    short_name: "ფასმეტრი",
    description:
      "შეადარე ფასები, იპოვე აქციები და საუკეთესო შეთავაზებები ქართულ ონლაინ მაღაზიებში.",
    start_url: "/",
    display: "standalone",
    lang: "ka-GE",
    dir: "ltr",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#15172b",
    // Android's install prompt ignores an SVG-only icon set and falls back to a
    // screenshot of the page, so the square brand mark is offered as a raster
    // icon too; Chrome downsamples the 1024 source for every slot it needs.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/brand/fasmetri-profile.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
  };
}
