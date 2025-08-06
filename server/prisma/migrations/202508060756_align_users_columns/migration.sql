-- Ensure anythingllm.users has all columns expected by Prisma model
CREATE SCHEMA IF NOT EXISTS anythingllm;

-- Add missing columns safely
ALTER TABLE anythingllm.users
  ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lastUpdatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS seen_recovery_codes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dailyMessageLimit INTEGER,
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Ensure username unique index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'anythingllm' AND indexname = 'users_username_key'
  ) THEN
    CREATE UNIQUE INDEX users_username_key ON anythingllm.users(username);
  END IF;
END $$;
