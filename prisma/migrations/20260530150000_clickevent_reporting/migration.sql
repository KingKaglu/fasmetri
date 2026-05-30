-- First-party shop-click reporting: denormalised snapshot columns on ClickEvent.
-- All columns are nullable, so this migration is safe to apply to a live table.

-- AlterTable
ALTER TABLE "ClickEvent"
  ADD COLUMN "productId"   TEXT,
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "category"    TEXT,
  ADD COLUMN "shopName"    TEXT,
  ADD COLUMN "price"       DECIMAL(10,2),
  ADD COLUMN "utmSource"   TEXT,
  ADD COLUMN "utmMedium"   TEXT,
  ADD COLUMN "utmCampaign" TEXT;

-- CreateIndex
CREATE INDEX "ClickEvent_shopName_createdAt_idx" ON "ClickEvent"("shopName", "createdAt");

-- CreateIndex
CREATE INDEX "ClickEvent_category_createdAt_idx" ON "ClickEvent"("category", "createdAt");
