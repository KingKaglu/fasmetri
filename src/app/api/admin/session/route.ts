import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminCookie, createAdminToken } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { clientIp, sha256 } from "@/lib/request-ip";

const input = z.object({ password: z.string().min(1) });

// Per-IP brute-force guard: at most this many FAILED attempts in the window.
const MAX_FAILED_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const PRUNE_RETENTION_MS = 24 * 60 * 60 * 1000;

function resolveIpHash(request: Request) {
  const ip = clientIp(request);
  return ip ? sha256(ip) : null;
}

// Returns true when this IP is over the failed-attempt limit. Fails OPEN on its
// own errors (a limiter DB hiccup must never block a legitimate login).
async function isRateLimited(ipHash: string | null) {
  if (!prisma || !ipHash) return false;
  try {
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const recent = await prisma.loginAttempt.count({
      where: { ipHash, createdAt: { gte: windowStart } },
    });
    return recent >= MAX_FAILED_ATTEMPTS;
  } catch {
    return false;
  }
}

async function recordFailure(ipHash: string | null) {
  if (!prisma || !ipHash) return;
  try {
    await prisma.loginAttempt.create({ data: { ipHash } });
    // Opportunistic pruning so the table stays small without a separate cron.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - PRUNE_RETENTION_MS);
      prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => undefined);
    }
  } catch {
    // Never let limiter bookkeeping break the login response.
  }
}

async function clearFailures(ipHash: string | null) {
  if (!prisma || !ipHash) return;
  try {
    await prisma.loginAttempt.deleteMany({ where: { ipHash } });
  } catch {
    // Best-effort cleanup on success.
  }
}

function passwordMatches(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on unequal lengths; guard first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const ipHash = resolveIpHash(request);

  if (await isRateLimited(ipHash)) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = input.safeParse(await request.json().catch(() => null));
  const expected = process.env.ADMIN_PASSWORD;
  if (!parsed.success || !expected || !passwordMatches(parsed.data.password, expected)) {
    await recordFailure(ipHash);
    return Response.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  await clearFailures(ipHash);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, createAdminToken(), adminCookie.options);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, "", { ...adminCookie.options, maxAge: 0 });
  return response;
}
