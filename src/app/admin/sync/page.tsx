import { ExternalLink, Lock } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { MatcherTriggerButton, SyncTriggerButtons } from "@/components/admin-sync-actions";
import {
  AdminEmptyState,
  AdminKeyValue,
  AdminLoginShell,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminStatusPill,
} from "@/components/admin-ui";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  MATCHER_WORKFLOW_FILE,
  SYNC_MODULES,
  WorkflowRun,
  fetchWorkflowRuns,
  githubConfigured,
  githubRepo,
  lockStatus,
  readLatestReport,
} from "@/lib/admin-sync-status";
import { formatUpdated } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSyncPage() {
  if (!(await isAdminRequest())) return <AdminLoginShell><AdminLogin /></AdminLoginShell>;
  if (!prisma) {
    return (
      <AdminShell>
        <AdminEmptyState title="DATABASE_URL არ არის მითითებული" />
      </AdminShell>
    );
  }
  const db = prisma;

  const configured = githubConfigured();
  const modules = await Promise.all(
    SYNC_MODULES.map(async (module) => {
      const offerWhere = {
        shop: { slug: module.shopSlug },
        rawOffer: { categorySlug: module.categorySlug },
      };
      // SyncLog keys: store = shop slug, category = "phones" | "laptops".
      const syncLogCategory = module.categorySlug === "mobiles" ? "phones" : "laptops";
      const [activeCount, lastSeen, seen24h, missing, runs, syncLogs] = await Promise.all([
        db.productOffer.count({ where: { ...offerWhere, isActive: true } }),
        db.productOffer.aggregate({ where: offerWhere, _max: { lastSeenAt: true } }),
        db.productOffer.count({ where: { ...offerWhere, isActive: true, lastSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        db.productOffer.count({ where: { ...offerWhere, isActive: true, missedSyncCount: { gt: 0 } } }),
        fetchWorkflowRuns(module.workflowFile),
        db.syncLog.findMany({
          where: { store: module.shopSlug, category: syncLogCategory },
          orderBy: { completedAt: "desc" },
          take: 6,
        }),
      ]);
      return {
        ...module,
        activeCount,
        lastSeenAt: lastSeen._max.lastSeenAt,
        seen24h,
        missing,
        runs,
        syncLogs,
        report: readLatestReport(module.key),
        lock: lockStatus(module.key),
      };
    }),
  );
  const matcherRuns = await fetchWorkflowRuns(MATCHER_WORKFLOW_FILE, 3);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="sync operations"
        title="სინქრონიზაცია"
        description={`სინქები GitHub Actions-ში ეშვება (${githubRepo()}): ფასების სინქი ყოველ 3 საათში, სრული — ღამით. აქ ჩანს თითო მოდულის ჯანმრთელობა${configured ? " და ხელით გაშვების ღილაკები" : ""}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const fresh = module.lastSeenAt && Date.now() - module.lastSeenAt.getTime() < 24 * 60 * 60 * 1000;
          return (
            <AdminMetricCard
              key={module.key}
              label={module.label}
              value={module.activeCount}
              detail={module.lastSeenAt ? `ბოლო sync ${formatUpdated(module.lastSeenAt)}` : "sync ჯერ არ ყოფილა"}
              tone={fresh ? "good" : "danger"}
            />
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {modules.map((module) => (
          <AdminPanel
            key={module.key}
            title={module.label}
            description={`${module.shopName} — ${module.categorySlug}`}
            actions={
              module.lock?.active ? (
                <AdminStatusPill tone="warn">
                  <Lock className="mr-1 size-3" /> sync მიმდინარეობს ({module.lock.ageMinutes} წთ)
                </AdminStatusPill>
              ) : (
                <AdminStatusPill tone={module.seen24h > 0 ? "good" : "danger"}>{module.seen24h > 0 ? "ჯანმრთელია" : "ჩავარდნილია"}</AdminStatusPill>
              )
            }
          >
            <div className="grid gap-3 p-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <AdminKeyValue label="აქტიური შეთავაზება" value={module.activeCount} />
                <AdminKeyValue label="ნანახი ბოლო 24სთ" value={module.seen24h} />
                <AdminKeyValue label="გამოტოვებული sync" value={module.missing} />
              </div>

              {module.report ? (
                <div className="rounded-xl border border-[#dbe5d3] bg-[#f8fbf4] p-3 text-xs font-bold text-[var(--muted-strong)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">ბოლო ლოკალური რეპორტი</p>
                  <p className="mt-1">
                    {module.report.mode} — ნაპოვნია {module.report.discoveredCount ?? "?"}, განახლდა {module.report.updatedCount ?? "?"}, ჩავარდა {module.report.failedCount ?? 0} —{" "}
                    {module.report.promotionResult ?? "?"}
                    {module.report.finishedAt ? ` — ${formatUpdated(new Date(module.report.finishedAt))}` : ""}
                  </p>
                  {module.report.validation?.hardFailures?.length ? (
                    <p className="mt-1 text-[var(--danger)]">Hard failures: {module.report.validation.hardFailures.join("; ")}</p>
                  ) : null}
                </div>
              ) : null}

              {module.syncLogs.length ? (
                <div className="grid gap-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">Sync ისტორია (DB)</p>
                  {module.syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#dbe5d3] bg-white px-3 py-2 text-xs font-bold text-[var(--muted-strong)]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <AdminStatusPill tone={log.status === "success" ? "good" : log.status === "partial" ? "warn" : "danger"}>
                          {log.status}
                        </AdminStatusPill>
                        {log.runType} — {log.offersScraped} ნაპოვნი, {log.offersUpdated} განახლდა
                      </span>
                      <span title={log.errorMessage ?? undefined}>{formatUpdated(log.completedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {module.runs?.length ? (
                <div className="grid gap-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">ბოლო გაშვებები (GitHub Actions)</p>
                  {module.runs.map((run: WorkflowRun) => (
                    <a
                      key={run.id}
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#dbe5d3] bg-white px-3 py-2 text-xs font-bold text-[var(--muted-strong)] hover:border-[#151713]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <AdminStatusPill tone={run.conclusion === "success" ? "good" : run.conclusion === null ? "info" : "danger"}>
                          {run.conclusion ?? run.status}
                        </AdminStatusPill>
                        {run.event}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {formatUpdated(new Date(run.runStartedAt))}
                        <ExternalLink className="size-3" />
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}

              {configured ? <SyncTriggerButtons workflow={module.workflowFile} /> : null}
            </div>
          </AdminPanel>
        ))}
      </div>

      <AdminPanel
        title="Cross-store matcher"
        description="აერთიანებს მაღაზიების შეთავაზებებს canonical პროდუქტებად. ეშვება მხოლოდ ხელით; შედეგი Review queue-ში ჩანს."
      >
        {configured ? (
          <div className="grid gap-3 p-4 sm:grid-cols-[16rem_minmax(0,1fr)]">
            <MatcherTriggerButton />
            {matcherRuns?.length ? (
              <div className="grid gap-1.5">
                {matcherRuns.map((run) => (
                  <a key={run.id} href={run.htmlUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-[#dbe5d3] bg-white px-3 py-2 text-xs font-bold text-[var(--muted-strong)] hover:border-[#151713]">
                    <AdminStatusPill tone={run.conclusion === "success" ? "good" : run.conclusion === null ? "info" : "danger"}>{run.conclusion ?? run.status}</AdminStatusPill>
                    <span>{formatUpdated(new Date(run.runStartedAt))}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-[var(--muted)]">
                ლოკალურად: <code className="rounded bg-[#f1f5ec] px-1.5 py-0.5">npm run match:phones</code> და <code className="rounded bg-[#f1f5ec] px-1.5 py-0.5">npm run match:laptops</code>
              </p>
            )}
          </div>
        ) : (
          <p className="p-4 text-sm font-bold text-[var(--muted)]">
            ლოკალურად: <code className="rounded bg-[#f1f5ec] px-1.5 py-0.5">npm run match:phones</code> და <code className="rounded bg-[#f1f5ec] px-1.5 py-0.5">npm run match:laptops</code>
          </p>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
