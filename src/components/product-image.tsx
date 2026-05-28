"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

export function ProductImage({ src, alt, priority = false, tall = false }: { src?: string | null; alt: string; priority?: boolean; tall?: boolean }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const isExternalImage = Boolean(src && /^https?:\/\//i.test(src));
  const shouldPreload = priority && !isExternalImage;
  const shape = tall ? "h-full min-h-[14rem]" : "aspect-[4/3]";

  return (
    <div className={`relative isolate ${shape} overflow-hidden bg-[radial-gradient(ellipse_at_60%_40%,#e8f1ff_0%,#f6f9ff_55%,#ffffff_100%)] transition-colors duration-300 group-hover:bg-[radial-gradient(ellipse_at_60%_40%,#dceeff_0%,#eef5ff_55%,#f6f9ff_100%)]`}>
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          priority={shouldPreload}
          unoptimized
          onError={() => setFailed(true)}
          className="object-contain p-3 transition duration-300 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="grid h-full place-items-center gap-1.5 p-3 text-center text-xs font-bold text-[#64748b]">
          <ImageOff className="mx-auto size-6 text-[#94a3b8]" />
          სურათი არ არის ხელმისაწვდომი
        </div>
      )}
    </div>
  );
}
