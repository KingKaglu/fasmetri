import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ compact = false, tone = "dark" }: { compact?: boolean; tone?: "dark" | "light" }) {
  const light = tone === "light";
  if (compact) {
    return (
      <Link href="/" className="group inline-flex min-w-fit items-center gap-2.5" aria-label="ფასმეტრი მთავარი გვერდი">
        <span className={`relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl shadow-[0_10px_24px_rgba(18,19,15,0.18)] ${light ? "bg-white" : "bg-[var(--brand)]"}`}>
          <span className="absolute bottom-2 left-2 h-3 w-1.5 rounded-full bg-[var(--accent)]" />
          <span className={`absolute bottom-2 left-[1.08rem] h-[1.125rem] w-1.5 rounded-full ${light ? "bg-[var(--brand)]" : "bg-white"}`} />
          <span className="absolute bottom-2 right-2 h-[1.375rem] w-1.5 rounded-full bg-[var(--aqua)]" />
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
