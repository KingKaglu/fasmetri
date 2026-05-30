"use client";

import Image, { ImageLoaderProps } from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

// Free image proxy (wsrv.nl): resizes store-CDN images and re-encodes to WebP
// on the fly, so browsers download ~30-60KB thumbnails instead of full-size
// originals. Keeps Vercel's image-optimization quota untouched. `we` = never
// upscale, `output=webp` = modern format with broad support.
function wsrvLoader({ src, width, quality }: ImageLoaderProps) {
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 70}&output=webp&we`;
}

export function ProductImage({ src, alt, priority = false, tall = false }: { src?: string | null; alt: string; priority?: boolean; tall?: boolean }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const isExternalImage = Boolean(src && /^https?:\/\//i.test(src));
  const shape = tall ? "h-full min-h-[14rem]" : "aspect-square";

  return (
    <div className={`relative isolate ${shape} overflow-hidden bg-white`}>
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={tall ? "(max-width: 1024px) 90vw, 480px" : "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          loader={isExternalImage ? wsrvLoader : undefined}
          unoptimized={!isExternalImage}
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
