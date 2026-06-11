-- AlertEvent: audit trail of triggered price alerts (see src/server/alerts/evaluate.ts).
-- Idempotent so CI can re-run it via `prisma db execute`.

CREATE TABLE IF NOT EXISTS "AlertEvent" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "targetPrice" DECIMAL(12,2) NOT NULL,
  "offerPrice" DECIMAL(12,2) NOT NULL,
  "shopName" TEXT,
  "notifiedVia" TEXT NOT NULL DEFAULT 'none',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AlertEvent_createdAt_idx" ON "AlertEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "AlertEvent_alertId_idx" ON "AlertEvent"("alertId");
