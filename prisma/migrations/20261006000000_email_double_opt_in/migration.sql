-- Double opt-in for alert / stock-request emails and push registration.
--
-- MUST be applied right before the code that reads these tables is deployed.
-- The DDL is idempotent like the other hand-applied migrations here. The
-- BACKFILL at the bottom is not something to replay once the new code is live:
-- it would mark sign-ups that are still waiting for their confirmation link as
-- verified. Rows the old code creates between applying this and the deploy
-- simply go through the confirmation flow on their next registration.

CREATE TABLE IF NOT EXISTS "VerifiedEmail" (
  "email"      TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source"     TEXT NOT NULL DEFAULT 'link',
  CONSTRAINT "VerifiedEmail_pkey" PRIMARY KEY ("email")
);

CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
  "id"                 TEXT NOT NULL,
  "tokenHash"          TEXT NOT NULL,
  "claimHash"          TEXT,
  "email"              TEXT NOT NULL,
  "pushSubscriptionId" TEXT,
  "appPushTokenId"     TEXT,
  "expiresAt"          TIMESTAMP(3) NOT NULL,
  "usedAt"             TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken" ("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_claimHash_key" ON "EmailVerificationToken" ("claimHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_email_createdAt_idx" ON "EmailVerificationToken" ("email", "createdAt");

ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "AppPushToken" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Backfill: everything that existed before double opt-in counts as verified,
-- so real subscribers keep receiving their alerts.
UPDATE "PushSubscription" SET "emailVerifiedAt" = "createdAt"
  WHERE "email" IS NOT NULL AND "emailVerifiedAt" IS NULL;
UPDATE "AppPushToken" SET "emailVerifiedAt" = "createdAt"
  WHERE "email" IS NOT NULL AND "emailVerifiedAt" IS NULL;

INSERT INTO "VerifiedEmail" ("email", "verifiedAt", "source")
SELECT "email", MIN("createdAt"), 'backfill'
FROM (
  SELECT "email", "createdAt" FROM "UserPriceAlert"
  UNION ALL SELECT "email", "createdAt" FROM "StockRequest"
  UNION ALL SELECT "email", "createdAt" FROM "PushSubscription" WHERE "email" IS NOT NULL
  UNION ALL SELECT "email", "createdAt" FROM "AppPushToken" WHERE "email" IS NOT NULL
) AS existing
GROUP BY "email"
ON CONFLICT ("email") DO NOTHING;
