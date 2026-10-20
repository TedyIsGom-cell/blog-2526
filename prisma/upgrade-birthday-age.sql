-- Apply after upgrade-collaboration.sql on existing databases. Preserves all content.
BEGIN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthDate" DATE;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");
COMMIT;
