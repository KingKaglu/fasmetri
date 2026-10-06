import { createHash, randomBytes } from "node:crypto";

// Double opt-in tokens, kept free of Prisma so the rules (expiry, single use,
// resend throttling) can be tested without a database: see
// scripts/check-email-verification.ts. The Prisma-backed store lives in
// src/server/alerts/verification.ts.
//
// The raw token only ever exists in the emailed link. The database keeps its
// SHA-256, so a leaked table (or an admin screen) cannot confirm anything. A
// 256-bit random value does not need a slow hash: there is nothing to
// brute-force.

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
/** Resend throttle, per address and across every kind of confirmation mail. */
export const RESEND_WINDOW_MS = 60 * 60 * 1000;
export const MAX_SENDS_PER_WINDOW = 3;
export const MIN_RESEND_INTERVAL_MS = 60 * 1000;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function isWellFormedSecret(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export type VerificationTokenRecord = {
  id: string;
  tokenHash: string;
  email: string;
  pushSubscriptionId: string | null;
  appPushTokenId: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type VerificationTokenTarget = {
  email: string;
  pushSubscriptionId?: string | null;
  appPushTokenId?: string | null;
};

export interface VerificationTokenStore {
  insert(row: {
    tokenHash: string;
    claimHash: string;
    email: string;
    pushSubscriptionId: string | null;
    appPushTokenId: string | null;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<{ id: string }>;
  findByHash(tokenHash: string): Promise<VerificationTokenRecord | null>;
  /**
   * Marks the token used only if it is still unused and unexpired, atomically
   * (one conditional UPDATE). Returns the record when THIS call consumed it, so
   * two simultaneous clicks cannot both succeed.
   */
  consume(tokenHash: string, now: Date): Promise<VerificationTokenRecord | null>;
  /** createdAt of every token issued for `email` since `since`. */
  sendTimesSince(email: string, since: Date): Promise<Date[]>;
}

export type TokenState = "valid" | "expired" | "used" | "invalid";

export function tokenState(record: Pick<VerificationTokenRecord, "expiresAt" | "usedAt"> | null, now: Date): TokenState {
  if (!record) return "invalid";
  if (record.usedAt) return "used";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

export type ResendDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function resendDecision(sendTimes: Date[], now: Date): ResendDecision {
  const nowMs = now.getTime();
  const recent = sendTimes
    .map((date) => date.getTime())
    .filter((time) => nowMs - time < RESEND_WINDOW_MS)
    .sort((a, b) => a - b);

  if (recent.length) {
    const sinceLast = nowMs - recent[recent.length - 1];
    if (sinceLast < MIN_RESEND_INTERVAL_MS) {
      return { allowed: false, retryAfterSeconds: Math.ceil((MIN_RESEND_INTERVAL_MS - sinceLast) / 1000) };
    }
  }
  if (recent.length >= MAX_SENDS_PER_WINDOW) {
    // The window frees up when the oldest send in it ages out.
    const oldest = recent[recent.length - MAX_SENDS_PER_WINDOW];
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + RESEND_WINDOW_MS - nowMs) / 1000)) };
  }
  return { allowed: true };
}

export type IssuedToken = {
  allowed: true;
  id: string;
  /** Goes into the emailed link, nowhere else. */
  token: string;
  /** Returned to the requesting browser only; see EmailVerificationToken.claimHash. */
  claim: string;
  expiresAt: Date;
};

export async function issueVerificationToken(
  store: VerificationTokenStore,
  target: VerificationTokenTarget,
  now: Date = new Date(),
): Promise<IssuedToken | { allowed: false; retryAfterSeconds: number }> {
  const email = target.email.trim().toLowerCase();
  const decision = resendDecision(await store.sendTimesSince(email, new Date(now.getTime() - RESEND_WINDOW_MS)), now);
  if (!decision.allowed) return decision;

  const token = generateSecret();
  const claim = generateSecret();
  const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS);
  const { id } = await store.insert({
    tokenHash: hashSecret(token),
    claimHash: hashSecret(claim),
    email,
    pushSubscriptionId: target.pushSubscriptionId ?? null,
    appPushTokenId: target.appPushTokenId ?? null,
    expiresAt,
    createdAt: now,
  });
  return { allowed: true, id, token, claim, expiresAt };
}

export type ConsumeResult =
  | { ok: true; record: VerificationTokenRecord }
  | { ok: false; reason: Exclude<TokenState, "valid"> };

export async function consumeVerificationToken(
  store: VerificationTokenStore,
  rawToken: unknown,
  now: Date = new Date(),
): Promise<ConsumeResult> {
  if (!isWellFormedSecret(rawToken)) return { ok: false, reason: "invalid" };
  const tokenHash = hashSecret(rawToken);
  const state = tokenState(await store.findByHash(tokenHash), now);
  if (state !== "valid") return { ok: false, reason: state };
  const record = await store.consume(tokenHash, now);
  // Lost a race with a second click between the read and the update.
  if (!record) return { ok: false, reason: "used" };
  return { ok: true, record };
}

/** "giorgi@example.com" -> "gi•••@example.com", for pages anyone with the link can open. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}•••@${domain}`;
}
