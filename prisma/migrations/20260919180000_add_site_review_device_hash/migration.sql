-- Per-device dimension for the review rate limit, for native app traffic.
-- Idempotent: this migration is applied to the local database and the Supabase
-- pooler by hand, and may be replayed.
ALTER TABLE "SiteReview" ADD COLUMN IF NOT EXISTS "deviceHash" TEXT;
CREATE INDEX IF NOT EXISTS "SiteReview_deviceHash_createdAt_idx" ON "SiteReview" ("deviceHash", "createdAt");
