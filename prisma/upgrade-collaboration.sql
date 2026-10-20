-- Run once against the EXISTING Think-storage database after taking a backup.
-- Safe to re-run: existing posts, comments, categories and statistics are preserved.
BEGIN;
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('READER', 'WRITER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'UNKNOWN', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "role" "UserRole" NOT NULL DEFAULT 'READER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE IF NOT EXISTS "AuthRateLimit" (
  "key" TEXT PRIMARY KEY, "attempts" INTEGER NOT NULL DEFAULT 0, "resetAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Post_published_createdAt_idx" ON "Post"("published", "createdAt");
CREATE TABLE IF NOT EXISTS "NewsletterSubscription" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "unsubscribeToken" TEXT NOT NULL,
  "confirmedAt" TIMESTAMP(3), "confirmationTokenHash" TEXT, "confirmationExpiresAt" TIMESTAMP(3), "confirmationSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "NewsletterSubscription" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE "NewsletterSubscription" ADD COLUMN IF NOT EXISTS "confirmationTokenHash" TEXT;
ALTER TABLE "NewsletterSubscription" ADD COLUMN IF NOT EXISTS "confirmationExpiresAt" TIMESTAMP(3);
ALTER TABLE "NewsletterSubscription" ADD COLUMN IF NOT EXISTS "confirmationSentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscription_confirmationTokenHash_key" ON "NewsletterSubscription"("confirmationTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscription_userId_key" ON "NewsletterSubscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscription_unsubscribeToken_key" ON "NewsletterSubscription"("unsubscribeToken");
CREATE TABLE IF NOT EXISTS "NewsletterIssue" (
  "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL, "title" TEXT NOT NULL, "html" TEXT NOT NULL,
  "text" TEXT NOT NULL, "postIds" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterIssue_key_key" ON "NewsletterIssue"("key");
CREATE TABLE IF NOT EXISTS "NewsletterDelivery" (
  "id" TEXT PRIMARY KEY, "issueId" TEXT NOT NULL REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "subscriptionId" TEXT NOT NULL REFERENCES "NewsletterSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING', "payload" JSONB NOT NULL,
  "providerId" TEXT, "error" TEXT, "attempts" INTEGER NOT NULL DEFAULT 0,
  "firstAttemptAt" TIMESTAMP(3), "lastAttemptAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterDelivery_issueId_subscriptionId_key" ON "NewsletterDelivery"("issueId", "subscriptionId");
CREATE INDEX IF NOT EXISTS "NewsletterDelivery_status_idx" ON "NewsletterDelivery"("status");
CREATE TABLE IF NOT EXISTS "NewsletterJobLock" ("id" TEXT PRIMARY KEY, "token" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE IF NOT EXISTS "EmailSubmissionCredential" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tokenHash" TEXT NOT NULL, "tokenHint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSubmissionCredential_userId_key" ON "EmailSubmissionCredential"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSubmissionCredential_tokenHash_key" ON "EmailSubmissionCredential"("tokenHash");
CREATE TABLE IF NOT EXISTS "EmailSubmission" (
  "id" TEXT PRIMARY KEY, "providerMessageId" TEXT NOT NULL, "postId" INTEGER REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "sender" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PROCESSING', "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSubmission_providerMessageId_key" ON "EmailSubmission"("providerMessageId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSubmission_postId_key" ON "EmailSubmission"("postId");
CREATE INDEX IF NOT EXISTS "EmailSubmission_sender_createdAt_idx" ON "EmailSubmission"("sender", "createdAt");
COMMIT;
