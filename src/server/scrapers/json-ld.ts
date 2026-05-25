import { CheerioAPI } from "cheerio";

export type JsonLdNode = Record<string, unknown>;

function flattenJsonLd(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];

  const node = value as JsonLdNode;
  const graph = flattenJsonLd(node["@graph"]);
  return [node, ...graph];
}

export function jsonLdNodes($: CheerioAPI) {
  return $('script[type="application/ld+json"]')
    .toArray()
    .flatMap((script) => {
      try {
        return flattenJsonLd(JSON.parse($(script).text().trim()));
      } catch {
        return [];
      }
    });
}

export function nodeHasType(node: JsonLdNode, type: string) {
  const value = node["@type"];
  return Array.isArray(value) ? value.includes(type) : value === type;
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonLdNode : undefined;
}

export function objectValues(value: unknown) {
  if (Array.isArray(value)) return value.map(objectValue).filter(Boolean) as JsonLdNode[];
  const single = objectValue(value);
  return single ? [single] : [];
}
