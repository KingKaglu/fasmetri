"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

export function ProductImage({ src, alt, priority = false }: { src?: string | null; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const isExternalImage = Boolean(src && /^https?:\/\//i.test(src));
  const shouldPreload = priority && !isExternalImage;

  return (
    <div className="relative isolate aspect-video overflow-hidden bg-[linear-gradient(145deg,#ffffff,#eef5ff)]">
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          priority={shouldPreload}
          unoptimized
          onError={() => setFailed(true)}
          className="object-contain p-3.5 transition duration-300 group-hover:scale-[1.03] sm:p-4"
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
