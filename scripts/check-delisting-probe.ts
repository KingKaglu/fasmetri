import assert from "node:assert/strict";
import { probeDelisting, sampleEvenly } from "../src/server/sync/delistingProbe";

// The probe decides whether a collapsed scrape count is a broken scraper or a
// store that genuinely shrank. Getting that backwards either wedges the sync
// forever (PCShop phones, 11 days) or silently wipes a live catalog, so both
// verdicts are pinned here against a stubbed network.

type StubRoute = number | "throw";

function stubFetch(routes: Record<string, StubRoute>) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const route = routes[url] ?? 404;
    if (route === "throw") throw new Error("network down");
    return new Response(null, { status: route });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const urls = (n: number, prefix = "https://pcshop.ge/shop/p") =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}/`);

async function run() {
  // 1. Everything 404 → the store really delisted them, promotion is allowed.
  {
    const stub = stubFetch(Object.fromEntries(urls(82).map((u) => [u, 404 as StubRoute])));
    const probe = await probeDelisting(urls(82), { delayMs: 0 });
    stub.restore();
    assert.equal(probe.delistingConfirmed, true, "all-404 must confirm delisting");
    assert.equal(probe.gone, 12);
    assert.equal(probe.alive, 0);
    assert.equal(probe.checked, 12, "must cap the sample at maxChecks");
  }

  // 2. Everything still 200 → the scraper broke. Must stay a hard failure.
  {
    const list = urls(82);
    const stub = stubFetch(Object.fromEntries(list.map((u) => [u, 200 as StubRoute])));
    const probe = await probeDelisting(list, { delayMs: 0 });
    stub.restore();
    assert.equal(probe.delistingConfirmed, false, "live URLs must NOT confirm delisting");
    assert.equal(probe.alive, 12);
    assert.ok(probe.aliveSamples.length > 0, "must report which URLs are still live");
  }

  // 3. Mostly gone with one straggler still up → still a genuine delisting.
  {
    const list = urls(24);
    const routes = Object.fromEntries(list.map((u) => [u, 404 as StubRoute]));
    routes[list[0]] = 200;
    const stub = stubFetch(routes);
    const probe = await probeDelisting(list, { delayMs: 0 });
    stub.restore();
    assert.equal(probe.delistingConfirmed, true, "a single survivor must not veto clear evidence");
    assert.equal(probe.alive, 1);
  }

  // 4. A quarter still live is not clear evidence → hard failure.
  {
    const list = urls(24);
    const routes = Object.fromEntries(list.map((u, i) => [u, (i % 4 === 0 ? 200 : 404) as StubRoute]));
    const stub = stubFetch(routes);
    const probe = await probeDelisting(list, { delayMs: 0 });
    stub.restore();
    assert.equal(probe.delistingConfirmed, false, "25% still live must block promotion");
  }

  // 5. Network down → inconclusive, never a licence to wipe the catalog.
  {
    const list = urls(20);
    const stub = stubFetch(Object.fromEntries(list.map((u) => [u, "throw" as StubRoute])));
    const probe = await probeDelisting(list, { delayMs: 0 });
    stub.restore();
    assert.equal(probe.delistingConfirmed, false, "unreachable store must not confirm delisting");
    assert.equal(probe.inconclusive, 12);
    assert.equal(probe.gone, 0);
  }

  // 6. Too few conclusive checks to judge → no verdict.
  {
    const list = urls(3);
    const routes: Record<string, StubRoute> = { [list[0]]: 404, [list[1]]: "throw", [list[2]]: "throw" };
    const stub = stubFetch(routes);
    const probe = await probeDelisting(list, { delayMs: 0 });
    stub.restore();
    assert.equal(probe.delistingConfirmed, false, "1 conclusive check is not evidence");
  }

  // 7. A small missing set is checked in full, not sampled down.
  {
    const list = urls(5);
    const stub = stubFetch(Object.fromEntries(list.map((u) => [u, 404 as StubRoute])));
    const probe = await probeDelisting(list, { delayMs: 0 });
    stub.restore();
    assert.equal(probe.checked, 5);
    assert.equal(probe.delistingConfirmed, true);
  }

  // 8. HEAD rejected with 405 → retried as GET rather than scored inconclusive.
  {
    const list = urls(6);
    let head = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "HEAD") { head += 1; return new Response(null, { status: 405 }); }
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    const probe = await probeDelisting(list, { delayMs: 0 });
    globalThis.fetch = original;
    assert.equal(head, 6, "HEAD should be tried first");
    assert.equal(probe.gone, 6, "405 on HEAD must fall back to GET");
    assert.equal(probe.delistingConfirmed, true);
  }

  // 9. Sampling spreads across the list instead of taking the first N.
  {
    const picked = sampleEvenly(urls(100), 10);
    assert.equal(picked.length, 10);
    assert.equal(picked[0], "https://pcshop.ge/shop/p0/");
    assert.equal(picked[9], "https://pcshop.ge/shop/p90/");
    assert.deepEqual(sampleEvenly(urls(4), 10).length, 4, "short lists pass through whole");
  }

  // 10. Nothing missing → nothing to probe, and no false confirmation.
  {
    const probe = await probeDelisting([], { delayMs: 0 });
    assert.equal(probe.checked, 0);
    assert.equal(probe.delistingConfirmed, false);
  }

  console.log("delisting probe: 10/10 checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
