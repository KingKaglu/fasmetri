// Shared user-agent bot filter.
//
// Analytics tables (ClickEvent, SearchQuery) are business data, so a crawler
// walking every product page must not look like demand. This is deliberately a
// blunt UA check: it is the cheap first gate in front of the IP/rate/dedup
// guards, not a security control.
const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|curl|wget|python-requests|python-urllib|httpx|aiohttp|libwww|scrapy|headless|phantomjs|puppeteer|playwright|selenium|httpclient|okhttp|java\/|go-http-client|node-fetch|axios|postman|insomnia|facebookexternalhit|monitoring|pingdom|uptime/i;

/** True when the user agent is missing or looks automated. */
export function isLikelyBot(userAgent?: string | null) {
  if (!userAgent) return true;
  return BOT_UA_PATTERN.test(userAgent);
}
