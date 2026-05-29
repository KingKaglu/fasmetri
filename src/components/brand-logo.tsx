import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link href="/" className="group inline-flex min-w-fit items-center gap-2.5" aria-label="ფასმეტრი მთავარი გვერდი">
        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-[#0f172a]">
          <span className="absolute bottom-1.5 left-1.5 h-3 w-1.5 rounded-sm bg-[#84cc16]" />
          <span className="absolute bottom-1.5 left-[1.05rem] h-4 w-1.5 rounded-sm bg-white" />
          <span className="absolute bottom-1.5 right-1.5 h-5 w-1.5 rounded-sm bg-[#84cc16]" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="whitespace-nowrap text-[1.15rem] font-black tracking-tight text-[#0f172a] sm:text-[1.2rem]">
            ფასმეტრი
          </span>
          <span className="mt-0.5 hidden whitespace-nowrap text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[#64748b] sm:block">
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
