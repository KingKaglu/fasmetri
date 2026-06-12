/**
 * market-intel.ts — fasmetri market intelligence report
 *
 * Uses zero-config web reading techniques (same approach as Agent-Reach):
 *   - Jina Reader (r.jina.ai) for rendering any URL as clean Markdown
 *   - Reddit JSON search API (anonymous; may 403 if blocked)
 *   - RSS feeds from Georgian tech/business news sources
 *
 * Twitter/X requires authenticated cookies (twitter-cli or OpenCLI) — see
 * the Agent-Reach MCP section in CLAUDE.md for setup instructions.
 *
 * Usage: npx tsx scripts/market-intel.ts
 */

const UA = "FasmetriIntelBot/0.1 (+hello@fasmetri.ge)";
const JINA = "https://r.jina.ai/";
const TIMEOUT_MS = 15_000;

type Item = { title: string; url?: string; snippet?: string; date?: string };
type Result = { source: string; label: string; items: Item[]; error?: string };

// ─── helpers ──────────────────────────────────────────────────────────────────

function abort(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function jinaFetch(url: string): Promise<string> {
  const res = await fetch(`${JINA}${url}`, {
    headers: { "User-Agent": UA, Accept: "text/plain" },
    signal: abort(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractLinksFromMarkdown(md: string, limit = 6): Item[] {
  const items: Item[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/\[([^\]]{5,120})\]\((https?:\/\/[^)]+)\)/);
    if (m && !m[2].includes("duckduckgo.com") && !m[2].includes("r.jina.ai")) {
      items.push({ title: m[1].trim(), url: m[2].trim() });
      if (items.length >= limit) break;
    }
  }
  return items;
}

function parseRssXml(xml: string, limit = 5): Item[] {
  const items: Item[] = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && items.length < limit) {
    const block = m[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const link  = block.match(/<link[^>]*>\s*(https?:\/\/[^\s<]+)/)?.[1]?.trim() ?? "";
    const date  = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    if (title) items.push({ title, url: link || undefined, date: date || undefined });
  }
  return items;
}

// ─── channels ─────────────────────────────────────────────────────────────────

async function redditSearch(query: string): Promise<Result> {
  const label = `Reddit: "${query}"`;
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=5&t=month`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: abort(12_000),
    });
    if (!res.ok) {
      // Reddit has blocked anonymous API since 2024; treat as soft failure
      return { source: "reddit", label, items: [], error: `HTTP ${res.status} — Reddit API requires login since 2024` };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;
    const items: Item[] = (json?.data?.children ?? []).map((c: any) => ({
      title: c.data.title as string,
      url: `https://reddit.com${c.data.permalink as string}`,
      snippet: ((c.data.selftext as string) || "").slice(0, 120) || undefined,
      date: new Date((c.data.created_utc as number) * 1000).toISOString().split("T")[0],
    }));
    return { source: "reddit", label, items };
  } catch (e) {
    return { source: "reddit", label, items: [], error: String(e) };
  }
}

async function ddgSearch(query: string): Promise<Result> {
  const label = `Web search: "${query}"`;
  const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=ge-en`;
  try {
    const md = await jinaFetch(ddgUrl);
    const items = extractLinksFromMarkdown(md);
    return { source: "web", label, items };
  } catch (e) {
    return { source: "web", label, items: [], error: String(e) };
  }
}

async function rssFeed(feedUrl: string, name: string): Promise<Result> {
  const label = `RSS: ${name}`;
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": UA },
      signal: abort(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRssXml(xml);
    return { source: "rss", label, items };
  } catch (e) {
    return { source: "rss", label, items: [], error: String(e) };
  }
}

// ─── report printer ───────────────────────────────────────────────────────────

function printResult(r: Result): void {
  const icon = r.error ? "⚠" : r.items.length === 0 ? "○" : "●";
  console.log(`\n${icon}  ${r.label}`);
  if (r.error) {
    console.log(`   Error: ${r.error}`);
    return;
  }
  if (r.items.length === 0) {
    console.log("   No results found.");
    return;
  }
  for (const item of r.items) {
    const date = item.date ? ` [${item.date}]` : "";
    console.log(`  • ${item.title}${date}`);
    if (item.url) console.log(`    ${item.url}`);
    if (item.snippet) console.log(`    ${item.snippet}`);
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Fasmetri Market Intelligence Report");
  console.log(`  ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════");

  console.log("\n── Brand mentions ──────────────────────────────────");
  const brandResults = await Promise.all([
    redditSearch("fasmetri"),
    ddgSearch("fasmetri.ge site:reddit.com OR site:twitter.com OR site:facebook.com"),
    ddgSearch("fasmetri price comparison Georgia"),
  ]);
  brandResults.forEach(printResult);

  console.log("\n── Competitor & store activity ─────────────────────");
  const storeResults = await Promise.all([
    redditSearch("zoommer.ge OR eecom.ge"),
    ddgSearch("zoommer.ge discount deals 2025"),
    ddgSearch("eecom.ge ფასები ფასდაკლება"),
  ]);
  storeResults.forEach(printResult);

  console.log("\n── Georgian tech news (RSS) ─────────────────────────");
  const rssResults = await Promise.all([
    rssFeed("https://forbes.ge/feed/", "Forbes Georgia"),
    rssFeed("https://bm.ge/feed/", "Business Media Georgia"),
    rssFeed("https://massmedia.ge/feed/", "MassMedia.ge"),
    rssFeed("https://itpro.ge/feed/", "IT Pro Georgia"),
  ]);
  rssResults.forEach(printResult);

  console.log("\n── Store tech news via web ─────────────────────────");
  const newsResults = await Promise.all([
    ddgSearch("zoommer.ge news announcement 2025"),
    ddgSearch("ee.ge eecom.ge news Georgia tech"),
  ]);
  newsResults.forEach(printResult);

  const allResults = [...brandResults, ...storeResults, ...rssResults, ...newsResults];
  const totalItems = allResults.reduce((n, r) => n + r.items.length, 0);
  const errors = allResults.filter(r => r.error).length;

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  Summary: ${totalItems} items across ${allResults.length} sources`);
  if (errors) console.log(`  ${errors} source(s) unavailable (see ⚠ above)`);
  console.log("═══════════════════════════════════════════════════\n");

  console.log("Note: Twitter/X requires authenticated cookies.");
  console.log("      See CLAUDE.md § Agent-Reach MCP for setup.");
}

main().catch(err => {
  console.error("Intel run failed:", err);
  process.exit(1);
});
