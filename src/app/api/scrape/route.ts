import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "Generic scraping is disabled.",
      replacement: "Use /api/sync/zoommer-laptops for price sync or /api/sync/zoommer-laptops/full for full detail sync.",
    },
    { status: 410 },
  );
}
