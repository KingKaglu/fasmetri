import sharp from "sharp";
import { writeFileSync } from "node:fs";

// Monochrome brand lockup for schema.org Organization logo + social fallback.
// Latin wordmark (Georgian glyphs don't render via librsvg's default fonts).
const W = 600;
const H = 240;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <!-- mark tile -->
  <rect x="32" y="56" width="128" height="128" rx="30" fill="#0a0a0a"/>
  <g transform="translate(48,64) scale(3.0)" fill="none">
    <path d="M8.63 22.17 A9 9 0 1 1 23.37 22.17" stroke="rgba(255,255,255,0.45)" stroke-width="2.7" stroke-linecap="round"/>
    <path d="M8.63 22.17 A9 9 0 1 1 23.37 22.17" stroke="#ffffff" stroke-width="2.7" stroke-linecap="round" stroke-dasharray="15 60"/>
    <path d="M16 4.2 L16 6.4 M6.9 9.6 L8.5 11.1 M25.1 9.6 L23.5 11.1" stroke="rgba(255,255,255,0.45)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M16 17 L10.9 21.3" stroke="#ffffff" stroke-width="2.7" stroke-linecap="round"/>
    <circle cx="16" cy="17" r="2.4" fill="#ffffff"/>
    <circle cx="16" cy="17" r="0.95" fill="rgba(255,255,255,0.45)"/>
  </g>
  <text x="190" y="132" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800" fill="#111111" letter-spacing="-1">Fasmetri</text>
  <text x="192" y="170" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#666666" letter-spacing="2">PRICE COMPARISON</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync("public/brand/fasmetri-logo.png", png);
console.log("wrote public/brand/fasmetri-logo.png", png.length, "bytes");
