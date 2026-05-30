-- First-party shop-click reporting: denormalised snapshot columns on ClickEvent.
-- All columns are nullable and use IF NOT EXISTS, so this is safe to (re-)apply
-- to a live table, over the pooler or a direct connection.

-- AlterTable
ALTER TABLE "ClickEvent"
  ADD COLUMN IF NOT EXISTS "productId"   TEXT,
  ADD COLUMN IF NOT EXISTS "productName" TEXT,
  ADD COLUMN IF NOT EXISTS "category"    TEXT,
  ADD COLUMN IF NOT EXISTS "shopName"    TEXT,
  ADD COLUMN IF NOT EXISTS "price"       DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "utmSource"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClickEvent_shopName_createdAt_idx" ON "ClickEvent"("shopName", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClickEvent_category_createdAt_idx" ON "ClickEvent"("category", "createdAt");
