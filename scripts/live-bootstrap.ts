import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Client as PgClient } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { checkpointId, logProgress, parseBatchOptions, writeCheckpoint } from "./job-utils";

const defaultLiveShops = ["zoommer", "ee", "extra", "pcshop"];

function runOrFail(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function parseEnvLine(line: string) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (!match) return null;
  const key = match[1];
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadDotEnv(envPath: string) {
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (!process.env[parsed.key]) process.env[parsed.key] = parsed.value;
  }
}

async function ensureDatabaseConnection(connectionString: string) {
  const client = new PgClient({ connectionString });
  try {
    await client.connect();
    await client.query("select 1");
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const cwd = process.cwd();
  const envPath = join(cwd, ".env");
  const envExamplePath = join(cwd, ".env.example");
  const batchOptions = parseBatchOptions("live-bootstrap", { limit: 200 });
  const liveShops = process.argv.slice(2).filter((value) => value && !value.startsWith("--"));

  if (!existsSync(envPath)) {
    if (!existsSync(envExamplePath)) {
      throw new Error("Neither .env nor .env.example exists.");
    }
    copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  }

  loadDotEnv(envPath);
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env");
  }

  try {
    await ensureDatabaseConnection(process.env.DATABASE_URL);
  } catch (error) {
    console.error("Database connection failed.");
    console.error("Set DATABASE_URL to a reachable PostgreSQL instance and re-run bootstrap.");
    throw error;
  }

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  runOrFail(npmCmd, ["run", "db:generate"]);
  runOrFail(npmCmd, ["run", "db:migrate", "--", "--name", "live_bootstrap"]);
  runOrFail(npmCmd, ["run", "db:seed"]);

  const targetShops = (batchOptions.shop ? [batchOptions.shop] : liveShops.length ? liveShops : defaultLiveShops).map((value) => value.toLowerCase());
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    await prisma.shop.updateMany({ where: { slug: { in: targetShops } }, data: { enabled: true } });
    await prisma.shop.updateMany({ where: { slug: { notIn: targetShops } }, data: { enabled: false } });
  } finally {
    await prisma.$disconnect();
  }

  process.env.SCRAPER_ENABLED = "true";
  const { scrapeShop } = await import("../src/server/scrapers/runner");

  const summaries: string[] = [];
  for (const slug of targetShops) {
    try {
      const run = await scrapeShop(slug, {
        category: batchOptions.category,
        dryRun: batchOptions.dryRun,
        limit: batchOptions.limit,
        offset: batchOptions.offset,
      });
      const offersSeen = ("offersSeen" in run ? run.offersSeen : 0) ?? 0;
      const offersCreated = ("offersCreated" in run ? run.offersCreated : 0) ?? 0;
      const offersUpdated = ("offersUpdated" in run ? run.offersUpdated : 0) ?? 0;
      const offersSkipped = ("offersSkipped" in run ? run.offersSkipped : 0) ?? 0;
      const progress = {
        checkpointId: checkpointId("live-bootstrap", { ...batchOptions, shop: slug }),
        created: batchOptions.dryRun ? 0 : offersCreated,
        updated: batchOptions.dryRun ? 0 : offersUpdated,
        skipped: offersSkipped,
        failed: "status" in run && String(run.status) === "FAILED" ? 1 : 0,
        processed: offersSeen,
        nextOffset: batchOptions.offset + batchOptions.limit,
      };
      if (!batchOptions.dryRun) writeCheckpoint(`${batchOptions.checkpoint}.${slug}.json`, progress);
      logProgress("live-bootstrap", progress);
      summaries.push(`${slug}: ${run.status}`);
    } catch (error) {
      summaries.push(`${slug}: FAILED (${error instanceof Error ? error.message : "unknown error"})`);
    }
  }

  console.log("Live bootstrap completed.");
  for (const line of summaries) console.log(` - ${line}`);
  console.log("Next step: keep updates running with `npm run jobs:prices`.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
