import { FasmetriCategorySlug } from "@/config/categoryMapping";
import { categorySlugForSignals } from "@/server/scrapers/categories";
import { jsonLdNodes, nodeHasType, objectValue, objectValues, stringValue } from "@/server/scrapers/json-ld";
import { loadProductUrlsFromIndexes } from "@/server/scrapers/sitemap";
import { JsonLdNode } from "@/server/scrapers/json-ld";
import { ProductPageParseContext, ShopAdapter } from "@/server/scrapers/types";

const DEFAULT_USER_AGENT = "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractImageString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  // ImageObject: {"@type": "ImageObject", "url": "..."}
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return stringValue(obj.url) ?? stringValue(obj["@id"]) ?? stringValue(obj.contentUrl);
  }
  return undefined;
}

function imageUrl(value: unknown, baseUrl: URL) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const raw = extractImageString(candidate);
  if (!raw) return undefined;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function breadcrumbNames(nodes: JsonLdNode[]) {
  const breadcrumb = nodes.find((node) => nodeHasType(node, "BreadcrumbList"));
  return objectValues(breadcrumb?.itemListElement)
    .map((entry) => stringValue(objectValue(entry.item)?.name) ?? stringValue(entry.name))
    .filter(Boolean) as string[];
}

function offerPrice(product: JsonLdNode) {
  const offer = objectValues(product.offers)[0];
  if (!offer) return undefined;
  const direct = toNumber(offer.price);
  if (direct) return direct;
  const specification = objectValues(offer.priceSpecification)[0];
  return toNumber(specification?.price);
}

function availability(value: unknown): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  const signal = stringValue(value)?.toLocaleLowerCase();
  if (signal?.includes("outofstock")) return "OUT_OF_STOCK";
  if (signal?.includes("instock")) return "IN_STOCK";
  return "UNKNOWN";
}

type SpecPair = { group: string; name: string; value: string };

// PCShop product pages render a WooCommerce "shop_attributes" spec table
// (layout-3): each row is `<th class="attribute_group_name">GROUP</th>` plus a
// single `<td class="attribute_name_values">` holding one or more
// `<b class="attribute_name">Label: </b>Value<br/>` pairs. Older WooCommerce
// layouts instead use one row per attribute with separate th/td (label/value)
// cells, so we handle both. Never throws — missing table → [].
function parseSpecTable(context: ProductPageParseContext): SpecPair[] {
  const { $ } = context;
  const pairs: SpecPair[] = [];
  try {
    const table = $("table.shop_attributes").first();
    if (!table.length) return pairs;

    table.find("tr").each((_, row) => {
      const $row = $(row);
      const group = $row.find("th.attribute_group_name").first().text().trim();

      const valuesCell = $row.find("td.attribute_name_values").first();
      if (valuesCell.length) {
        // layout-3: many "<b>Label:</b> value<br/>" pairs in one cell.
        const html = valuesCell.html() ?? "";
        for (const segment of html.split(/<br\s*\/?>/i)) {
          const $seg = cheerioFragment($, segment);
          const name = $seg.find("b.attribute_name, .attribute_name").first().text();
          $seg.find("b.attribute_name, .attribute_name").remove();
          const value = $seg.text();
          pushPair(pairs, group, name, value);
        }
        return;
      }

      // Classic layout: <th>label</th><td>value</td> (skip group-name rows).
      const label = $row.find("th").not(".attribute_group_name").first().text();
      const value = $row.find("td").not(".attribute_name_values").first().text();
      pushPair(pairs, group, label, value);
    });
  } catch {
    return pairs;
  }
  return pairs;
}

function cheerioFragment($: ProductPageParseContext["$"], html: string) {
  // Wrap so cheerio can parse a bare fragment, then operate on the wrapper.
  return $(`<div>${html}</div>`);
}

function pushPair(pairs: SpecPair[], group: string, name: string, value: string) {
  const cleanName = decodeSpec(name).replace(/[:：]\s*$/, "").trim();
  const cleanValue = decodeSpec(value).trim();
  if (!cleanName || !cleanValue) return;
  pairs.push({ group: group.trim(), name: cleanName, value: cleanValue });
}

function decodeSpec(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&times;|&#215;/g, "x")
    .replace(/&nbsp;/g, " ")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findSpec(specs: SpecPair[], group: string, nameMatcher: RegExp) {
  return specs.find((spec) => spec.group.toLowerCase() === group.toLowerCase() && nameMatcher.test(spec.name.toLowerCase()))?.value;
}

// Turn the parsed spec table into a free-text description blob that
// productNormalization's extractor reads. RAM/storage/screen are emitted with
// the adjacency keywords ("ram", "ssd"/"storage", "inch") that the extractor's
// proximity regexes require so identity can recover them from spec-less titles.
function buildSpecDescription(specs: SpecPair[]): string | undefined {
  if (specs.length === 0) return undefined;
  const parts: string[] = [];

  const ram = findSpec(specs, "Memory", /capacity/) ?? findSpec(specs, "Memory", /memory|ram/);
  const ramAmount = ram?.match(/(\d{1,3})\s*gb/i)?.[1];
  if (ramAmount) parts.push(`${ramAmount}GB RAM`);

  const storage = findSpec(specs, "Storage", /capacity/) ?? findSpec(specs, "Storage", /storage/);
  const storageAmount = storage?.match(/(\d{1,4})\s*(gb|tb)/i);
  const storageType = findSpec(specs, "Storage", /type/) ?? "";
  if (storageAmount) {
    const kind = /ssd|nvme|emmc|hdd/i.exec(`${storage} ${storageType}`)?.[0] ?? "Storage";
    parts.push(`${storageAmount[1]}${storageAmount[2].toUpperCase()} ${kind} Storage`);
  }

  const screen = findSpec(specs, "Screen", /screen size|size/);
  const screenSize = screen?.match(/(\d{1,2}(?:\.\d)?)\s*(?:inch|"|”|″)/i)?.[1] ?? screen?.match(/^(\d{1,2}(?:\.\d)?)\b/)?.[1];
  if (screenSize) parts.push(`${screenSize} inch`);

  // Processor Model strings carry a frequency tail + core/cache detail
  // ("i7-13620H 2.4~4.9GHz (10 Cores...)"). Keep only the chip token (and the
  // type as fallback) so clock-speed noise never leaks into the canonical key.
  const cpuRaw = findSpec(specs, "Processor", /model/) ?? findSpec(specs, "Processor", /processor/);
  const cpuToken = cpuRaw
    ?.replace(/\(.*?\)/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*[~-]\s*\d+(?:\.\d+)?\s*ghz\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*ghz\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cpuToken) parts.push(cpuToken);
  const cpuType = findSpec(specs, "Processor", /type/);
  if (cpuType) parts.push(cpuType);

  const gpu = findSpec(specs, "Graphics", /graphics|gpu/);
  if (gpu) parts.push(gpu);

  const model = findSpec(specs, "Main", /^model$/) ?? findSpec(specs, "Main", /model/);
  if (model) parts.push(model);
  const partNumber = findSpec(specs, "General", /part number|sku/);
  if (partNumber) parts.push(partNumber);

  const color = findSpec(specs, "Physical Characteristics", /color/) ?? findSpec(specs, "Physical Characteristics", /colour/);
  if (color) parts.push(color);

  const sim = findSpec(specs, "Network", /dual sim/) ?? findSpec(specs, "More", /dual sim/);
  if (sim || specs.some((s) => /dual sim/i.test(s.name))) parts.push("Dual SIM");

  const os = findSpec(specs, "Operating System", /operating system|os/);
  if (os) parts.push(os);

  const text = parts.filter(Boolean).join(". ").trim();
  return text.length > 0 ? text : undefined;
}

// PCShop uses WooCommerce. Product URLs are at /shop/{product-slug}/.
// Category is inferred from JSON-LD breadcrumbs + title at scrape time.
// The path filters below are best-effort heuristics based on WooCommerce slugs
// PCShop uses; verified against sitemap samples. May need refinement.
// PCShop WooCommerce slugs are hyphenated product titles, e.g. /shop/lenovo-thinkpad-t14-gen5-...
// Model names appear after the brand with a hyphen separator, so we match [-/]keyword, not \/keyword.
const PCSHOP_CATEGORY_PATH_FILTERS: Partial<Record<FasmetriCategorySlug, RegExp>> = {
  mobiles:              /[-/](?:smartphone|iphone|galaxy-(?:a|s|z)|xiaomi|redmi|poco|honor|realme|nothing-phone|pixel|oneplus|motorola|hmd|vivo|oppo)/i,
  laptops:              /[-/](?:laptop|noutbuk|macbook|notebook|thinkpad|thinkbook|ideapad|legion|loq|yoga-(?:slim|pro|book|[0-9])|zenbook|vivobook|expertbook|proart|aspire|nitro|predator|swift|spin|travelmate|extensa|chromebook|elitebook|probook|zbook|omnibook|pavilion|spectre|envy|omen|victus|inspiron|xps|latitude|vostro|precision|alienware|gram|katana|vector|raider|stealth|sword|cyborg|crosshair|creator-(?:m|z|[0-9])|prestige|summit-e|galaxy-?book|matebook|surface-(?:laptop|book)|rog-|tuf-|strix|zephyrus)/i,
  monitors:             /[-/](?:monitor|display|lcd|led-display|curved|ultrawide|gaming-monitor)/i,
  computers:            /[-/](?:desktop-pc|mini-pc|all-in-one|nettop|beelink|minisforum|acemagic|intel-nuc|workstation|imac|mac-mini|mac-pro|elitedesk|prodesk|thinkcentre|thinkstation)/i,
  gaming:               /[-/](?:gaming-(?:pc|chair|desk|keyboard|mouse|headset|pad)|razer|corsair-k|logitech-g|steelseries|redragon|peripherals)/i,
  "computer-accessories": /[-/](?:keyboard|mouse-(?!pad)|ram-|ssd-|hdd-|nvme|cooler|cpu-cooler|case-fan|power-supply|motherboard|graphics-card|gpu-)/i,
  "cables-adapters":    /[-/](?:cable|adapter|hub|dock|usb-c|hdmi-cable|displayport|thunderbolt|kvm)/i,
  audio:                /[-/](?:headset|headphone|speaker|soundbar|microphone|webcam|earbuds)/i,
  "photo-video":        /[-/](?:webcam|capture-card|streaming|camera-(?!bag|case))/i,
  tablets:              /[-/](?:tablet|ipad|galaxy-tab)/i,
  "tablet-accessories": /[-/](?:tablet-case|tablet-keyboard|stylus|tablet-stand)/i,
};

// PCShop's flat product sitemap has no category info, so slug-keyword filtering
// is unreliable. Read authoritative WooCommerce category pages instead.
async function listCategoryUrls(categoryPath: "notebooks" | "smartphones-tablets/smartphones", userAgent: string) {
  const urls = new Set<string>();
  for (let page = 1; page <= 40; page++) {
    const url =
      page === 1
        ? `https://pcshop.ge/product-category/${categoryPath}/`
        : `https://pcshop.ge/product-category/${categoryPath}/page/${page}/`;
    let html: string;
    try {
      const res = await fetch(url, { headers: { "user-agent": userAgent } });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }
    const before = urls.size;
    for (const m of html.matchAll(/https:\/\/pcshop\.ge\/shop\/[a-z0-9-]+\/?/gi)) {
      const clean = m[0].replace(/\/?$/, "/");
      if (!clean.includes("/ka-ge/")) urls.add(clean);
    }
    if (urls.size === before) break; // no new products discovered → last page
  }
  return [...urls];
}

async function listProductUrls(categorySlug?: string) {
  const userAgent = process.env.SCRAPER_USER_AGENT ?? DEFAULT_USER_AGENT;

  // Phones/laptops: authoritative category-based discovery (complete + no false positives).
  if (categorySlug === "laptops" || categorySlug === "mobiles") {
    const fromCategory = await listCategoryUrls(categorySlug === "laptops" ? "notebooks" : "smartphones-tablets/smartphones", userAgent);
    if (fromCategory.length > 0) return fromCategory;
    // fall through to sitemap+regex if the category page layout changes
  }

  const urls = await loadProductUrlsFromIndexes(["https://pcshop.ge/sitemap.xml"], {
    includeSitemap: /\/sitemap-post-type-product(?:-\d+)?\.xml$/i,
    includeProductUrl: /\/shop\//i,
    userAgent,
  });

  const unique = [...new Set(urls.filter((url) => !new URL(url).pathname.startsWith("/ka-ge/")))];

  if (!categorySlug) return unique;

  const pathFilter = PCSHOP_CATEGORY_PATH_FILTERS[categorySlug as FasmetriCategorySlug];
  if (!pathFilter) return unique; // No filter for this category — return all

  const filtered = unique.filter((url) => pathFilter.test(new URL(url).pathname));
  // Fall back to full list if filter is too aggressive (returns nothing)
  return filtered.length > 0 ? filtered : unique;
}

function parseProductPage(context: ProductPageParseContext) {
  const nodes = jsonLdNodes(context.$);
  const product = nodes.find((node) => nodeHasType(node, "Product"));
  const offer = product ? objectValues(product.offers)[0] : undefined;
  const title = stringValue(product?.name)?.trim();
  const price = product ? offerPrice(product) : undefined;
  if (!product || !title || !price) return null;

  // WooCommerce spec table → free-text description the identity extractor reads.
  // Degrades gracefully: phones/items without a table get description=undefined.
  const specs = parseSpecTable(context);
  const description = buildSpecDescription(specs);
  const specBrand = findSpec(specs, "General", /^brand$/);
  const specModel = findSpec(specs, "Main", /^model$/);

  return {
    externalId: stringValue(product.sku),
    title,
    url: context.url.toString(),
    imageUrl: imageUrl(product.image, context.url),
    price,
    availability: availability(offer?.availability),
    categorySlug: categorySlugForSignals([...breadcrumbNames(nodes), title, context.url.pathname], "computers"),
    description,
    brand: specBrand,
    model: specModel,
  };
}

export const pcshopAdapter: ShopAdapter = {
  slug: "pcshop",
  name: "PCShop",
  baseUrl: "https://pcshop.ge",
  enabledByDefault: true,
  needsConfiguration: false,
  rateLimitMs: 3000,
  maxProductsPerRun: 200,
  preferProductUrlsForCategory: true,
  listProductUrls,
  parseProductPage,
};
