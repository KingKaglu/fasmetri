import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runScheduledScrape } from "@/server/scrapers/orchestrator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL is required." }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const limit = numberParam(params.get("limit"), 40);
  const offset = numberParam(params.get("offset"), 0);
  const concurrency = numberParam(params.get("concurrency"), 1);
  const shop = stringParam(params.get("shop"));
  const category = stringParam(params.get("category"));
  const rawOnly = params.get("rawOnly") === "true" || params.get("raw-only") === "true";
  const dryRun = params.get("dryRun") === "true" || params.get("dry-run") === "true";

  const previousScraperEnabled = process.env.SCRAPER_ENABLED;
  process.env.SCRAPER_ENABLED = "true";

  try {
    const startedAt = new Date();
    const result = await runScheduledScrape({
      category,
      concurrency,
      dryRun,
      importBatchId: `cron:${startedAt.toISOString()}`,
      limit,
      offset,
      rawOnly,
      shop,
    });

    return NextResponse.json({
      message: "Scrape completed",
      ...result,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Scrape failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    if (previousScraperEnabled == null) delete process.env.SCRAPER_ENABLED;
    else process.env.SCRAPER_ENABLED = previousScraperEnabled;
  }
}

function numberParam(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function stringParam(value: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}
