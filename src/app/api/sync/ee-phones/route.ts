import { NextRequest, NextResponse } from "next/server";
import { runEePhoneSync } from "@/server/eePhones/sync";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = authorizeCron(request);
  if (unauthorized) return unauthorized;

  try {
    const report = await runEePhoneSync({ mode: "prices", promote: true });
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: "EE phone price sync failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function authorizeCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
