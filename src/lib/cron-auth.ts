import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Guards /api/sync/* (and other headless) routes with the CRON_SECRET bearer
 * token. Fails closed: if CRON_SECRET is unset the request is rejected.
 * Returns a 401 NextResponse when unauthorized, or null when the caller may
 * proceed. Comparison is constant-time to avoid leaking the secret via timing.
 */
export function authorizeCron(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
