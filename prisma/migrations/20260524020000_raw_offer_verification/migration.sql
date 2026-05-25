DO $$ BEGIN
  CREATE TYPE "RawOfferStatus" AS ENUM ('IMPORTED', 'NORMALIZED', 'ATTACHED', 'NEEDS_REVIEW', 'EXCLUDED', 'UNABLE_TO_FETCH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductVerificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'VERIFIED_FULLY', 'PARTIALLY_VERIFIED', 'NEEDS_REVIEW', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StoreVerificationStatus" AS ENUM ('EXACT_MATCH_FOUND', 'NO_MATCH_FOUND', 'POSSIBLE_MATCH_NEEDS_REVIEW', 'DIFFERENT_VARIANT_REJECTED', 'STORE_UNAVAILABLE', 'SEARCH_FAILED', 'BLOCKED_OR_REQUIRES_MANUAL_CHECK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MatchReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Shop"
  ADD COLUMN "lastIngestedAt" TIMESTAMP(3),
  ADD COLUMN "ingestionStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';

ALTER TABLE "Product"
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

ALTER TABLE "ProductOffer"
  ADD COLUMN "rawOfferId" TEXT,
  ADD COLUMN "affiliateUrl" TEXT,
  ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'CONFIRMED';

CREATE TABLE "RawOffer" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "productId" TEXT,
  "externalId" TEXT,
  "originalTitle" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "originalImageUrl" TEXT,
  "rawPrice" DECIMAL(12,2),
  "rawOldPrice" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'GEL',
  "availability" "OfferAvailability" NOT NULL DEFAULT 'UNKNOWN',
  "rawCategory" TEXT,
  "breadcrumbs" JSONB,
  "description" TEXT,
  "imageAlt" TEXT,
  "brand" TEXT,
  "model" TEXT,
  "normalizedTitle" TEXT,
  "cleanTitle" TEXT,
  "canonicalKey" TEXT,
  "productIdentity" JSONB,
  "categorySlug" TEXT,
  "categoryConfidence" INTEGER,
  "categoryNeedsReview" BOOLEAN NOT NULL DEFAULT true,
  "status" "RawOfferStatus" NOT NULL DEFAULT 'IMPORTED',
  "unableToFetchReason" TEXT,
  "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RawOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PossibleProductMatch" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "rawOfferId" TEXT,
  "candidateOfferId" TEXT,
  "shopId" TEXT NOT NULL,
  "candidateTitle" TEXT NOT NULL,
  "candidateUrl" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "reason" TEXT,
  "status" "MatchReviewStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),

  CONSTRAINT "PossibleProductMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVerification" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "status" "ProductVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "checkedShopsCount" INTEGER NOT NULL DEFAULT 0,
  "totalEnabledShopsCount" INTEGER NOT NULL DEFAULT 0,
  "exactMatchesFound" INTEGER NOT NULL DEFAULT 0,
  "possibleMatchesFound" INTEGER NOT NULL DEFAULT 0,
  "rejectedCandidatesCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductStoreVerification" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "status" "StoreVerificationStatus" NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "matchedOfferId" TEXT,
  "candidateUrl" TEXT,
  "candidateTitle" TEXT,
  "candidatePrice" DECIMAL(12,2),
  "candidateImage" TEXT,
  "matchConfidence" INTEGER,
  "mismatchReasons" JSONB,
  "evidenceNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductStoreVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferVerificationEvidence" (
  "id" TEXT NOT NULL,
  "productOfferId" TEXT NOT NULL,
  "sourceShopId" TEXT NOT NULL,
  "originalTitle" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "extractedIdentityJson" JSONB,
  "matchedFieldsJson" JSONB,
  "missingFieldsJson" JSONB,
  "mismatchFieldsJson" JSONB,
  "confidence" INTEGER NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfferVerificationEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RawOffer_shopId_originalUrl_key" ON "RawOffer"("shopId", "originalUrl");
CREATE UNIQUE INDEX "RawOffer_shopId_externalId_key" ON "RawOffer"("shopId", "externalId");
CREATE INDEX "RawOffer_shopId_status_scrapedAt_idx" ON "RawOffer"("shopId", "status", "scrapedAt");
CREATE INDEX "RawOffer_canonicalKey_idx" ON "RawOffer"("canonicalKey");
CREATE INDEX "RawOffer_categorySlug_categoryNeedsReview_idx" ON "RawOffer"("categorySlug", "categoryNeedsReview");

CREATE UNIQUE INDEX "ProductOffer_rawOfferId_key" ON "ProductOffer"("rawOfferId");
CREATE INDEX "Product_isPublic_archivedAt_needsReview_idx" ON "Product"("isPublic", "archivedAt", "needsReview");

CREATE INDEX "PossibleProductMatch_status_confidence_idx" ON "PossibleProductMatch"("status", "confidence");
CREATE INDEX "PossibleProductMatch_productId_shopId_idx" ON "PossibleProductMatch"("productId", "shopId");

CREATE INDEX "ProductVerification_productId_status_idx" ON "ProductVerification"("productId", "status");
CREATE INDEX "ProductVerification_status_updatedAt_idx" ON "ProductVerification"("status", "updatedAt");

CREATE UNIQUE INDEX "ProductStoreVerification_productId_shopId_key" ON "ProductStoreVerification"("productId", "shopId");
CREATE INDEX "ProductStoreVerification_shopId_status_idx" ON "ProductStoreVerification"("shopId", "status");
CREATE INDEX "ProductStoreVerification_status_checkedAt_idx" ON "ProductStoreVerification"("status", "checkedAt");

CREATE INDEX "OfferVerificationEvidence_productOfferId_verifiedAt_idx" ON "OfferVerificationEvidence"("productOfferId", "verifiedAt");
CREATE INDEX "OfferVerificationEvidence_sourceShopId_verifiedAt_idx" ON "OfferVerificationEvidence"("sourceShopId", "verifiedAt");

ALTER TABLE "RawOffer"
  ADD CONSTRAINT "RawOffer_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RawOffer"
  ADD CONSTRAINT "RawOffer_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductOffer"
  ADD CONSTRAINT "ProductOffer_rawOfferId_fkey"
  FOREIGN KEY ("rawOfferId") REFERENCES "RawOffer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PossibleProductMatch"
  ADD CONSTRAINT "PossibleProductMatch_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PossibleProductMatch"
  ADD CONSTRAINT "PossibleProductMatch_rawOfferId_fkey"
  FOREIGN KEY ("rawOfferId") REFERENCES "RawOffer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PossibleProductMatch"
  ADD CONSTRAINT "PossibleProductMatch_candidateOfferId_fkey"
  FOREIGN KEY ("candidateOfferId") REFERENCES "ProductOffer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PossibleProductMatch"
  ADD CONSTRAINT "PossibleProductMatch_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVerification"
  ADD CONSTRAINT "ProductVerification_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductStoreVerification"
  ADD CONSTRAINT "ProductStoreVerification_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductStoreVerification"
  ADD CONSTRAINT "ProductStoreVerification_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductStoreVerification"
  ADD CONSTRAINT "ProductStoreVerification_matchedOfferId_fkey"
  FOREIGN KEY ("matchedOfferId") REFERENCES "ProductOffer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfferVerificationEvidence"
  ADD CONSTRAINT "OfferVerificationEvidence_productOfferId_fkey"
  FOREIGN KEY ("productOfferId") REFERENCES "ProductOffer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferVerificationEvidence"
  ADD CONSTRAINT "OfferVerificationEvidence_sourceShopId_fkey"
  FOREIGN KEY ("sourceShopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
