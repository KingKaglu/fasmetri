/**
 * Pushes the sitemap's URLs to IndexNow (Bing, Yandex, Seznam, Naver share the
 * protocol; Google does not participate). Unlike Search Console this needs no
 * account — ownership is proved by serving the key back from public/<key>.txt,
 * so it is the one indexing lever we can pull without a login.
 *
 *   npx tsx scripts/indexnow.ts            # submit URLs whose lastmod is recent
 *   npx tsx scripts/indexnow.ts --all      # submit every sitemap URL
 *   npx tsx scripts/indexnow.ts --dry-run  # show what would be sent
 *
 * IndexNow is for *changed* URLs. Re-submitting the whole ~3,000-URL sitemap
 * every day invited Bing, Yandex, Seznam and Naver to re-crawl every product
 * daily, each crawl a server render — part of what ran the Vercel Hobby plan
 * out of Fluid CPU on 2026-09-29. The daily run now sends only URLs whose
 * <lastmod> falls inside the window.
 */
import "./load-env";

const KEY = process.env.INDEXNOW_KEY ?? "a1cfe62467e2f593635863670a497361";
const HOST = process.env.INDEXNOW_HOST ?? "fasmetri.ge";
const dryRun = process.argv.includes("--dry-run");
const submitAll = process.argv.includes("--all");
// Slightly over a day, so a cron that drifts an hour does not drop changes.
const WINDOW_MS = 26 * 60 * 60 * 1000;
// IndexNow caps a submission at 10 000 URLs.
const BATCH = 10_000;

async function main() {
  const sitemap = await fetch(`https://${HOST}/sitemap.xml`).then((r) => r.text());
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1],
    lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1],
  }));
  if (!entries.some((entry) => entry.loc)) throw new Error("sitemap returned no <loc> entries");
  const cutoff = Date.now() - WINDOW_MS;
  const urls = entries
    .filter((entry) => {
      if (submitAll) return true;
      // No lastmod means we cannot tell it is unchanged; send it.
      if (!entry.lastmod) return true;
      const at = Date.parse(entry.lastmod);
      return Number.isNaN(at) || at >= cutoff;
    })
    .map((entry) => entry.loc)
    .filter((loc): loc is string => Boolean(loc));
  console.log(`sitemap entries: ${entries.length}, changed in window: ${urls.length}${submitAll ? " (--all)" : ""}`);
  if (!urls.length) {
    console.log("nothing changed since the last run; skipping submission");
    return;
  }

  // The key file must be reachable before submitting, otherwise every URL in
  // the batch is rejected as unowned and IndexNow rate-limits the retry.
  const keyUrl = `https://${HOST}/${KEY}.txt`;
  const keyRes = await fetch(keyUrl);
  const keyBody = (await keyRes.text()).trim();
  if (!keyRes.ok || keyBody !== KEY) {
    throw new Error(`key file not live at ${keyUrl} (status ${keyRes.status}, body "${keyBody.slice(0, 40)}")`);
  }

  console.log(`sitemap urls: ${urls.length}`);
  for (let i = 0; i < urls.length; i += BATCH) {
    const urlList = urls.slice(i, i + BATCH);
    if (dryRun) {
      console.log(`would submit ${urlList.length} urls, first: ${urlList[0]}`);
      continue;
    }
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: keyUrl, urlList }),
    });
    console.log(`submitted ${urlList.length} urls -> ${res.status} ${res.statusText}`);
    if (res.status >= 400) console.log(await res.text());
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
