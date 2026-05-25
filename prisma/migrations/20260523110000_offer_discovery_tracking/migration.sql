ALTER TABLE "Product"
  ADD COLUMN "matchingLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "crossStoreCheckedAt" TIMESTAMP(3),
  ADD COLUMN "checkedShopsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalEnabledShopsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "missingOfferDiscoveryStatus" TEXT NOT NULL DEFAULT 'PENDING';

CREATE TABLE "OfferMatchCandidate" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSSIBLE',
  "reasons" JSONB,
  "attributes" JSONB,
  "rejectedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OfferMatchCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickEvent" (
  "id" TEXT NOT NULL,
  "offerId" TEXT,
  "targetUrl" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferMatchCandidate_productId_offerId_key"
  ON "OfferMatchCandidate"("productId", "offerId");
CREATE INDEX "OfferMatchCandidate_status_confidence_idx"
  ON "OfferMatchCandidate"("status", "confidence");
CREATE INDEX "ClickEvent_offerId_createdAt_idx"
  ON "ClickEvent"("offerId", "createdAt");

ALTER TABLE "OfferMatchCandidate"
  ADD CONSTRAINT "OfferMatchCandidate_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferMatchCandidate"
  ADD CONSTRAINT "OfferMatchCandidate_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClickEvent"
  ADD CONSTRAINT "ClickEvent_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
