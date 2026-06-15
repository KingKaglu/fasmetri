"use client";

import Image, { ImageLoaderProps } from "next/image";
import { ImageOff, Laptop, Smartphone } from "lucide-react";
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

export function ProductImage({
  src,
  alt,
  priority = false,
  tall = false,
  categorySlug,
  shopName,
}: {
  src?: string | null;
  alt: string;
  priority?: boolean;
  tall?: boolean;
  categorySlug?: string | null;
  shopName?: string | null;
}) {
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
          sizes={
            tall
              ? // Hero image column is a single ~90vw block below md, then caps at the
                // 20rem (320px) track from md upward — 520px was over-fetching ~1.6x on desktop.
                "(max-width: 767px) 90vw, 320px"
              : // Card width tracks the real responsive grid: 1 col (<380px), 2 (<540),
                // 3 (<768), 4 (<1024), 5 (<1280), 6 above (container caps at 88rem ≈ 220px/col).
                "(max-width: 379px) 92vw, (max-width: 539px) 46vw, (max-width: 767px) 31vw, (max-width: 1023px) 24vw, (max-width: 1279px) 19vw, 220px"
          }
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
        <ImagePlaceholder categorySlug={categorySlug} shopName={shopName} />
      )}
    </div>
  );
}

// Clean placeholder when no image is available: a category-appropriate icon
// plus the store name, so the card still tells the user what/where it is.
function ImagePlaceholder({ categorySlug, shopName }: { categorySlug?: string | null; shopName?: string | null }) {
  const Icon = categorySlug === "mobiles" ? Smartphone : categorySlug === "laptops" ? Laptop : ImageOff;
  return (
    <div className="grid h-full place-items-center p-4 text-center">
      <div className="grid justify-items-center gap-2">
        <span className="grid size-12 place-items-center rounded-xl border border-gray-200 bg-white text-gray-300">
          <Icon className="size-6" />
        </span>
        <span className="text-xs font-medium text-gray-400">
          {shopName ? shopName : "სურათი მიუწვდომელია"}
        </span>
      </div>
    </div>
  );
}
