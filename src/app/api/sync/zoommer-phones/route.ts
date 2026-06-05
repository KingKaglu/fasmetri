import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Zoommer phone sync is disabled. Use /api/sync/zoommer-laptops." }, { status: 410 });
}
