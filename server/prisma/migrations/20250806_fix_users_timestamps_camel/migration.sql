-- Fix camel-cased timestamp columns for anythingllm.users to match Prisma
-- Adds "createdAt" and "lastUpdatedAt" if missing, backfills from lowercase columns if they exist,
-- and optionally drops the lowercase columns to avoid confusion.

CREATE SCHEMA IF NOT EXISTS anythingllm;

ALTER TABLE anythingllm.users
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "lastUpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill from lowercase columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anythingllm' AND table_name = 'users' AND column_name = 'createdat'
  ) THEN
    EXECUTE 'UPDATE anythingllm.users SET "createdAt" = createdat WHERE "createdAt" IS DISTINCT FROM createdat';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anythingllm' AND table_name = 'users' AND column_name = 'lastupdatedat'
  ) THEN
    EXECUTE 'UPDATE anythingllm.users SET "lastUpdatedAt" = lastupdatedat WHERE "lastUpdatedAt" IS DISTINCT FROM lastupdatedat';
  END IF;
END $$;

-- Optional cleanup: drop the lowercase columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anythingllm' AND table_name = 'users' AND column_name = 'createdat'
  ) THEN
    EXECUTE 'ALTER TABLE anythingllm.users DROP COLUMN createdat';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anythingllm' AND table_name = 'users' AND column_name = 'lastupdatedat'
  ) THEN
    EXECUTE 'ALTER TABLE anythingllm.users DROP COLUMN lastupdatedat';
  END IF;
END $$;
