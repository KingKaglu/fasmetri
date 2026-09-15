/**
 * Pushes the sitemap's URLs to IndexNow (Bing, Yandex, Seznam, Naver share the
 * protocol; Google does not participate). Unlike Search Console this needs no
 * account — ownership is proved by serving the key back from public/<key>.txt,
 * so it is the one indexing lever we can pull without a login.
 *
 *   npx tsx scripts/indexnow.ts            # submit every sitemap URL
 *   npx tsx scripts/indexnow.ts --dry-run  # show what would be sent
 */
import "./load-env";

const KEY = process.env.INDEXNOW_KEY ?? "a1cfe62467e2f593635863670a497361";
const HOST = process.env.INDEXNOW_HOST ?? "fasmetri.ge";
const dryRun = process.argv.includes("--dry-run");
// IndexNow caps a submission at 10 000 URLs.
const BATCH = 10_000;

async function main() {
  const sitemap = await fetch(`https://${HOST}/sitemap.xml`).then((r) => r.text());
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!urls.length) throw new Error("sitemap returned no <loc> entries");

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
