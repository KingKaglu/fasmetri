-- First-party search logging: SearchQuery (the search twin of ClickEvent),
-- SearchDedup (its IP+query hourly dedup / rate-limit guard) and StockRequest
-- ("tell me when you stock this", captured from the zero-results state).
-- Idempotent so CI can re-run it via `prisma db execute`.

CREATE TABLE IF NOT EXISTS "SearchQuery" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalized" TEXT NOT NULL,
  "resultsCount" INTEGER NOT NULL,
  "hasResults" BOOLEAN NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'search',
  "category" TEXT,
  "shop" TEXT,
  "page" INTEGER NOT NULL DEFAULT 1,
  "referrer" TEXT,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SearchQuery_createdAt_idx" ON "SearchQuery"("createdAt");
CREATE INDEX IF NOT EXISTS "SearchQuery_hasResults_createdAt_idx" ON "SearchQuery"("hasResults", "createdAt");
CREATE INDEX IF NOT EXISTS "SearchQuery_normalized_createdAt_idx" ON "SearchQuery"("normalized", "createdAt");
CREATE INDEX IF NOT EXISTS "SearchQuery_source_hasResults_createdAt_idx" ON "SearchQuery"("source", "hasResults", "createdAt");

CREATE TABLE IF NOT EXISTS "SearchDedup" (
  "id" TEXT NOT NULL,
  "dedupKey" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SearchDedup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SearchDedup_dedupKey_key" ON "SearchDedup"("dedupKey");
CREATE INDEX IF NOT EXISTS "SearchDedup_ipHash_createdAt_idx" ON "SearchDedup"("ipHash", "createdAt");
CREATE INDEX IF NOT EXISTS "SearchDedup_createdAt_idx" ON "SearchDedup"("createdAt");

CREATE TABLE IF NOT EXISTS "StockRequest" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalized" TEXT NOT NULL,
  "notified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockRequest_email_normalized_key" ON "StockRequest"("email", "normalized");
CREATE INDEX IF NOT EXISTS "StockRequest_normalized_createdAt_idx" ON "StockRequest"("normalized", "createdAt");
CREATE INDEX IF NOT EXISTS "StockRequest_notified_createdAt_idx" ON "StockRequest"("notified", "createdAt");
