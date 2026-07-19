"use client";

import Image, { ImageLoaderProps } from "next/image";
import { ImageOff, Laptop, Smartphone } from "lucide-react";
import { useState } from "react";

function wsrvLoader({ src, width, quality }: ImageLoaderProps) {
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 72}&output=webp&we`;
}

// Hosts that the wsrv.nl proxy cannot fetch (IP/hotlink blocked → wsrv 404).
// These images must load the original URL directly, unoptimized — the raw URL
// returns 200 while wsrv 404s and the Next optimizer endpoint 400s on this deploy.
// Match the host and any subdomain (e.g. www.pcshop.ge, cdn.pcshop.ge).
const wsrvBlockedHosts = new Set(["pcshop.ge"]);

function isWsrvBlockedImage(src: string | null | undefined) {
  if (!src) return false;
  try {
    const host = new URL(src).hostname.toLowerCase();
    return [...wsrvBlockedHosts].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

export function ProductImage({
  src,
  alt,
  priority = false,
  tall = false,
  hero = false,
  categorySlug,
  shopName,
}: {
  src?: string | null;
  alt: string;
  priority?: boolean;
  tall?: boolean;
  /** Product-page hero: capped to ~13rem on phones, 20rem column on md+. */
  hero?: boolean;
  categorySlug?: string | null;
  shopName?: string | null;
}) {
  // Hosts wsrv can't fetch (e.g. pcshop.ge) start in "direct" mode so they skip
  // the wsrv hop entirely and load the raw image unoptimized on first render.
  const [failed, setFailed] = useState(false);
  const [direct, setDirect] = useState(() => isWsrvBlockedImage(src));
  const showImage = Boolean(src) && !failed;
  const isExternalImage = Boolean(src && /^https?:\/\//i.test(src));
  // External images load through the wsrv.nl proxy (optimized/fast). Some store
  // CDNs (e.g. pcshop.ge / WordPress) block wsrv (404), so we fall back to the
  // raw image directly. The Next optimizer endpoint (/_next/image) is not usable
  // on this deployment (400s for every host), so "direct" means an unoptimized
  // raw load of the original URL — never the Next optimizer.
  const useWsrv = isExternalImage && !direct;
  const shape = tall ? "h-full min-h-[16rem]" : "aspect-square";

  return (
    <div className={`relative isolate ${shape} overflow-hidden bg-[linear-gradient(145deg,#ffffff,#f4f4f5)]`}>
      <div className="absolute inset-x-4 bottom-5 h-8 rounded-full bg-black/8 blur-xl" />
      {showImage ? (
        <Image
          key={useWsrv ? "wsrv" : "direct"}
          src={src!}
          alt={alt}
          fill
          sizes={
            hero
              ? // Product-page hero: mobile shows a centered ~13rem (208px) block
                // (full-width square ate the whole first screen — his 2026-07-19
                // report), md+ uses the 20rem (320px) grid column.
                "(max-width: 767px) 208px, 320px"
              : tall
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
          unoptimized={!useWsrv}
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
