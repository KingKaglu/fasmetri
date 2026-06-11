import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type SyncModule = {
  key: "zoommer-phones" | "zoommer-laptops" | "ee-phones" | "ee-laptops";
  label: string;
  shopSlug: "zoommer" | "ee";
  shopName: string;
  categorySlug: "mobiles" | "laptops";
  workflowFile: string;
};

export const SYNC_MODULES: SyncModule[] = [
  { key: "zoommer-phones", label: "Zoommer ტელეფონები", shopSlug: "zoommer", shopName: "Zoommer", categorySlug: "mobiles", workflowFile: "zoommer-phones-sync.yml" },
  { key: "zoommer-laptops", label: "Zoommer ლეპტოპები", shopSlug: "zoommer", shopName: "Zoommer", categorySlug: "laptops", workflowFile: "zoommer-laptops-sync.yml" },
  { key: "ee-phones", label: "EE ტელეფონები", shopSlug: "ee", shopName: "ელიტ ელექტრონიქსი", categorySlug: "mobiles", workflowFile: "ee-phones-sync.yml" },
  { key: "ee-laptops", label: "EE ლეპტოპები", shopSlug: "ee", shopName: "ელიტ ელექტრონიქსი", categorySlug: "laptops", workflowFile: "ee-laptops-sync.yml" },
];

export const MATCHER_WORKFLOW_FILE = "match-products.yml";

export const TRIGGERABLE_WORKFLOWS = new Set([
  ...SYNC_MODULES.map((module) => module.workflowFile),
  MATCHER_WORKFLOW_FILE,
]);

export type SyncReport = {
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  mode?: string;
  discoveredCount?: number;
  importedCount?: number;
  updatedCount?: number;
  failedCount?: number;
  skippedCount?: number;
  promotionResult?: string;
  warnings?: string[];
  validation?: { hardFailures?: string[]; warnings?: string[] };
};

// Reports and lock files live on the machine that ran the sync (GitHub
// Actions in production), so locally these show real data and on Vercel they
// gracefully return null — the page falls back to DB-derived status.
export function readLatestReport(moduleKey: string): SyncReport | null {
  try {
    const path = join(process.cwd(), "reports", `${moduleKey}-sync-latest.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as SyncReport;
  } catch {
    return null;
  }
}

export function lockStatus(moduleKey: string): { active: boolean; ageMinutes: number } | null {
  try {
    const path = join(process.cwd(), ".codex-logs", `${moduleKey}-sync.lock`);
    if (!existsSync(path)) return null;
    const ageMs = Date.now() - statSync(path).mtimeMs;
    // Sync locks auto-expire after 6h; an older file is stale, not a running sync.
    return { active: ageMs < 6 * 60 * 60 * 1000, ageMinutes: Math.round(ageMs / 60000) };
  } catch {
    return null;
  }
}

function githubToken() {
  return process.env.GITHUB_SYNC_TOKEN ?? process.env.GITHUB_TOKEN;
}

export function githubRepo() {
  return process.env.GITHUB_REPO ?? "KingKaglu/fasmetri";
}

export function githubConfigured() {
  return Boolean(githubToken());
}

export type WorkflowRun = {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  runStartedAt: string;
  htmlUrl: string;
};

export async function fetchWorkflowRuns(workflowFile: string, perPage = 5): Promise<WorkflowRun[] | null> {
  const token = githubToken();
  if (!token) return null;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${githubRepo()}/actions/workflows/${workflowFile}/runs?per_page=${perPage}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      workflow_runs?: Array<{ id: number; status: string; conclusion: string | null; event: string; run_started_at: string; html_url: string }>;
    };
    return (payload.workflow_runs ?? []).map((run) => ({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      runStartedAt: run.run_started_at,
      htmlUrl: run.html_url,
    }));
  } catch {
    return null;
  }
}

export async function dispatchWorkflow(workflowFile: string, inputs?: Record<string, string>) {
  const token = githubToken();
  if (!token) throw new Error("GITHUB_TOKEN (or GITHUB_SYNC_TOKEN) is not configured.");
  if (!TRIGGERABLE_WORKFLOWS.has(workflowFile)) throw new Error("Unknown workflow.");
  const response = await fetch(
    `https://api.github.com/repos/${githubRepo()}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitHub dispatch failed (${response.status}): ${body.slice(0, 200)}`);
  }
}
