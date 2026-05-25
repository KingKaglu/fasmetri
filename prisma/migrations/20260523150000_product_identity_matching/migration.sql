ALTER TABLE "Product"
  ADD COLUMN "canonicalKey" TEXT,
  ADD COLUMN "productIdentity" JSONB;

ALTER TABLE "ProductOffer"
  ADD COLUMN "canonicalKey" TEXT,
  ADD COLUMN "productIdentity" JSONB,
  ADD COLUMN "matchStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "matchConfidence" INTEGER;

CREATE INDEX "Product_canonicalKey_idx" ON "Product"("canonicalKey");
CREATE INDEX "ProductOffer_canonicalKey_idx" ON "ProductOffer"("canonicalKey");
CREATE INDEX "ProductOffer_matchStatus_matchConfidence_idx" ON "ProductOffer"("matchStatus", "matchConfidence");
