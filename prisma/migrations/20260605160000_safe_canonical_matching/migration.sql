CREATE TABLE "canonical_products" (
  "id" TEXT NOT NULL,
  "categorySlug" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "familyKey" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "normalizedTitle" TEXT NOT NULL,
  "primaryImage" TEXT,
  "specsJson" JSONB NOT NULL,
  "productId" TEXT,
  "matcherVersion" TEXT NOT NULL,
  "firstMatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMatchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "canonical_products_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductOffer"
  ADD COLUMN "canonicalProductId" TEXT,
  ADD COLUMN "confidence" INTEGER,
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "matcherVersion" TEXT,
  ADD COLUMN "matchedAt" TIMESTAMP(3);

CREATE TABLE "possible_matches" (
  "id" TEXT NOT NULL,
  "rawOfferId" TEXT NOT NULL,
  "canonicalProductId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "matcherVersion" TEXT NOT NULL,
  "rawTitle" TEXT NOT NULL,
  "candidateTitle" TEXT NOT NULL,
  "evidence" JSONB,
  "status" "MatchReviewStatus" NOT NULL DEFAULT 'PENDING',
  "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "possible_matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "canonical_products_canonicalKey_key" ON "canonical_products"("canonicalKey");
CREATE UNIQUE INDEX "canonical_products_productId_key" ON "canonical_products"("productId");
CREATE INDEX "canonical_products_categorySlug_brand_idx" ON "canonical_products"("categorySlug", "brand");
CREATE INDEX "canonical_products_familyKey_idx" ON "canonical_products"("familyKey");
CREATE INDEX "canonical_products_updatedAt_idx" ON "canonical_products"("updatedAt");

CREATE INDEX "ProductOffer_canonicalProductId_idx" ON "ProductOffer"("canonicalProductId");
CREATE INDEX "ProductOffer_matcherVersion_matchedAt_idx" ON "ProductOffer"("matcherVersion", "matchedAt");

CREATE UNIQUE INDEX "possible_matches_rawOfferId_canonicalProductId_matcherVersion_key" ON "possible_matches"("rawOfferId", "canonicalProductId", "matcherVersion");
CREATE INDEX "possible_matches_status_confidence_idx" ON "possible_matches"("status", "confidence");
CREATE INDEX "possible_matches_rawOfferId_idx" ON "possible_matches"("rawOfferId");
CREATE INDEX "possible_matches_canonicalProductId_idx" ON "possible_matches"("canonicalProductId");

ALTER TABLE "canonical_products"
  ADD CONSTRAINT "canonical_products_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductOffer"
  ADD CONSTRAINT "ProductOffer_canonicalProductId_fkey"
  FOREIGN KEY ("canonicalProductId") REFERENCES "canonical_products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "possible_matches"
  ADD CONSTRAINT "possible_matches_rawOfferId_fkey"
  FOREIGN KEY ("rawOfferId") REFERENCES "RawOffer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "possible_matches"
  ADD CONSTRAINT "possible_matches_canonicalProductId_fkey"
  FOREIGN KEY ("canonicalProductId") REFERENCES "canonical_products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "possible_matches"
  ADD CONSTRAINT "possible_matches_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
