-- PriceAnomaly: suspect price moves caught by the store syncs.
-- Idempotent so CI can re-run it via `prisma db execute`.

CREATE TABLE IF NOT EXISTS "PriceAnomaly" (
  "id" TEXT NOT NULL,
  "store" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "offerUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "previousPrice" DECIMAL(12,2) NOT NULL,
  "newPrice" DECIMAL(12,2) NOT NULL,
  "ratio" DOUBLE PRECISION NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PriceAnomaly_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PriceAnomaly_createdAt_idx" ON "PriceAnomaly"("createdAt");
CREATE INDEX IF NOT EXISTS "PriceAnomaly_store_category_idx" ON "PriceAnomaly"("store", "category");
CREATE INDEX IF NOT EXISTS "PriceAnomaly_resolved_idx" ON "PriceAnomaly"("resolved");
