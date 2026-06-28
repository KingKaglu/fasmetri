import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ compact = false, tone = "dark" }: { compact?: boolean; tone?: "dark" | "light" }) {
  const light = tone === "light";
  // Tile and gauge always invert each other so the mark never sits ink-on-ink.
  // dark tone  → black tile + white gauge (used on light page backgrounds)
  // light tone → white tile + black gauge (used on the dark footer)
  // Arbitrary hex (not the .bg-white utility) so the dark-mode compat layer
  // never remaps these tiles — the mark must keep its tile↔gauge contrast.
  const tileClass = light ? "bg-[#ffffff]" : "bg-[var(--ink-surface)]";
  const ink = light ? "#0a0a0a" : "#ffffff";
  // Grayscale accent tone for the gauge track + ticks — gives the mark natural
  // tonal balance and depth on both light tiles and the dark ink tile.
  const inkSoft = light ? "rgba(10,10,10,0.4)" : "rgba(255,255,255,0.45)";
  if (compact) {
    return (
      <Link href="/" className="group inline-flex min-w-fit items-center gap-2.5" aria-label="ფასმეტრი მთავარი გვერდი">
        <span className={`relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl shadow-[0_10px_24px_rgba(18,19,15,0.18)] ${tileClass}`}>
          {/* Price-meter gauge mark — two-tone monochrome (soft track + ink value fill) */}
          <svg viewBox="0 0 32 28" className="size-6" fill="none" aria-hidden="true">
            {/* gauge track (subtle) */}
            <path d="M8.63 22.17 A9 9 0 1 1 23.37 22.17" stroke={inkSoft} strokeWidth="2.7" strokeLinecap="round" />
            {/* value fill (full contrast, partial sweep from the needle origin) */}
            <path d="M8.63 22.17 A9 9 0 1 1 23.37 22.17" stroke={ink} strokeWidth="2.7" strokeLinecap="round" strokeDasharray="15 60" />
            {/* tick marks */}
            <path d="M16 4.2 L16 6.4 M6.9 9.6 L8.5 11.1 M25.1 9.6 L23.5 11.1" stroke={inkSoft} strokeWidth="1.6" strokeLinecap="round" />
            {/* needle + hub */}
            <path d="M16 17 L10.9 21.3" stroke={ink} strokeWidth="2.7" strokeLinecap="round" />
            <circle cx="16" cy="17" r="2.4" fill={ink} />
            <circle cx="16" cy="17" r="0.95" fill={inkSoft} />
          </svg>
        </span>
        <span className="flex flex-col leading-none">
          <span className={`whitespace-nowrap text-[1.18rem] font-black sm:text-[1.25rem] ${light ? "text-white" : "text-[var(--brand)]"}`}>
            ფასმეტრი
          </span>
          <span className={`mt-1 hidden whitespace-nowrap text-[0.62rem] font-black uppercase sm:block ${light ? "text-white/50" : "text-[var(--muted)]"}`}>
            ფასების შედარება
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className="flex min-w-fit items-center" aria-label="ფასმეტრი მთავარი გვერდი">
      <Image
        src="/brand/fasmetri-logo.png"
        alt="ფასმეტრი"
        width={260}
        height={104}
        priority
        className="h-12 w-auto object-contain sm:h-14"
      />
    </Link>
  );
}
