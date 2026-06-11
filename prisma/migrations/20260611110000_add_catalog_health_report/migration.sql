-- CatalogHealthReport: weekly snapshot from scripts/catalog-health.ts.
-- Idempotent so CI can re-run it via `prisma db execute`.

CREATE TABLE IF NOT EXISTS "CatalogHealthReport" (
  "id" TEXT NOT NULL,
  "orphanCanonicals" INTEGER NOT NULL DEFAULT 0,
  "unlinkedOffers" INTEGER NOT NULL DEFAULT 0,
  "staleOffers" INTEGER NOT NULL DEFAULT 0,
  "duplicateTitleGroups" INTEGER NOT NULL DEFAULT 0,
  "detailsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogHealthReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatalogHealthReport_createdAt_idx" ON "CatalogHealthReport"("createdAt");
