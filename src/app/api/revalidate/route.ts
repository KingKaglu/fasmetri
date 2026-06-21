import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { revalidatePublicCatalog } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

// Force the public site to re-read the DB. Used by out-of-process syncs
// (GitHub Actions CLI scrapers) that write to the DB directly and so can't
// call revalidate in-process — they curl this after promoting.
// Auth: same CRON_SECRET bearer / ?secret= as the /api/sync routes.
async function handle(request: NextRequest) {
  const unauthorized = authorizeCron(request);
  if (unauthorized) return unauthorized;
  revalidatePublicCatalog();
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;
