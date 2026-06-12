-- ClickDedup: fraud guard for ClickEvent (IP+product hourly dedup + rate limiting).
-- Idempotent so CI can re-run it via `prisma db execute`.

CREATE TABLE IF NOT EXISTS "ClickDedup" (
  "id" TEXT NOT NULL,
  "dedupKey" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClickDedup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClickDedup_dedupKey_key" ON "ClickDedup"("dedupKey");
CREATE INDEX IF NOT EXISTS "ClickDedup_ipHash_createdAt_idx" ON "ClickDedup"("ipHash", "createdAt");
CREATE INDEX IF NOT EXISTS "ClickDedup_createdAt_idx" ON "ClickDedup"("createdAt");
