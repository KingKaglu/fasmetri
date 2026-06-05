import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Zoommer phone full sync is disabled. Use /api/sync/zoommer-laptops/full." }, { status: 410 });
}
