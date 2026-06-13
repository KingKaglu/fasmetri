import { NextRequest, NextResponse } from "next/server";
import { runZoommerPhoneSync } from "@/server/zoommerPhones/sync";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = authorizeCron(request);
  if (unauthorized) return unauthorized;

  try {
    const report = await runZoommerPhoneSync({ mode: "prices", promote: true });
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Zoommer phone price sync failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
