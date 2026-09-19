-- Native (Expo) push tokens for the mobile app. Idempotent: applied by hand to
-- the local database and the Supabase pooler, and may be replayed.
CREATE TABLE IF NOT EXISTS "AppPushToken" (
  "id"         TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "platform"   TEXT NOT NULL,
  "email"      TEXT,
  "appVersion" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppPushToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AppPushToken_token_key" ON "AppPushToken" ("token");
CREATE INDEX IF NOT EXISTS "AppPushToken_email_idx" ON "AppPushToken" ("email");
