"use client";

import Image, { ImageLoaderProps } from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

function wsrvLoader({ src, width, quality }: ImageLoaderProps) {
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 72}&output=webp&we`;
}

// Compact product thumbnail for admin list rows. Same loading strategy as
// ProductImage (wsrv.nl proxy, then the original URL when the CDN blocks the
// proxy), but sized for dense tables and with an icon-only placeholder.
export function AdminProductThumb({ src, alt, size = 40 }: { src?: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const [direct, setDirect] = useState(false);
  const showImage = Boolean(src) && !failed;
  const useWsrv = Boolean(src && /^https?:\/\//i.test(src)) && !direct;

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-lg border border-[#dbe5d3] bg-white"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          key={useWsrv ? "wsrv" : "direct"}
          src={src!}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          quality={70}
          loader={useWsrv ? wsrvLoader : undefined}
          unoptimized={!useWsrv}
          referrerPolicy="no-referrer"
          onError={() => (useWsrv ? setDirect(true) : setFailed(true))}
          className="size-full object-contain p-0.5"
        />
      ) : (
        <ImageOff className="size-4 text-gray-300" />
      )}
    </span>
  );
}
