-- Ensure remaining users columns exist to match Prisma model
CREATE SCHEMA IF NOT EXISTS anythingllm;

ALTER TABLE anythingllm.users
  ADD COLUMN IF NOT EXISTS "dailyMessageLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "seen_recovery_codes" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bio" TEXT DEFAULT '';
