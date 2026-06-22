import "./load-env";
import { prisma } from "../src/lib/prisma";
import { runEeConsoleSync, EeConsoleSyncMode } from "../src/server/eeConsoles/sync";

type CliArgs = {
  mode: EeConsoleSyncMode;
  promote: boolean;
  dryRun: boolean;
  rawFile?: string;
  reportDir?: string;
  rawDir?: string;
  detailLimit?: number;
};

async function main() {
  const args = parseArgs();
  const report = await runEeConsoleSync(args);
  console.log(JSON.stringify(report, null, 2));

  if (report.validation.hardFailures.length) {
    process.exitCode = 1;
  }
}

function parseArgs(): CliArgs {
  const args = new Map<string, string | boolean>();
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const [key, ...rest] = raw.slice(2).split("=");
    args.set(key, rest.length ? rest.join("=") : true);
  }

  const mode = modeArg(args.get("mode"));
  const dryRun = Boolean(args.get("dry-run"));
  return {
    mode,
    promote: Boolean(args.get("promote")) && !dryRun,
    dryRun,
    rawFile: stringArg(args.get("raw-file")),
    reportDir: stringArg(args.get("report-dir")),
    rawDir: stringArg(args.get("raw-dir")),
    detailLimit: numberArg(args.get("detail-limit")),
  };
}

function modeArg(value: string | boolean | undefined): EeConsoleSyncMode {
  const mode = typeof value === "string" ? value : "prices";
  if (["discover", "full", "prices", "validate", "promote"].includes(mode)) return mode as EeConsoleSyncMode;
  throw new Error(`Unsupported mode "${mode}". Use discover, full, prices, validate, or promote.`);
}

function stringArg(value: string | boolean | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberArg(value: string | boolean | undefined) {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

main()
  .finally(async () => prisma?.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
