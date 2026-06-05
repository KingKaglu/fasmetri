-- Durable offer-level state for the Zoommer mobile-phone sync pipeline.
-- All additions are nullable or defaulted so this can run safely against an
-- existing production catalog without clearing active data.

ALTER TABLE "ProductOffer"
  ADD COLUMN IF NOT EXISTS "previousSeenPrice" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "isOnSale" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "saleDetectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "missedSyncCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "possiblyInactiveAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "inactiveAt" TIMESTAMP(3);

ALTER TABLE "PriceHistory"
  ADD COLUMN IF NOT EXISTS "availability" "OfferAvailability" NOT NULL DEFAULT 'UNKNOWN';

CREATE INDEX IF NOT EXISTS "ProductOffer_isActive_lastSeenAt_idx" ON "ProductOffer"("isActive", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "ProductOffer_missedSyncCount_idx" ON "ProductOffer"("missedSyncCount");
