type RobotsPolicy = { disallow: string[]; crawlDelayMs?: number };

const cache = new Map<string, RobotsPolicy>();

function parseRobots(text: string): RobotsPolicy {
  const disallow: string[] = [];
  let crawlDelayMs: number | undefined;
  let currentAgentApplies = false;

  // Some stores compress directives into one line; normalize by splitting known keys.
  const normalized = text
    .replace(/#.*/g, "")
    .replace(/\s+(?=(?:user-agent|disallow|allow|crawl-delay|sitemap)\s*:)/gi, "\n");

  for (const line of normalized.split(/\r?\n/)) {
    const match = line.match(/^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const key = match[1].toLocaleLowerCase();
    const value = match[2].trim();
    if (!value) continue;

    if (key === "user-agent") currentAgentApplies = value === "*";
    if (!currentAgentApplies) continue;
    if (key === "disallow" && value) disallow.push(value);
    if (key === "crawl-delay") {
      const delay = Number(value);
      if (Number.isFinite(delay) && delay >= 0) crawlDelayMs = delay * 1000;
    }
  }

  return { disallow, crawlDelayMs };
}

export async function robotsPolicy(baseUrl: string) {
  if (cache.has(baseUrl)) return cache.get(baseUrl)!;
  try {
    const response = await fetch(new URL("/robots.txt", baseUrl), {
      headers: { "user-agent": process.env.SCRAPER_USER_AGENT ?? "FasmetriPriceBot/0.1" },
      cache: "no-store",
    });
    const policy = response.ok ? parseRobots(await response.text()) : { disallow: [] };
    cache.set(baseUrl, policy);
    return policy;
  } catch {
    return { disallow: [] };
  }
}

export function robotsAllows(url: URL, policy: RobotsPolicy) {
  const candidate = `${url.pathname}${url.search}`;
  return !policy.disallow.some((rule) => {
    if (!rule.trim()) return false;
    const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const pattern = new RegExp(`^${escaped}$`);
    return pattern.test(candidate) || (candidate.startsWith(rule) && !rule.includes("*"));
  });
}
