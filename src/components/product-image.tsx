"use client";

import Image, { ImageLoaderProps } from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

function wsrvLoader({ src, width, quality }: ImageLoaderProps) {
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 72}&output=webp&we`;
}

const nextOptimizedHosts = new Set(["s3.zoommer.ge", "zoommer.ge", "alta.ge", "ee.ge", "veli.store", "pcshop.ge", "extra.ge"]);

function isNextOptimizableImage(src: string | null | undefined) {
  if (!src) return false;
  try {
    return nextOptimizedHosts.has(new URL(src).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function ProductImage({ src, alt, priority = false, tall = false }: { src?: string | null; alt: string; priority?: boolean; tall?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [direct, setDirect] = useState(false);
  const showImage = Boolean(src) && !failed;
  const isExternalImage = Boolean(src && /^https?:\/\//i.test(src));
  // Some store CDNs (e.g. pcshop.ge / WordPress) block the wsrv.nl image proxy,
  // which returns 400 and would leave the card photoless. Fall back to loading
  // the original image directly before showing the placeholder.
  const useWsrv = isExternalImage && !direct;
  const optimizeDirect = direct && isNextOptimizableImage(src);
  const shape = tall ? "h-full min-h-[16rem]" : "aspect-square";

  return (
    <div className={`relative isolate ${shape} overflow-hidden bg-[linear-gradient(145deg,#ffffff,#f1f4ec)]`}>
      <div className="absolute inset-x-4 bottom-5 h-8 rounded-full bg-black/8 blur-xl" />
      {showImage ? (
        <Image
          key={useWsrv ? "wsrv" : "direct"}
          src={src!}
          alt={alt}
          fill
          sizes={tall ? "(max-width: 1024px) 90vw, 520px" : "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          quality={priority ? 76 : 68}
          loader={useWsrv ? wsrvLoader : undefined}
          unoptimized={!useWsrv && !optimizeDirect}
          referrerPolicy="no-referrer"
          onError={() => (useWsrv ? setDirect(true) : setFailed(true))}
          className="object-contain p-3 transition duration-300 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="grid h-full place-items-center gap-1.5 p-4 text-center text-xs font-black text-[var(--muted)]">
          <ImageOff className="mx-auto size-7 text-[var(--line-strong)]" />
          სურათი მიუწვდომელია
        </div>
      )}
    </div>
  );
}
