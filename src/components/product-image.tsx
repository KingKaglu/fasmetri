"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

export function ProductImage({ src, alt, priority = false, tall = false }: { src?: string | null; alt: string; priority?: boolean; tall?: boolean }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const isExternalImage = Boolean(src && /^https?:\/\//i.test(src));
  const shouldPreload = priority && !isExternalImage;
  const shape = tall ? "h-full min-h-[14rem]" : "aspect-square";

  return (
    <div className={`relative isolate ${shape} overflow-hidden bg-white`}>
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          priority={shouldPreload}
          unoptimized
          onError={() => setFailed(true)}
          className="object-contain p-2 transition duration-200 group-hover:scale-[1.04]"
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
