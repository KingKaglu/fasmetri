export const PUBLIC_LIST_PAGE_SIZE = 36;
export const PUBLIC_API_PAGE_SIZE = 60;
export const PUBLIC_DEALS_RANKED_BATCH_SIZE = 120;

type SearchParamValue = string | string[] | null | undefined;

export function firstParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function cleanSearchQuery(value: SearchParamValue, maxLength = 140) {
  const text = firstParam(value)?.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, maxLength) : undefined;
}

export function cleanSlugParam(value: SearchParamValue, maxLength = 80) {
  const text = firstParam(value)?.trim().slice(0, maxLength);
  if (!text) return undefined;
  return /^[\p{L}\p{N}_-]+$/u.test(text) ? text : undefined;
}

export function finiteNumberParam(value: SearchParamValue, max = 1_000_000) {
  const raw = firstParam(value);
  if (raw == null || raw === "") return undefined;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return Math.min(number, max);
}

export function pageNumberParam(value: SearchParamValue, max = 500) {
  const page = Number(firstParam(value));
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), max);
}

export function pageSizeParam(value: SearchParamValue, defaultSize = PUBLIC_LIST_PAGE_SIZE, max = PUBLIC_API_PAGE_SIZE) {
  const size = Number(firstParam(value));
  if (!Number.isFinite(size) || size < 1) return defaultSize;
  return Math.min(Math.floor(size), max);
}
