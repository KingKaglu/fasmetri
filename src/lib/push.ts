import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Web Push for price alerts. Fully optional: when the VAPID env vars are not
// configured, every function here is a graceful no-op so nothing breaks in a
// deploy that hasn't set up push yet.

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:Fasmetri@gmail.com";

let configured = false;

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

function ensureConfigured() {
  if (configured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

// Send a notification to every subscription registered for an email. Best-effort:
// dead subscriptions (404/410) are pruned, and no error is ever thrown to the caller.
/** Returns how many devices the payload actually reached. */
export async function sendPushToEmail(email: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured() || !prisma) return 0;
  let subscriptions;
  try {
    subscriptions = await prisma.pushSubscription.findMany({ where: { email } });
  } catch {
    return 0;
  }
  const body = JSON.stringify(payload);
  let delivered = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        delivered += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone — prune it.
          await prisma!.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
        // Any other failure is swallowed: a push failure must never block the alert.
      }
    }),
  );
  return delivered;
}
