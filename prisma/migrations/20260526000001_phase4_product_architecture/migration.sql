-- Phase 4: ParentProduct/ProductVariant/ProductOffer architecture
-- Safe migration: converts verificationStatus String -> OfferVerificationStatus enum in-place
-- using the USING clause to preserve existing data.

-- 1. Create the new enum type (idempotent)
DO $$ BEGIN
  CREATE TYPE "OfferVerificationStatus" AS ENUM (
    'UNVERIFIED',
    'CONFIRMED',
    'POSSIBLE_MATCH',
    'REJECTED',
    'NEEDS_REVIEW',
    'DIFFERENT_VARIANT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Sanitize any rows whose current value is not in the enum
--    (sets unknown values to CONFIRMED, which is the safe default)
UPDATE "ProductOffer"
SET "verificationStatus" = 'CONFIRMED'
WHERE "verificationStatus" NOT IN (
  'UNVERIFIED', 'CONFIRMED', 'POSSIBLE_MATCH', 'REJECTED', 'NEEDS_REVIEW', 'DIFFERENT_VARIANT'
);

-- 3. Drop the default so we can change the column type
ALTER TABLE "ProductOffer"
  ALTER COLUMN "verificationStatus" DROP DEFAULT;

-- 4. Convert String -> OfferVerificationStatus in-place (no data loss)
ALTER TABLE "ProductOffer"
  ALTER COLUMN "verificationStatus" TYPE "OfferVerificationStatus"
  USING "verificationStatus"::"OfferVerificationStatus";

-- 5. Restore the default
ALTER TABLE "ProductOffer"
  ALTER COLUMN "verificationStatus" SET DEFAULT 'CONFIRMED';

-- 6. Add extractedIdentityJson (raw identity JSON extracted from the offer page)
ALTER TABLE "ProductOffer"
  ADD COLUMN IF NOT EXISTS "extractedIdentityJson" JSONB;

-- 7. Add lastCheckedAt (when this offer was last verified against the store)
ALTER TABLE "ProductOffer"
  ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);
