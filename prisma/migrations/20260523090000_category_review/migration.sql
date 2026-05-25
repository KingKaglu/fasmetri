-- Keep automatic category suggestions separate from admin-approved category locks.
ALTER TABLE "Product"
  ADD COLUMN "manualCategoryId" TEXT,
  ADD COLUMN "categoryLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "categoryConfidence" INTEGER,
  ADD COLUMN "categoryNeedsReview" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "categorySuggestedSlug" TEXT,
  ADD COLUMN "categoryReason" TEXT,
  ADD COLUMN "categoryMatchedRules" JSONB,
  ADD COLUMN "categorySourceSignals" JSONB;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_manualCategoryId_fkey"
  FOREIGN KEY ("manualCategoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Product_categoryNeedsReview_categoryConfidence_idx"
  ON "Product"("categoryNeedsReview", "categoryConfidence");
