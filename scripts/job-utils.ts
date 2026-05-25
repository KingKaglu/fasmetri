import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type BatchOptions = {
  cursor?: string;
  category?: string;
  checkpoint: string;
  dryRun: boolean;
  limit: number;
  offset: number;
  q?: string;
  rawOnly: boolean;
  resume: boolean;
  safeMode: boolean;
  shop?: string;
  url?: string;
};

export type BatchProgress = {
  checkpointId: string;
  cursor?: string;
  created?: number;
  failed?: number;
  nextOffset: number;
  processed: number;
  skipped?: number;
  updated?: number;
};

export function parseBatchOptions(jobName: string, defaults: { limit?: number } = {}): BatchOptions {
  const args = new Map<string, string | boolean>();
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const [key, ...rest] = raw.slice(2).split("=");
    args.set(key, rest.length ? rest.join("=") : true);
  }

  const checkpoint = stringArg(args, "checkpoint") ?? join(".codex-logs", "checkpoints", `${jobName}.json`);
  const resume = Boolean(args.get("resume"));
  const checkpointState = resume ? readCheckpoint(checkpoint) : null;
  const offset = numberArg(args, "offset", checkpointState?.nextOffset ?? 0);
  const limit = clampLimit(numberArg(args, "limit", defaults.limit ?? 200));

  return {
    cursor: resume ? checkpointState?.cursor : undefined,
    category: stringArg(args, "category"),
    checkpoint,
    dryRun: Boolean(args.get("dry-run")),
    limit,
    offset,
    q: stringArg(args, "q") ?? stringArg(args, "query"),
    rawOnly: Boolean(args.get("raw-only")),
    resume,
    safeMode: Boolean(args.get("safe-mode")),
    shop: stringArg(args, "shop"),
    url: stringArg(args, "url"),
  };
}

export function writeCheckpoint(path: string, progress: BatchProgress) {
  mkdirSync(dirname(path), { recursive: true });
  const payload = {
    ...progress,
    checkpointId: progress.checkpointId,
    savedAt: new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(payload, null, 2));
}

export function logProgress(jobName: string, progress: BatchProgress) {
  console.log(
    [
      `${jobName}: processed=${progress.processed}`,
      `created=${progress.created ?? 0}`,
      `updated=${progress.updated ?? 0}`,
      `skipped=${progress.skipped ?? 0}`,
      `failed=${progress.failed ?? 0}`,
      `nextOffset=${progress.nextOffset}`,
      `checkpoint=${progress.checkpointId}`,
    ].join(" "),
  );
}

export function checkpointId(jobName: string, options: BatchOptions) {
  return [jobName, options.shop, options.category, options.q, options.url ? "target-url" : undefined].filter(Boolean).join(":");
}

function readCheckpoint(path: string): { nextOffset?: number; cursor?: string } | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function stringArg(args: Map<string, string | boolean>, key: string) {
  const value = args.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberArg(args: Map<string, string | boolean>, key: string, fallback: number) {
  const value = args.get(key);
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function clampLimit(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 200;
  return Math.min(Math.max(Math.floor(value), 1), 300);
}
