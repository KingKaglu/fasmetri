// Evidence for the "scraped count collapsed" guard.
//
// Every store sync hard-fails when a scrape returns far fewer products than the
// database currently has active. That guard exists to catch a BROKEN scraper
// (site changed its markup, category term was renumbered, listing truncated) —
// it must not fire when the store genuinely delisted half its catalog.
//
// Told apart by asking the store. The offers we hold but did not scrape are
// either still on the shelf (scraper broke) or gone (store shrank). A small
// sample of HTTP checks answers that, and the answer is what decides whether
// the count drop is a failure or a fact.
//
// Without this the guard deadlocks: it blocks promotion, promotion is what
// deactivates vanished offers, so the active count never decays and every
// later sync fails on the same stale number. PCShop phones sat wedged that way
// for 11 days (164 active vs 83 live) until this probe shipped.

export type DelistingProbe = {
  checked: number;
  gone: number;
  alive: number;
  inconclusive: number;
  /** True when the sample says the missing offers really are off the store. */
  delistingConfirmed: boolean;
  summary: string;
  aliveSamples: string[];
};

export type DelistingProbeOptions = {
  /** How many of the missing URLs to actually fetch. */
  maxChecks?: number;
  userAgent?: string;
  timeoutMs?: number;
  delayMs?: number;
  /** Share of conclusive checks that must be 404/410 to call it a real delisting. */
  goneRatio?: number;
  /** Conclusive checks needed before the verdict counts at all. */
  minConclusive?: number;
};

const DEFAULTS = {
  maxChecks: 12,
  userAgent: "FasmetriPriceBot/0.1 (+Fasmetri@gmail.com)",
  timeoutMs: 15_000,
  delayMs: 350,
  goneRatio: 0.8,
  minConclusive: 4,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Evenly spaced sample, so the probe never reads one listing page's worth of bad luck. */
export function sampleEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const step = items.length / count;
  const picked: T[] = [];
  for (let i = 0; i < count; i += 1) picked.push(items[Math.floor(i * step)]);
  return picked;
}

async function probeOne(url: string, userAgent: string, timeoutMs: number): Promise<"gone" | "alive" | "unknown"> {
  const headers = { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" };
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 404 || response.status === 410) return "gone";
      if (response.ok) return "alive";
      // 405 means HEAD is not allowed here — retry the same URL with GET.
      if (method === "HEAD" && (response.status === 405 || response.status === 501)) continue;
      return "unknown";
    } catch {
      if (method === "HEAD") continue;
      return "unknown";
    }
  }
  return "unknown";
}

/**
 * Checks a sample of the offer URLs the scrape did not return.
 * `delistingConfirmed` means: the store really dropped them, so a lower count
 * is the truth and promotion should be allowed to deactivate the stragglers.
 */
export async function probeDelisting(missingUrls: string[], options: DelistingProbeOptions = {}): Promise<DelistingProbe> {
  const opts = { ...DEFAULTS, ...options };
  const sample = sampleEvenly(missingUrls, opts.maxChecks);

  let gone = 0;
  let alive = 0;
  let inconclusive = 0;
  const aliveSamples: string[] = [];

  for (const [index, url] of sample.entries()) {
    const verdict = await probeOne(url, opts.userAgent, opts.timeoutMs);
    if (verdict === "gone") gone += 1;
    else if (verdict === "alive") {
      alive += 1;
      if (aliveSamples.length < 3) aliveSamples.push(url);
    } else inconclusive += 1;
    if (index < sample.length - 1 && opts.delayMs > 0) await sleep(opts.delayMs);
  }

  // Silence is never evidence: an empty sample, or one where every check failed
  // to reach the store, must not read as "the store deleted them".
  const conclusive = gone + alive;
  const needed = Math.max(1, Math.min(opts.minConclusive, sample.length));
  const delistingConfirmed = sample.length > 0 && conclusive >= needed && gone >= conclusive * opts.goneRatio;

  const summary =
    sample.length === 0
      ? "no missing offer URLs to probe"
      : `probed ${sample.length} missing offer URL(s) of ${missingUrls.length}: ${gone} gone (404/410), ${alive} still live, ${inconclusive} inconclusive`;

  return { checked: sample.length, gone, alive, inconclusive, delistingConfirmed, summary, aliveSamples };
}
