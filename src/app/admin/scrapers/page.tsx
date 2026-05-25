import { AdminLogin } from "@/components/admin-login";
import { AdminNav } from "@/components/admin-nav";
import { isAdminRequest } from "@/lib/admin-auth";
import { listScrapeRuns } from "@/lib/catalog";
import { formatUpdated } from "@/lib/format";

export default async function AdminScrapersPage() {
  if (!(await isAdminRequest())) return <section className="shell py-12"><AdminLogin /></section>;
  const runs = await listScrapeRuns();
  return <section className="shell py-8"><AdminNav /><h1 className="mb-5 text-3xl font-black">სკრეპერის ლოგები</h1><div className="grid gap-3">{runs.map((run) => <article key={run.id} className="rounded-lg border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-black">{run.shopName ?? "მაღაზია"}</h2><span className="rounded-md bg-[#edf4f1] px-2 py-1 text-xs font-bold">{run.status}</span></div><p className="mt-2 text-sm text-[#53656e]">{formatUpdated(run.startedAt)} · {run.pagesVisited} გვერდი · {run.offersSeen} შეთავაზება</p>{run.errorLog ? <pre className="mt-3 overflow-auto rounded-md bg-[#11212a] p-3 text-xs text-white">{JSON.stringify(run.errorLog, null, 2)}</pre> : null}</article>)}</div></section>;
}
