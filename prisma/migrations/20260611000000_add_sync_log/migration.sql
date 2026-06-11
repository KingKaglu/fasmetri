-- SyncLog: one row per sync workflow run (written by scripts/log-sync.ts).
-- Idempotent so CI can re-run it via `prisma db execute` on every sync.

CREATE TABLE IF NOT EXISTS "SyncLog" (
  "id" TEXT NOT NULL,
  "store" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "runType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "offersScraped" INTEGER NOT NULL DEFAULT 0,
  "offersUpdated" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SyncLog_store_category_idx" ON "SyncLog"("store", "category");
CREATE INDEX IF NOT EXISTS "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");
