import assert from "node:assert/strict";
import {
  MAX_SENDS_PER_WINDOW,
  MIN_RESEND_INTERVAL_MS,
  RESEND_WINDOW_MS,
  VERIFICATION_TOKEN_TTL_MS,
  consumeVerificationToken,
  hashSecret,
  isWellFormedSecret,
  issueVerificationToken,
  maskEmail,
  resendDecision,
  tokenState,
  type VerificationTokenRecord,
  type VerificationTokenStore,
} from "../src/lib/email-verification";

// Double opt-in token rules: create, verify, expiry, reuse, resend throttle.
// Runs against an in-memory store with the same contract as the Prisma one in
// src/server/alerts/verification.ts — no database involved.

type Row = VerificationTokenRecord & { claimHash: string };

function memoryStore() {
  const rows: Row[] = [];
  let seq = 0;
  const store: VerificationTokenStore = {
    async insert(row) {
      const id = `tok_${++seq}`;
      rows.push({ id, usedAt: null, ...row });
      return { id };
    },
    async findByHash(tokenHash) {
      return rows.find((row) => row.tokenHash === tokenHash) ?? null;
    },
    async consume(tokenHash, now) {
      const row = rows.find((r) => r.tokenHash === tokenHash && r.usedAt === null && r.expiresAt > now);
      if (!row) return null;
      row.usedAt = now;
      return row;
    },
    async sendTimesSince(email, since) {
      return rows.filter((row) => row.email === email && row.createdAt >= since).map((row) => row.createdAt);
    },
  };
  return { store, rows };
}

let checks = 0;
const ok = (value: unknown, message: string) => {
  assert.ok(value, message);
  checks += 1;
};
const eq = <T>(actual: T, expected: T, message: string) => {
  assert.deepEqual(actual, expected, message);
  checks += 1;
};

async function main() {
  const t0 = new Date("2026-10-06T10:00:00Z");
  const at = (ms: number) => new Date(t0.getTime() + ms);

  // create
  {
    const { store, rows } = memoryStore();
    const issued = await issueVerificationToken(store, { email: "  Giorgi@Example.com " }, t0);
    assert.ok(issued.allowed);
    ok(isWellFormedSecret(issued.token), "token is 43 base64url chars");
    ok(isWellFormedSecret(issued.claim), "claim is 43 base64url chars");
    ok(issued.token !== issued.claim, "claim is a separate secret");
    eq(rows.length, 1, "one row stored");
    eq(rows[0].email, "giorgi@example.com", "email normalised");
    eq(rows[0].tokenHash, hashSecret(issued.token), "only the hash is stored");
    ok(!JSON.stringify(rows).includes(issued.token), "raw token never stored");
    ok(!JSON.stringify(rows).includes(issued.claim), "raw claim never stored");
    eq(issued.expiresAt.getTime(), t0.getTime() + VERIFICATION_TOKEN_TTL_MS, "expires after the TTL");

    const second = await issueVerificationToken(store, { email: "other@example.com" }, t0);
    assert.ok(second.allowed);
    ok(second.token !== issued.token, "tokens are unique");

    const device = await issueVerificationToken(store, { email: "third@example.com", pushSubscriptionId: "push_1" }, t0);
    assert.ok(device.allowed);
    eq(rows[2].pushSubscriptionId, "push_1", "device target stored with the token");
  }

  // verify + reuse
  {
    const { store } = memoryStore();
    const issued = await issueVerificationToken(store, { email: "a@example.com" }, t0);
    assert.ok(issued.allowed);
    const first = await consumeVerificationToken(store, issued.token, at(60_000));
    ok(first.ok, "fresh token verifies");
    if (first.ok) eq(first.record.email, "a@example.com", "verifies the address it was issued for");
    eq(await consumeVerificationToken(store, issued.token, at(120_000)), { ok: false, reason: "used" }, "second use is refused");
    eq(await consumeVerificationToken(store, issued.claim, at(60_000)), { ok: false, reason: "invalid" }, "the claim is not a confirmation token");
  }

  // concurrent double click: exactly one wins
  {
    const { store } = memoryStore();
    const issued = await issueVerificationToken(store, { email: "race@example.com" }, t0);
    assert.ok(issued.allowed);
    const results = await Promise.all([
      consumeVerificationToken(store, issued.token, at(1000)),
      consumeVerificationToken(store, issued.token, at(1000)),
    ]);
    eq(results.filter((result) => result.ok).length, 1, "only one of two simultaneous uses succeeds");
  }

  // expiry
  {
    const { store } = memoryStore();
    const issued = await issueVerificationToken(store, { email: "late@example.com" }, t0);
    assert.ok(issued.allowed);
    eq(
      await consumeVerificationToken(store, issued.token, at(VERIFICATION_TOKEN_TTL_MS)),
      { ok: false, reason: "expired" },
      "token is dead exactly at expiresAt",
    );
    eq(
      await consumeVerificationToken(store, issued.token, at(VERIFICATION_TOKEN_TTL_MS + 1)),
      { ok: false, reason: "expired" },
      "and after it",
    );
    const fresh = await issueVerificationToken(store, { email: "late2@example.com" }, t0);
    assert.ok(fresh.allowed);
    ok((await consumeVerificationToken(store, fresh.token, at(VERIFICATION_TOKEN_TTL_MS - 1))).ok, "valid one ms before expiry");
    eq(tokenState({ expiresAt: at(10), usedAt: at(5) }, at(20)), "used", "used wins over expired");
    eq(tokenState(null, t0), "invalid", "missing record is invalid");
  }

  // malformed / unknown tokens
  {
    const { store } = memoryStore();
    for (const bad of [undefined, null, "", "short", "x".repeat(42) + "!", 42, "a".repeat(44)]) {
      eq(await consumeVerificationToken(store, bad, t0), { ok: false, reason: "invalid" }, `rejects ${String(bad)}`);
    }
    eq(await consumeVerificationToken(store, "A".repeat(43), t0), { ok: false, reason: "invalid" }, "unknown well-formed token");
  }

  // resend throttle
  {
    const { store } = memoryStore();
    const email = "spam@example.com";
    assert.ok((await issueVerificationToken(store, { email }, t0)).allowed);
    const tooSoon = await issueVerificationToken(store, { email }, at(MIN_RESEND_INTERVAL_MS - 1000));
    ok(!tooSoon.allowed, "second mail inside the minimum interval is refused");
    if (!tooSoon.allowed) eq(tooSoon.retryAfterSeconds, 1, "retry-after counts down to the interval");
    ok((await issueVerificationToken(store, { email }, at(MIN_RESEND_INTERVAL_MS))).allowed, "allowed once the interval passed");
    ok((await issueVerificationToken(store, { email }, at(2 * MIN_RESEND_INTERVAL_MS))).allowed, "third mail in the hour allowed");
    const capped = await issueVerificationToken(store, { email }, at(3 * MIN_RESEND_INTERVAL_MS));
    ok(!capped.allowed, `cap of ${MAX_SENDS_PER_WINDOW} per window`);
    if (!capped.allowed) {
      eq(capped.retryAfterSeconds, (RESEND_WINDOW_MS - 3 * MIN_RESEND_INTERVAL_MS) / 1000, "retry when the oldest send ages out");
    }
    ok((await issueVerificationToken(store, { email }, at(RESEND_WINDOW_MS))).allowed, "window frees up after an hour");
    ok(
      (await issueVerificationToken(store, { email: "someone-else@example.com" }, at(3 * MIN_RESEND_INTERVAL_MS))).allowed,
      "throttle is per address",
    );
    eq(resendDecision([], t0), { allowed: true }, "no history, allowed");
  }

  eq(maskEmail("giorgi@example.com"), "gi•••@example.com", "mask keeps two chars");
  eq(maskEmail("g@example.com"), "g•••@example.com", "mask on a one-char local part");

  console.log(`email verification: ${checks}/${checks} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
