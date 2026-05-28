-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RawOfferStatus" ADD VALUE 'PARSE_FAILED';
ALTER TYPE "RawOfferStatus" ADD VALUE 'DUPLICATE_URL';
ALTER TYPE "RawOfferStatus" ADD VALUE 'STORE_UNAVAILABLE';
ALTER TYPE "RawOfferStatus" ADD VALUE 'BLOCKED_OR_UNABLE_TO_FETCH';

-- AlterTable
ALTER TABLE "RawOffer" ADD COLUMN     "storeKey" TEXT;

-- CreateIndex
CREATE INDEX "RawOffer_storeKey_idx" ON "RawOffer"("storeKey");
