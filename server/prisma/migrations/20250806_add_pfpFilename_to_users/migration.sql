-- Add missing pfpFilename column to match Prisma model
CREATE SCHEMA IF NOT EXISTS anythingllm;

ALTER TABLE anythingllm.users
  ADD COLUMN IF NOT EXISTS "pfpFilename" TEXT;
