import { altaAdapter } from "@/server/scrapers/shops/alta";
import { eeAdapter } from "@/server/scrapers/shops/ee";
import { extraAdapter } from "@/server/scrapers/shops/extra";
import { kontaktAdapter } from "@/server/scrapers/shops/kontakt";
import { pcshopAdapter } from "@/server/scrapers/shops/pcshop";
import { placeholderAdapter } from "@/server/scrapers/shops/placeholder";
import { veliAdapter } from "@/server/scrapers/shops/veli";
import { zoommerAdapter } from "@/server/scrapers/shops/zoommer";

export const adapters = [
  altaAdapter,
  zoommerAdapter,
  eeAdapter,
  veliAdapter,
  extraAdapter,
  kontaktAdapter,
  pcshopAdapter,
  placeholderAdapter("gorgia", "Gorgia", "https://gorgia.ge"),
  placeholderAdapter("domino", "Domino", "https://domino.com.ge"),
  placeholderAdapter("elitemarket", "EliteMarket", "https://elitemarket.ge"),
];

export function findAdapter(slug: string) {
  return adapters.find((adapter) => adapter.slug === slug);
}
