import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link href="/" className="group inline-flex min-w-fit items-center gap-2.5" aria-label="ფასმეტრი მთავარი გვერდი">
        <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#0054d2] shadow-[0_12px_28px_rgba(0,84,210,.2)] ring-1 ring-[#d9e4f2] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_34px_rgba(0,84,210,.26)]">
          <span className="absolute bottom-2 left-2 h-4 w-2 rounded-sm bg-[#ff6800]" />
          <span className="absolute bottom-2 left-5 h-6 w-2 rounded-sm bg-white/95" />
          <span className="absolute bottom-2 right-2 h-8 w-2 rounded-sm bg-[#ffb000]" />
          <Search className="relative z-10 size-7 translate-x-0.5 translate-y-0.5 text-white drop-shadow-sm" strokeWidth={2.8} />
        </span>
        <span className="flex flex-col leading-none">
          <span className="whitespace-nowrap text-[1.72rem] font-black tracking-normal sm:text-[1.85rem]">
            <span className="text-[#ff6800]">ფას</span>
            <span className="text-[#0054d2]">მეტრი</span>
          </span>
          <span className="mt-1 hidden whitespace-nowrap text-[0.68rem] font-black text-[#64748b] sm:block">იპოვე უკეთესი ფასი</span>
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
        className="h-16 w-auto object-contain sm:h-20"
      />
    </Link>
  );
}
