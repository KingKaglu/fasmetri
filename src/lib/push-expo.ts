import { prisma } from "@/lib/prisma";
import type { PushPayload } from "@/lib/push";

// Native push for the iOS/Android app, alongside the browser Web Push in
// lib/push.ts. Expo's service is used rather than talking to APNs and FCM
// directly: it is one HTTPS call with no certificates to rotate, and the app
// already builds through EAS.
//
// Like web push, everything here is best-effort — a notification that fails
// must never stop a price alert from being recorded as handled by email.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

type ExpoTicket = { status: "ok" | "error"; id?: string; details?: { error?: string } };

export function isExpoPushConfigured() {
  // No key is required for unauthenticated sends; a token only matters once
  // Expo's "enhanced security" option is switched on for the project.
  return true;
}

/** Returns how many app installs the payload actually reached. */
export async function sendExpoPushToEmail(email: string, payload: PushPayload): Promise<number> {
  if (!prisma) return 0;

  let tokens;
  try {
    tokens = await prisma.appPushToken.findMany({ where: { email }, select: { id: true, token: true } });
  } catch {
    return 0;
  }
  if (!tokens.length) return 0;

  let delivered = 0;

  for (let start = 0; start < tokens.length; start += BATCH_SIZE) {
    const batch = tokens.slice(start, start + BATCH_SIZE);
    const messages = batch.map((row) => ({
      to: row.token,
      title: payload.title,
      body: payload.body,
      sound: "default",
      // Read by the app's notification handler to deep-link the tap.
      data: { url: payload.url ?? "/" },
    }));

    let tickets: ExpoTicket[] = [];
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "accept-encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });
      const json = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
      tickets = json?.data ?? [];
    } catch {
      continue;
    }

    await Promise.all(
      tickets.map(async (ticket, index) => {
        if (ticket.status === "ok") {
          delivered += 1;
          return;
        }
        // The one error worth acting on: the app was uninstalled or the token
        // was reissued, so the row will never deliver again.
        if (ticket.details?.error === "DeviceNotRegistered") {
          const row = batch[index];
          if (row) await prisma!.appPushToken.delete({ where: { id: row.id } }).catch(() => undefined);
        }
      }),
    );
  }

  return delivered;
}
