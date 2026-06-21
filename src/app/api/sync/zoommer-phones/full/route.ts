import { NextRequest, NextResponse } from "next/server";
import { runZoommerPhoneSync } from "@/server/zoommerPhones/sync";
import { authorizeCron } from "@/lib/cron-auth";
import { revalidatePublicCatalog } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = authorizeCron(request);
  if (unauthorized) return unauthorized;

  try {
    const report = await runZoommerPhoneSync({ mode: "full", promote: true });
    revalidatePublicCatalog();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Zoommer phone full sync failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
