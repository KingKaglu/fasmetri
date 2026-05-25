import { CheerioAPI } from "cheerio";
import { ScrapedOffer, SelectorConfig } from "@/server/scrapers/types";

function parseMoney(input: string) {
  const amount = input.replace(/[^\d.,]/g, "").replace(",", ".");
  return Number.parseFloat(amount);
}

function pickImageUrl(baseUrl: string, rawUrl?: string) {
  if (!rawUrl || rawUrl.startsWith("data:")) return undefined;
  const blocked = /(logo|icon|sprite|tracking|pixel|avatar|favicon)/i;
  if (blocked.test(rawUrl)) return undefined;

  try {
    const absolute = new URL(rawUrl, baseUrl).toString();
    return blocked.test(absolute) ? undefined : absolute;
  } catch {
    return undefined;
  }
}

export function selectorParser(baseUrl: string, selectors: SelectorConfig) {
  return ($: CheerioAPI, categorySlug: string): ScrapedOffer[] =>
    $(selectors.item)
      .toArray()
      .flatMap((element): ScrapedOffer[] => {
        const item = $(element);
        const link = item.find(selectors.link).attr("href");
        const price = parseMoney(item.find(selectors.price).first().text());
        const oldPrice = selectors.oldPrice ? parseMoney(item.find(selectors.oldPrice).first().text()) : undefined;

        if (!link || !item.find(selectors.title).text().trim() || Number.isNaN(price)) return [];

        const availabilityText = selectors.availability ? item.find(selectors.availability).text().toLocaleLowerCase() : "";
        const availability = /out|არ არის|ამოიწურა/.test(availabilityText)
          ? "OUT_OF_STOCK"
          : availabilityText
            ? "IN_STOCK"
            : "UNKNOWN";

        return [{
          title: item.find(selectors.title).first().text().trim(),
          url: new URL(link, baseUrl).toString(),
          imageUrl: pickImageUrl(baseUrl, item.find(selectors.image).attr("src") ?? item.find(selectors.image).attr("data-src")),
          price,
          oldPrice: oldPrice && !Number.isNaN(oldPrice) ? oldPrice : undefined,
          availability,
          categorySlug,
        }];
      });
}
