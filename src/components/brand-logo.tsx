import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ compact = false, tone = "dark" }: { compact?: boolean; tone?: "dark" | "light" }) {
  const light = tone === "light";
  if (compact) {
    return (
      <Link href="/" className="group inline-flex min-w-fit items-center gap-2.5" aria-label="ფასმეტრი მთავარი გვერდი">
        <span className={`relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl shadow-[0_10px_24px_rgba(18,19,15,0.18)] ${light ? "bg-[var(--accent-soft)]" : "bg-[var(--brand)]"}`}>
          {/* Price-meter gauge mark (matches handoff logo.svg) */}
          <svg viewBox="0 0 32 28" className="size-6" fill="none" aria-hidden="true">
            <path d="M8.63 22.17 A9 9 0 1 1 23.37 22.17" stroke="var(--accent)" strokeWidth="2.7" strokeLinecap="round" />
            <path d="M16 4.2 L16 6.4 M6.9 9.6 L8.5 11.1 M25.1 9.6 L23.5 11.1" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
            <path d="M16 17 L10.9 21.3" stroke="var(--aqua)" strokeWidth="2.7" strokeLinecap="round" />
            <circle cx="16" cy="17" r="2.4" fill="var(--accent)" />
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
