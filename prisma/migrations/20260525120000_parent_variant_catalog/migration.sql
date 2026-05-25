CREATE TABLE "ParentProduct" (
  "id" TEXT NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "productLine" TEXT,
  "baseSpecsJson" JSONB,
  "categoryId" TEXT,
  "canonicalParentKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "primaryImage" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "needsReview" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ParentProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "parentProductId" TEXT NOT NULL,
  "variantTitle" TEXT NOT NULL,
  "canonicalVariantKey" TEXT NOT NULL,
  "color" TEXT,
  "storage" TEXT,
  "ram" TEXT,
  "cpu" TEXT,
  "gpu" TEXT,
  "size" TEXT,
  "capacity" TEXT,
  "sku" TEXT,
  "specsJson" JSONB,
  "primaryImage" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "needsReview" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductOffer"
  ADD COLUMN "parentProductId" TEXT,
  ADD COLUMN "variantId" TEXT;

ALTER TABLE "RawOffer"
  ADD COLUMN "parentProductId" TEXT,
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "sourceCategory" TEXT,
  ADD COLUMN "sourceBreadcrumbs" JSONB,
  ADD COLUMN "rawDiscount" INTEGER,
  ADD COLUMN "rawSpecsJson" JSONB,
  ADD COLUMN "importBatchId" TEXT,
  ADD COLUMN "errorMessage" TEXT;

CREATE UNIQUE INDEX "ParentProduct_canonicalParentKey_key" ON "ParentProduct"("canonicalParentKey");
CREATE UNIQUE INDEX "ParentProduct_slug_key" ON "ParentProduct"("slug");
CREATE INDEX "ParentProduct_categoryId_isPublic_idx" ON "ParentProduct"("categoryId", "isPublic");
CREATE INDEX "ParentProduct_brand_model_idx" ON "ParentProduct"("brand", "model");
CREATE INDEX "ParentProduct_needsReview_updatedAt_idx" ON "ParentProduct"("needsReview", "updatedAt");

CREATE UNIQUE INDEX "ProductVariant_canonicalVariantKey_key" ON "ProductVariant"("canonicalVariantKey");
CREATE INDEX "ProductVariant_parentProductId_idx" ON "ProductVariant"("parentProductId");
CREATE INDEX "ProductVariant_isPublic_needsReview_idx" ON "ProductVariant"("isPublic", "needsReview");
CREATE INDEX "ProductVariant_canonicalVariantKey_idx" ON "ProductVariant"("canonicalVariantKey");

CREATE INDEX "ProductOffer_parentProductId_idx" ON "ProductOffer"("parentProductId");
CREATE INDEX "ProductOffer_variantId_currentPrice_idx" ON "ProductOffer"("variantId", "currentPrice");

CREATE INDEX "RawOffer_parentProductId_idx" ON "RawOffer"("parentProductId");
CREATE INDEX "RawOffer_variantId_idx" ON "RawOffer"("variantId");
CREATE INDEX "RawOffer_importBatchId_idx" ON "RawOffer"("importBatchId");

ALTER TABLE "ParentProduct"
  ADD CONSTRAINT "ParentProduct_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_parentProductId_fkey"
  FOREIGN KEY ("parentProductId") REFERENCES "ParentProduct"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOffer"
  ADD CONSTRAINT "ProductOffer_parentProductId_fkey"
  FOREIGN KEY ("parentProductId") REFERENCES "ParentProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductOffer"
  ADD CONSTRAINT "ProductOffer_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RawOffer"
  ADD CONSTRAINT "RawOffer_parentProductId_fkey"
  FOREIGN KEY ("parentProductId") REFERENCES "ParentProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RawOffer"
  ADD CONSTRAINT "RawOffer_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
