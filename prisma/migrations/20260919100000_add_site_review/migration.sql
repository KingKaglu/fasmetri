-- Public site reviews (no registration). Additive and idempotent: this repo has
-- no _prisma_migrations baseline, so migrations are applied with
-- `prisma db execute` and must be safe to run twice.
CREATE TABLE IF NOT EXISTS "SiteReview" (
    "id" TEXT NOT NULL,
    "authorName" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SiteReview_hidden_createdAt_idx" ON "SiteReview"("hidden", "createdAt");
CREATE INDEX IF NOT EXISTS "SiteReview_ipHash_createdAt_idx" ON "SiteReview"("ipHash", "createdAt");
CREATE INDEX IF NOT EXISTS "SiteReview_createdAt_idx" ON "SiteReview"("createdAt");
