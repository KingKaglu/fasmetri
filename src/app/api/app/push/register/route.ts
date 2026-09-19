import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Registration for native push tokens, the app's counterpart to
// /api/push/subscribe. Unauthenticated like the browser route: there are no
// accounts, and the token is only useful for sending a notification to the
// device that volunteered it.

const input = z.object({
  // "ExponentPushToken[xxxxxxxx]" — length-capped so a bad client cannot post a
  // novel into the column.
  token: z.string().trim().min(10).max(255),
  platform: z.enum(["ios", "android"]),
  // Optional: without it the token can still be stored, it just cannot be
  // matched to a price alert yet.
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  appVersion: z.string().trim().max(32).optional(),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid push token." }, { status: 400 });
  if (!prisma) return Response.json({ ok: true, mode: "fixture" }, { status: 202 });

  const { token, platform, email, appVersion } = parsed.data;

  try {
    await prisma.appPushToken.upsert({
      where: { token },
      create: { token, platform, email: email ?? null, appVersion: appVersion ?? null },
      // A reinstall or a new email keeps the same token: update rather than
      // accumulate rows that would send the same alert twice.
      update: { platform, email: email ?? null, appVersion: appVersion ?? null },
    });
  } catch {
    return Response.json({ error: "Could not store push token." }, { status: 503 });
  }

  return Response.json({ ok: true });
}
