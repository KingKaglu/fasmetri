import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/config/site";
import {
  consumeVerificationToken,
  hashSecret,
  isWellFormedSecret,
  issueVerificationToken,
  maskEmail,
  tokenState,
  type TokenState,
  type VerificationTokenRecord,
  type VerificationTokenStore,
} from "@/lib/email-verification";
import { activeEmailProvider, sendAlertEmail, verificationEmailHtml } from "@/server/alerts/email";

// Double opt-in for price alerts, stock requests and push registration.
//
//   - An ADDRESS is verified once its owner clicks any confirmation link sent
//     to it (VerifiedEmail). Alert and stock-request emails only go to verified
//     addresses.
//   - A DEVICE (browser push subscription / app push token) is bound to an
//     address only once a link naming that device is clicked. Verifying the
//     address alone is not enough, or anyone could bind their own phone to a
//     stranger's already-verified address and receive their alerts.

export type VerificationStatus =
  | { status: "verified" }
  | {
      status: "pending";
      /** A confirmation mail went out (or was logged, in console mode) just now. */
      emailSent: boolean;
      /** Set when the resend throttle refused a new mail. */
      retryAfterSeconds?: number;
      /** Lets this browser attach its push subscription to the same pending mail. */
      claim?: string;
      /** The device rode along on a confirmation mail that was already sent. */
      attached?: boolean;
    };

const store: VerificationTokenStore = {
  async insert(row) {
    return prisma!.emailVerificationToken.create({ data: row, select: { id: true } });
  },
  async findByHash(tokenHash) {
    return prisma!.emailVerificationToken.findUnique({ where: { tokenHash }, select: recordSelect });
  },
  async consume(tokenHash, now) {
    const result = await prisma!.emailVerificationToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (result.count !== 1) return null;
    return prisma!.emailVerificationToken.findUnique({ where: { tokenHash }, select: recordSelect });
  },
  async sendTimesSince(email, since) {
    const rows = await prisma!.emailVerificationToken.findMany({
      where: { email, createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return rows.map((row) => row.createdAt);
  },
};

const recordSelect = {
  id: true,
  tokenHash: true,
  email: true,
  pushSubscriptionId: true,
  appPushTokenId: true,
  expiresAt: true,
  usedAt: true,
  createdAt: true,
} as const;

export async function isEmailVerified(email: string): Promise<boolean> {
  if (!prisma) return false;
  const row = await prisma.verifiedEmail.findUnique({ where: { email: email.toLowerCase() }, select: { email: true } });
  return row != null;
}

/** The subset of `emails` that has been verified. One query for a whole batch. */
export async function verifiedEmailSet(emails: string[]): Promise<Set<string>> {
  if (!prisma || !emails.length) return new Set();
  const rows = await prisma.verifiedEmail.findMany({
    where: { email: { in: [...new Set(emails.map((email) => email.toLowerCase()))] } },
    select: { email: true },
  });
  return new Set(rows.map((row) => row.email));
}

function canDeliver() {
  return Boolean(activeEmailProvider()) || process.env.ALERT_PROVIDER === "console";
}

/**
 * Makes sure `email` is (or will be) confirmed. With no device target, an
 * already-verified address needs nothing. With a device target a mail naming
 * that device is always sent (subject to the resend throttle).
 */
export async function requestEmailVerification(target: {
  email: string;
  pushSubscriptionId?: string;
  appPushTokenId?: string;
}): Promise<VerificationStatus> {
  if (!prisma) return { status: "pending", emailSent: false };
  const email = target.email.trim().toLowerCase();
  const device = Boolean(target.pushSubscriptionId || target.appPushTokenId);
  if (!device && (await isEmailVerified(email))) return { status: "verified" };

  // Without a transport the link could never arrive; issuing a token would
  // only burn the throttle. The row stays unverified until mail works.
  if (!canDeliver()) {
    console.error("[verification] no email transport configured (RESEND_API_KEY or SMTP_*): confirmation mail not sent.");
    return { status: "pending", emailSent: false };
  }

  const issued = await issueVerificationToken(store, {
    email,
    pushSubscriptionId: target.pushSubscriptionId,
    appPushTokenId: target.appPushTokenId,
  });
  if (!issued.allowed) return { status: "pending", emailSent: false, retryAfterSeconds: issued.retryAfterSeconds };

  const confirmUrl = `${siteUrl()}/alerts/confirm?token=${issued.token}`;
  let sent = false;
  if (activeEmailProvider()) {
    const html = verificationEmailHtml({ confirmUrl, device: device ? (target.appPushTokenId ? "app" : "browser") : null });
    sent = (await sendAlertEmail(email, "დაადასტურე ელფოსტა — ფასმეტრი", html)) != null;
  } else {
    console.log(`[verification] (console) confirm ${email}: ${confirmUrl}`);
    sent = true;
  }
  return { status: "pending", emailSent: sent, claim: sent ? issued.claim : undefined };
}

/**
 * Attaches a device to a confirmation mail that is still waiting to be
 * clicked, using the claim secret only the requesting browser received. Saves
 * the visitor a second mail when they turn push on right after setting an
 * alert.
 */
export async function attachDeviceToPendingClaim(
  claim: unknown,
  email: string,
  device: { pushSubscriptionId?: string; appPushTokenId?: string },
): Promise<boolean> {
  if (!prisma || !isWellFormedSecret(claim)) return false;
  const result = await prisma.emailVerificationToken.updateMany({
    where: { claimHash: hashSecret(claim), email: email.toLowerCase(), usedAt: null, expiresAt: { gt: new Date() } },
    data: device.pushSubscriptionId ? { pushSubscriptionId: device.pushSubscriptionId } : { appPushTokenId: device.appPushTokenId },
  });
  return result.count === 1;
}

export type TokenPreview = { state: TokenState; maskedEmail?: string; device: "browser" | "app" | null };

/** Read-only: what a confirmation link would do. Used by the GET page, so mail scanners that prefetch links consume nothing. */
export async function previewVerificationToken(rawToken: unknown): Promise<TokenPreview> {
  if (!prisma || !isWellFormedSecret(rawToken)) return { state: "invalid", device: null };
  const record = await store.findByHash(hashSecret(rawToken));
  const state = tokenState(record, new Date());
  if (!record) return { state, device: null };
  return { state, maskedEmail: maskEmail(record.email), device: deviceKind(record) };
}

function deviceKind(record: Pick<VerificationTokenRecord, "pushSubscriptionId" | "appPushTokenId">) {
  return record.pushSubscriptionId ? "browser" : record.appPushTokenId ? "app" : null;
}

export type ConfirmOutcome = { ok: true; device: "browser" | "app" | null } | { ok: false; reason: Exclude<TokenState, "valid"> };

export async function confirmVerificationToken(rawToken: unknown): Promise<ConfirmOutcome> {
  if (!prisma) return { ok: false, reason: "invalid" };
  const result = await consumeVerificationToken(store, rawToken);
  if (!result.ok) return result;

  const { record } = result;
  const now = new Date();
  await prisma.verifiedEmail.upsert({
    where: { email: record.email },
    create: { email: record.email, verifiedAt: now, source: "link" },
    update: {},
  });
  // `email` is re-checked: if the device was re-registered under another
  // address after this mail went out, this link must not bind it.
  if (record.pushSubscriptionId) {
    await prisma.pushSubscription.updateMany({
      where: { id: record.pushSubscriptionId, email: record.email },
      data: { emailVerifiedAt: now },
    });
  }
  if (record.appPushTokenId) {
    await prisma.appPushToken.updateMany({
      where: { id: record.appPushTokenId, email: record.email },
      data: { emailVerifiedAt: now },
    });
  }
  return { ok: true, device: deviceKind(record) };
}
