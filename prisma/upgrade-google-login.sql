-- Apply after the collaboration/birthday upgrades on existing databases.
-- Additive and safe to re-run: existing identities, roles and content are preserved.
BEGIN;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleSubject" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleEmail" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSubject_key" ON "User"("googleSubject");

CREATE TABLE IF NOT EXISTS "GoogleAuthFlow" (
  "stateHash" TEXT PRIMARY KEY,
  "browserHash" TEXT NOT NULL,
  "codeVerifier" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "userId" TEXT,
  "sessionHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "GoogleAuthFlow" ADD CONSTRAINT "GoogleAuthFlow_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "GoogleAuthFlow_expiresAt_idx" ON "GoogleAuthFlow"("expiresAt");

COMMIT;
