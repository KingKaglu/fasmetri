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
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
